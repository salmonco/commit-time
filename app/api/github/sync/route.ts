import { createClient as createSupabaseClient } from '@/lib/supabase/server';
import {
  getRepositoryCommits,
  getCommitDetails,
} from '@/lib/github/client';
import { prisma } from '@/lib/prisma';
import { NextRequest, NextResponse } from 'next/server';

// Repository의 Commit 데이터를 DB에 동기화하는 API
export async function POST(request: NextRequest) {
  try {
    // 1. 인증된 사용자 확인
    const supabase = await createSupabaseClient();
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session) {
      return NextResponse.json(
        { error: '로그인이 필요합니다' },
        { status: 401 },
      );
    }

    const accessToken = session.provider_token;
    if (!accessToken) {
      return NextResponse.json(
        { error: 'GitHub 토큰이 없습니다' },
        { status: 401 },
      );
    }

    // 2. Request body 파싱
    const body = await request.json();
    const { owner, repo, githubRepoId, since, until } = body;

    if (!owner || !repo) {
      return NextResponse.json(
        { error: 'owner와 repo는 필수입니다' },
        { status: 400 },
      );
    }

    // 3. User 정보 가져오기 또는 생성
    const githubUserId = session.user.user_metadata?.provider_id;
    const githubUsername = session.user.user_metadata?.user_name;

    if (!githubUserId) {
      return NextResponse.json(
        { error: 'GitHub 사용자 정보를 찾을 수 없습니다' },
        { status: 400 },
      );
    }

    // User를 DB에서 찾거나 생성
    let dbUser = await prisma.user.findUnique({
      where: { githubId: parseInt(githubUserId) },
    });

    if (!dbUser) {
      dbUser = await prisma.user.create({
        data: {
          githubId: parseInt(githubUserId),
          githubUsername: githubUsername || 'unknown',
          email: session.user.email,
          avatarUrl: session.user.user_metadata?.avatar_url,
          accessToken: accessToken, // 실제 프로덕션에서는 암호화 필요
        },
      });
    }

    // 4. Repository를 DB에서 찾거나 생성
    let dbRepository = await prisma.repository.findUnique({
      where: { githubId: githubRepoId },
    });

    if (!dbRepository) {
      dbRepository = await prisma.repository.create({
        data: {
          githubId: githubRepoId,
          name: repo,
          fullName: `${owner}/${repo}`,
          userId: dbUser.id,
        },
      });
    }

    // 5. GitHub에서 Commit 목록 가져오기
    const commits = await getRepositoryCommits(accessToken, owner, repo, {
      since,
      until,
      per_page: 100,
    });

    // 6. 각 Commit의 상세 정보 가져오기 및 DB 저장
    let savedCount = 0;
    let skippedCount = 0;
    const errors: string[] = [];

    for (const commit of commits) {
      try {
        // 이미 DB에 있는지 확인
        const existingCommit = await prisma.commit.findUnique({
          where: { sha: commit.sha },
        });

        if (existingCommit) {
          skippedCount++;
          continue;
        }

        // Commit 상세 정보 가져오기 (additions, deletions, files 등)
        const commitDetails = await getCommitDetails(
          accessToken,
          owner,
          repo,
          commit.sha,
        );

        // DB에 저장
        await prisma.commit.create({
          data: {
            sha: commitDetails.sha,
            message: commitDetails.message,
            authorDate: new Date(commitDetails.author.date || new Date()),
            additions: commitDetails.stats.additions,
            deletions: commitDetails.stats.deletions,
            filesChanged: commitDetails.files?.length || 0,
            repositoryId: dbRepository.id,
          },
        });

        savedCount++;
      } catch (error) {
        console.error(`Commit ${commit.sha} 저장 실패:`, error);
        errors.push(
          `${commit.sha}: ${error instanceof Error ? error.message : 'Unknown error'}`,
        );
      }
    }

    // 7. Repository의 lastSyncAt 업데이트
    await prisma.repository.update({
      where: { id: dbRepository.id },
      data: { lastSyncAt: new Date() },
    });

    return NextResponse.json({
      success: true,
      message: 'Commit 동기화 완료',
      stats: {
        total: commits.length,
        saved: savedCount,
        skipped: skippedCount,
        errors: errors.length,
      },
      repository: {
        id: dbRepository.id,
        fullName: dbRepository.fullName,
        lastSyncAt: new Date(),
      },
      errorDetails: errors.length > 0 ? errors : undefined,
    });
  } catch (error) {
    console.error('Sync API 에러:', error);
    return NextResponse.json(
      {
        error: 'Commit 동기화에 실패했습니다',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 },
    );
  }
}
