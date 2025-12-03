'use client';

import { ROUTES } from '@/lib/constants/routes';
import { useRouter, useParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';

// Commit 타입 정의
type Commit = {
  sha: string;
  message: string;
  author: {
    date?: string;
  };
  stats?: {
    additions: number;
    deletions: number;
  };
  filesChanged?: number;
};

// Repository 타입
type RepositoryInfo = {
  id: number;
  name: string;
  fullName: string;
  lastSyncAt: string | null;
};

// Sync 정보 타입
type SyncInfo = {
  synced: boolean;
  total: number;
  saved: number;
  skipped: number;
};

// API 응답 타입
type CommitsResponse = {
  success: boolean;
  data: Commit[];
  count: number;
  repository: RepositoryInfo;
  sync?: SyncInfo;
};

export default function RepositoryDetailPage() {
  const router = useRouter();
  const params = useParams();
  const owner = params.owner as string;
  const repo = params.repo as string;

  const fullName = `${owner}/${repo}`;

  // React Query로 Commit 목록 가져오기 (자동 동기화 포함)
  const {
    data,
    isLoading,
    isFetching,
    error,
    refetch,
  } = useQuery<CommitsResponse>({
    queryKey: ['commits', owner, repo],
    queryFn: async () => {
      const response = await fetch(
        `/api/github/commits/${owner}/${repo}?per_page=50`,
      );

      if (!response.ok) {
        throw new Error('Commit 목록을 가져올 수 없습니다');
      }

      return response.json();
    },
  });

  const commits = data?.data || [];
  const repository = data?.repository;
  const syncInfo = data?.sync;

  // 데이터 없이 로딩 중인 경우만 true (캐시 있으면 false)
  const isInitialLoading = isLoading && commits.length === 0;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 헤더 */}
      <header className="border-b bg-white">
        <div className="mx-auto max-w-7xl px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between">
            <div>
              <button
                onClick={() => router.push(ROUTES.REPOSITORIES)}
                className="text-sm text-gray-600 hover:text-gray-900"
              >
                ← 목록으로
              </button>
              <h1 className="mt-1 text-2xl font-bold text-gray-900">
                {fullName}
              </h1>
              {repository?.lastSyncAt && (
                <p className="mt-1 text-xs text-gray-500">
                  마지막 동기화:{' '}
                  {new Date(repository.lastSyncAt).toLocaleString('ko-KR')}
                </p>
              )}
            </div>
            <div className="flex items-center gap-2">
              {isFetching && !isInitialLoading && (
                <div className="flex items-center gap-2 text-sm text-gray-500">
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-gray-300 border-t-blue-600"></div>
                  <span>업데이트 중...</span>
                </div>
              )}
              <button
                onClick={() => refetch()}
                disabled={isFetching}
                className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700 disabled:opacity-50"
              >
                {isFetching ? '새로고침 중...' : '새로고침'}
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* 메인 컨텐츠 */}
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {/* 자동 동기화 알림 */}
        {syncInfo && syncInfo.synced && (
          <div className="mb-6 rounded-lg bg-blue-50 p-4">
            <h3 className="font-semibold text-blue-900">
              ✅ 최신 데이터로 자동 업데이트됨
            </h3>
            <div className="mt-2 grid grid-cols-3 gap-4 text-sm">
              <div>
                <p className="text-blue-700">전체</p>
                <p className="text-lg font-bold text-blue-900">
                  {syncInfo.total}
                </p>
              </div>
              <div>
                <p className="text-blue-700">새로 저장</p>
                <p className="text-lg font-bold text-blue-900">
                  {syncInfo.saved}
                </p>
              </div>
              <div>
                <p className="text-blue-700">이미 있음</p>
                <p className="text-lg font-bold text-blue-900">
                  {syncInfo.skipped}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* 초기 로딩 상태 (캐시 없을 때만) */}
        {isInitialLoading && (
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <div className="mx-auto h-12 w-12 animate-spin rounded-full border-4 border-gray-200 border-t-blue-600"></div>
              <p className="mt-4 text-gray-600">
                최신 Commit 데이터를 가져오는 중...
              </p>
              <p className="mt-1 text-sm text-gray-500">
                (필요시 자동으로 DB에 저장됩니다)
              </p>
            </div>
          </div>
        )}

        {/* 에러 상태 */}
        {error && !isInitialLoading && (
          <div className="rounded-lg bg-red-50 p-4 text-center">
            <p className="text-red-800">
              {error instanceof Error
                ? error.message
                : 'Commit을 불러오지 못했습니다'}
            </p>
            <button
              onClick={() => refetch()}
              className="mt-2 text-sm text-red-600 hover:text-red-800"
            >
              다시 시도
            </button>
          </div>
        )}

        {/* Commit 목록 */}
        {!isInitialLoading && !error && commits.length === 0 && (
          <div className="rounded-lg bg-white p-12 text-center shadow">
            <p className="text-gray-600">Commit이 없습니다.</p>
          </div>
        )}

        {!isInitialLoading && !error && commits.length > 0 && (
          <div className="space-y-4">
            {/* 통계 */}
            <div className="rounded-lg bg-white p-4 shadow">
              <p className="text-sm text-gray-600">
                최근 <span className="font-semibold">{commits.length}개</span>의
                Commit (DB에서 조회됨)
              </p>
            </div>

            {/* Commit 목록 */}
            <div className="space-y-2">
              {commits.map((commit) => (
                <div
                  key={commit.sha}
                  className="rounded-lg border bg-white p-4 shadow-sm transition-shadow hover:shadow-md"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      {/* Commit 메시지 */}
                      <p className="font-medium text-gray-900">
                        {commit.message.split('\n')[0]}
                      </p>

                      {/* 작성 날짜 및 변경량 */}
                      <div className="mt-2 flex items-center gap-4 text-sm text-gray-600">
                        <span>
                          {commit.author.date
                            ? new Date(commit.author.date).toLocaleString(
                                'ko-KR',
                              )
                            : 'Unknown date'}
                        </span>
                        {commit.stats && (
                          <>
                            <span className="text-green-600">
                              +{commit.stats.additions}
                            </span>
                            <span className="text-red-600">
                              -{commit.stats.deletions}
                            </span>
                          </>
                        )}
                        {commit.filesChanged !== undefined && (
                          <span className="text-gray-500">
                            {commit.filesChanged} files
                          </span>
                        )}
                      </div>

                      {/* SHA */}
                      <p className="mt-2 font-mono text-xs text-gray-500">
                        {commit.sha.substring(0, 7)}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
