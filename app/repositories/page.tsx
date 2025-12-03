'use client';

import { ROUTES } from '@/lib/constants/routes';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';

// Repository 타입 정의
type Repository = {
  id: number;
  name: string;
  fullName: string;
  description: string | null;
  private: boolean;
  language: string | null;
  stargazersCount: number;
  forksCount: number;
  updatedAt: string;
  htmlUrl: string;
};

export default function RepositoriesPage() {
  const router = useRouter();

  // React Query로 Repository 목록 가져오기
  const {
    data,
    isLoading,
    isFetching,
    error,
    refetch,
  } = useQuery({
    queryKey: ['repositories'],
    queryFn: async () => {
      const response = await fetch(ROUTES.API.GITHUB.REPOS);

      if (!response.ok) {
        throw new Error('Repository 목록을 가져올 수 없습니다');
      }

      const result = await response.json();
      return result.data as Repository[];
    },
  });

  const repositories = data || [];

  // 데이터 없이 로딩 중인 경우만 true (캐시 있으면 false)
  const isInitialLoading = isLoading && !data;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 헤더 */}
      <header className="border-b bg-white">
        <div className="mx-auto max-w-7xl px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between">
            <div>
              <button
                onClick={() => router.push(ROUTES.DASHBOARD)}
                className="text-sm text-gray-600 hover:text-gray-900"
              >
                ← 대시보드로
              </button>
              <h1 className="mt-1 text-2xl font-bold text-gray-900">
                내 Repositories
              </h1>
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
        {/* 초기 로딩 상태 (캐시 없을 때만) */}
        {isInitialLoading && (
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <div className="mx-auto h-12 w-12 animate-spin rounded-full border-4 border-gray-200 border-t-blue-600"></div>
              <p className="mt-4 text-gray-600">
                Repository 목록을 불러오는 중...
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
                : 'Repository를 불러오지 못했습니다'}
            </p>
            <button
              onClick={() => refetch()}
              className="mt-2 text-sm text-red-600 hover:text-red-800"
            >
              다시 시도
            </button>
          </div>
        )}

        {/* Repository 목록 */}
        {!isInitialLoading && !error && repositories.length === 0 && (
          <div className="rounded-lg bg-white p-12 text-center shadow">
            <p className="text-gray-600">Repository가 없습니다.</p>
          </div>
        )}

        {!isInitialLoading && !error && repositories.length > 0 && (
          <div className="space-y-4">
            {/* 통계 */}
            <div className="rounded-lg bg-white p-4 shadow">
              <p className="text-sm text-gray-600">
                총{' '}
                <span className="font-semibold">{repositories.length}개</span>의
                Repository
              </p>
            </div>

            {/* Repository 카드 */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {repositories.map((repo) => (
                <div
                  key={repo.id}
                  className="rounded-lg border bg-white p-6 shadow-sm transition-shadow hover:shadow-md"
                >
                  {/* Repository 이름 */}
                  <div className="mb-3">
                    <a
                      href={repo.htmlUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-lg font-semibold text-blue-600 hover:text-blue-800"
                    >
                      {repo.name}
                    </a>
                    {repo.private && (
                      <span className="ml-2 rounded bg-gray-100 px-2 py-1 text-xs text-gray-600">
                        Private
                      </span>
                    )}
                  </div>

                  {/* 설명 */}
                  {repo.description && (
                    <p className="mb-3 text-sm text-gray-600 line-clamp-2">
                      {repo.description}
                    </p>
                  )}

                  {/* 메타 정보 */}
                  <div className="flex items-center gap-4 text-xs text-gray-500">
                    {repo.language && (
                      <div className="flex items-center gap-1">
                        <span className="h-3 w-3 rounded-full bg-blue-500"></span>
                        {repo.language}
                      </div>
                    )}
                    <div>⭐ {repo.stargazersCount}</div>
                    <div>🍴 {repo.forksCount}</div>
                  </div>

                  {/* 업데이트 시간 */}
                  <div className="mt-3 text-xs text-gray-400">
                    Updated:{' '}
                    {new Date(repo.updatedAt).toLocaleDateString('ko-KR')}
                  </div>

                  {/* 액션 버튼 */}
                  <div className="mt-4 flex gap-2">
                    <button
                      onClick={() => {
                        const [owner, repoName] = repo.fullName.split('/');
                        router.push(`/repositories/${owner}/${repoName}`);
                      }}
                      className="flex-1 rounded bg-gray-100 px-3 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-200"
                    >
                      분석 시작
                    </button>
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
