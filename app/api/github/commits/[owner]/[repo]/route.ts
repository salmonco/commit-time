import { createClient as createSupabaseClient } from '@/lib/supabase/server';
import {
  getRepositoryCommits,
  getCommitDetails,
  getUserRepositories,
} from '@/lib/github/client';
import { prisma } from '@/lib/prisma';
import { NextRequest, NextResponse } from 'next/server';

// 자동 동기화 임계값 (5분)
const SYNC_THRESHOLD_MS = 5 * 60 * 1000;

// 특정 Repository의 Commit 목록 가져오기 API (자동 DB 동기화 포함)
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ owner: string; repo: string }> },
) {
  try {
    const { owner, repo } = await params;
    const fullName = `${owner}/${repo}`;

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

    // 2. GitHub access token 가져오기
    const accessToken = session.provider_token;
    if (!accessToken) {
      return NextResponse.json(
        { error: 'GitHub 토큰이 없습니다' },
        { status: 401 },
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
          accessToken: accessToken,
        },
      });
    }

    // 4. Repository의 GitHub ID 가져오기
    const allRepos = await getUserRepositories(accessToken);
    const githubRepo = allRepos.find((r) => r.fullName === fullName);

    if (!githubRepo) {
      return NextResponse.json(
        { error: 'Repository를 찾을 수 없습니다' },
        { status: 404 },
      );
    }

    // 5. Repository 확인/생성 및 동기화 필요 여부 판단
    let dbRepository = await prisma.repository.findUnique({
      where: { githubId: githubRepo.id },
    });

    const now = new Date();
    let needsSync = false;
    let syncStats = null;

    if (!dbRepository) {
      // Repository가 없으면 생성하고 동기화 필요
      dbRepository = await prisma.repository.create({
        data: {
          githubId: githubRepo.id,
          name: repo,
          fullName: fullName,
          userId: dbUser.id,
        },
      });
      needsSync = true;
    } else if (
      !dbRepository.lastSyncAt ||
      now.getTime() - dbRepository.lastSyncAt.getTime() > SYNC_THRESHOLD_MS
    ) {
      // lastSyncAt이 없거나 5분 이상 지났으면 동기화 필요
      needsSync = true;
    }

    // 6. 필요시 자동 동기화
    if (needsSync) {
      try {
        // lastSyncAt 이후의 commit만 가져오기
        const since = dbRepository.lastSyncAt?.toISOString();

        const commits = await getRepositoryCommits(accessToken, owner, repo, {
          since,
          per_page: 100,
        });

        let savedCount = 0;
        let skippedCount = 0;

        for (const commit of commits) {
          // 이미 DB에 있는지 확인
          const existingCommit = await prisma.commit.findUnique({
            where: { sha: commit.sha },
          });

          if (existingCommit) {
            skippedCount++;
            continue;
          }

          // Commit 상세 정보 가져오기
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
        }

        // lastSyncAt 업데이트
        dbRepository = await prisma.repository.update({
          where: { id: dbRepository.id },
          data: { lastSyncAt: now },
        });

        syncStats = {
          synced: true,
          total: commits.length,
          saved: savedCount,
          skipped: skippedCount,
        };
      } catch (syncError) {
        console.error('자동 동기화 에러:', syncError);
        // 동기화 실패해도 DB에 있는 데이터는 반환
      }
    }

    // 7. DB에서 Commit 목록 조회
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('per_page') || '50');

    const dbCommits = await prisma.commit.findMany({
      where: {
        repositoryId: dbRepository.id,
      },
      orderBy: {
        authorDate: 'desc',
      },
      take: limit,
    });

    // 8. GitHub API 형식으로 변환
    const formattedCommits = dbCommits.map((commit) => ({
      sha: commit.sha,
      message: commit.message,
      author: {
        date: commit.authorDate.toISOString(),
      },
      stats: {
        additions: commit.additions,
        deletions: commit.deletions,
      },
      filesChanged: commit.filesChanged,
    }));

    return NextResponse.json({
      success: true,
      data: formattedCommits,
      count: formattedCommits.length,
      repository: {
        id: dbRepository.githubId,
        name: dbRepository.name,
        fullName: dbRepository.fullName,
        lastSyncAt: dbRepository.lastSyncAt,
      },
      sync: syncStats,
    });
  } catch (error) {
    console.error('Commit API 에러:', error);
    return NextResponse.json(
      {
        error: 'Commit 정보를 가져오는데 실패했습니다',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 },
    );
  }
}
