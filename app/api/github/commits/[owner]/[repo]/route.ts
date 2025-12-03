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
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json(
        { error: '로그인이 필요합니다' },
        { status: 401 },
      );
    }

    // 2. GitHub access token 가져오기
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session || !session.provider_token) {
      return NextResponse.json(
        { error: 'GitHub 토큰이 없습니다' },
        { status: 401 },
      );
    }
    const accessToken = session.provider_token;

    // 3. User 정보 가져오기 또는 생성
    const githubUserId = user.user_metadata?.provider_id;
    const githubUsername = user.user_metadata?.user_name;

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
          email: user.email,
          avatarUrl: user.user_metadata?.avatar_url,
          accessToken: accessToken,
        },
      });
      console.log(`[Commits API] New user created: ${dbUser.id}`);
    } else {
      console.log(`[Commits API] Existing user found: ${dbUser.id}`);
    }

    // 4. Repository의 GitHub ID 가져오기
    console.log(`[Commits API] Looking for GitHub repo: ${fullName}`);
    const allRepos = await getUserRepositories(accessToken);
    const githubRepo = allRepos.find((r) => r.fullName === fullName);

    if (!githubRepo) {
      console.log(
        `[Commits API] GitHub repo not found via API for: ${fullName}`,
      );
      return NextResponse.json(
        { error: 'Repository를 찾을 수 없습니다' },
        { status: 404 },
      );
    }
    console.log(
      `[Commits API] GitHub repo found (githubId: ${githubRepo.id}, fullName: ${githubRepo.fullName})`,
    );

    // 5. Repository 확인/생성 및 동기화 필요 여부 판단
    let dbRepository = await prisma.repository.findUnique({
      where: { githubId: githubRepo.id },
    });

    const now = new Date();
    let needsSync = false;
    let syncStats = null;

    // fullSync 파라미터 체크 (미리 가져오기)
    const { searchParams } = new URL(request.url);
    const fullSync = searchParams.get('fullSync') === 'true';

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
      console.log(
        `[Commits API] New DB repository created: ${dbRepository.id}, fullName: ${dbRepository.fullName}, userId: ${dbRepository.userId}`,
      );
    } else {
      console.log(
        `[Commits API] Existing dbRepository.userId: ${dbRepository.userId}, Current dbUser.id: ${dbUser.id}`,
      );
      // Repository가 이미 있으면, 현재 사용자와 연결되어 있는지 확인하고 필요하다면 업데이트
      if (dbRepository.userId !== dbUser.id) {
        const updatedRepo = await prisma.repository.update({
          where: { id: dbRepository.id },
          data: { userId: dbUser.id },
        });
        dbRepository = updatedRepo; // Update the dbRepository object with the new userId
        console.log(
          `[Commits API] Updated userId for existing repository: ${dbRepository.id} to ${dbUser.id}`,
        );
      }
      if (
        !dbRepository.lastSyncAt ||
        now.getTime() - dbRepository.lastSyncAt.getTime() > SYNC_THRESHOLD_MS
      ) {
        // lastSyncAt이 없거나 5분 이상 지났으면 동기화 필요
        needsSync = true;
        console.log(
          `[Commits API] Existing DB repository needs sync: ${dbRepository.id}, lastSyncAt: ${dbRepository.lastSyncAt}`,
        );
      } else {
        console.log(
          `[Commits API] Existing DB repository does not need sync: ${dbRepository.id}`,
        );
      }
    }

    // 6. 필요시 자동 동기화
    if (needsSync) {
      try {
        // lastSyncAt 이후의 commit만 가져오기
        const since = dbRepository.lastSyncAt?.toISOString();

        // fullSync가 아니면 최신 50개만 빠르게 가져오기 (2단계 로딩)
        const perPage = fullSync ? 100 : 50;
        console.log(
          `[Commits API] Syncing with per_page: ${perPage}, fullSync: ${fullSync}`,
        );

        const commits = await getRepositoryCommits(accessToken, owner, repo, {
          since,
          per_page: perPage,
        });

        let savedCount = 0;
        let skippedCount = 0;

        // 병렬 처리: 배치 단위로 처리 (10개씩)
        const BATCH_SIZE = 10;
        const repositoryId = dbRepository.id; // 클로저 타입 이슈 해결

        for (let i = 0; i < commits.length; i += BATCH_SIZE) {
          const batch = commits.slice(i, i + BATCH_SIZE);
          console.log(
            `[Commits API] Processing batch ${i / BATCH_SIZE + 1} (${batch.length} commits)`,
          );

          // 배치 내의 커밋들을 병렬로 처리
          await Promise.all(
            batch.map(async (commit) => {
              // 이미 DB에 있는지 확인
              const existingCommit = await prisma.commit.findUnique({
                where: { sha: commit.sha },
              });

              if (existingCommit) {
                skippedCount++;
                return;
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
                  repositoryId: repositoryId,
                },
              });

              savedCount++;
            }),
          );
        }

        // fullSync일 때만 lastSyncAt 업데이트 (부분 동기화는 아직 미완료)
        if (fullSync || commits.length < perPage) {
          // 모든 커밋을 가져왔거나 fullSync인 경우에만 완료 처리
          dbRepository = await prisma.repository.update({
            where: { id: dbRepository.id },
            data: { lastSyncAt: now },
          });
        }

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

    // 8. 백그라운드 전체 동기화 필요 여부 체크
    // lastSyncAt이 없으면 아직 전체 동기화가 안 된 것
    const needsFullSync = !fullSync && !dbRepository.lastSyncAt;

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
      needsFullSync: needsFullSync, // 클라이언트가 백그라운드 동기화를 시작할지 결정
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
