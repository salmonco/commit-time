'use client';

import { ROUTES } from '@/lib/constants/routes';
import axios from '@/lib/http/client';
import type { AnalysisResponse, CommitsResponse } from '@/types/api';
import { useQuery } from '@tanstack/react-query';
import { useParams, useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';

export default function RepositoryDetailPage() {
  const router = useRouter();
  const params = useParams();
  const owner = params.owner as string;
  const repo = params.repo as string;

  const fullName = `${owner}/${repo}`;
  const [analysisTriggered, setAnalysisTriggered] = useState(false);
  const [visibleCommitCount, setVisibleCommitCount] = useState(10); // 처음엔 10개만 표시
  const [visibleFeatureCount, setVisibleFeatureCount] = useState(3); // 처음엔 3개 기능만 표시

  // React Query로 Commit 목록 가져오기 (자동 동기화 포함)
  const {
    data: commitsData,
    isLoading: commitsLoading,
    isFetching: commitsFetching,
    error: commitsError,
    refetch: refetchCommits,
  } = useQuery<CommitsResponse>({
    queryKey: ['commits', owner, repo],
    queryFn: async () => {
      try {
        const url = `${ROUTES.API.GITHUB.COMMITS(owner, repo)}?per_page=50`;
        const { data } = await axios.get<CommitsResponse>(url);
        return data;
      } catch {
        throw new Error('Commit 목록을 가져올 수 없습니다');
      }
    },
  });

  // React Query로 분석 데이터 가져오기
  const {
    data: analysisData,
    isLoading: analysisLoading,
    isFetching: analysisFetching,
    error: analysisError,
    refetch: refetchAnalysis,
  } = useQuery<AnalysisResponse>({
    queryKey: ['analysis', owner, repo],
    queryFn: async () => {
      try {
        const url = `/api/analysis/${owner}/${repo}`;
        const { data } = await axios.get<AnalysisResponse>(url);
        return data;
      } catch {
        throw new Error('분석 데이터를 가져올 수 없습니다');
      }
    },
    enabled: analysisTriggered, // 분석 트리거 시에만 실행
  });

  const commits = commitsData?.data || [];
  const repository = commitsData?.repository;
  const syncInfo = commitsData?.sync;
  const groupedFeatures = analysisData?.groupedFeatures || [];

  // 데이터 없이 로딩 중인 경우만 true (캐시 있으면 false)
  const isInitialCommitsLoading = commitsLoading && !commitsData;

  const handleAnalyze = () => {
    setAnalysisTriggered(true);
    setVisibleFeatureCount(3); // 분석 시작 시 카운트 초기화
    refetchAnalysis();
  };

  // 백그라운드 전체 동기화 (사용자 모르게)
  useEffect(() => {
    if (commitsData?.needsFullSync) {
      console.log('[Repository Page] Starting background full sync...');

      // 백그라운드에서 전체 동기화 시작 (UI 업데이트 없음)
      const fullSyncUrl = `${ROUTES.API.GITHUB.COMMITS(owner, repo)}?fullSync=true`;

      axios
        .get(fullSyncUrl)
        .then(() => {
          console.log('[Repository Page] Background full sync completed');
          // 완료 후 캐시 무효화하여 다음 방문 시 최신 데이터 표시
          refetchCommits();
        })
        .catch((error) => {
          console.error(
            '[Repository Page] Background full sync failed:',
            error,
          );
          // 에러가 나도 사용자에게 보여주지 않음 (백그라운드 작업)
        });
    }
  }, [commitsData?.needsFullSync, owner, repo, refetchCommits]);

  // 점진적 로딩: 0.5초마다 10개씩 추가 표시
  useEffect(() => {
    if (commits.length > visibleCommitCount) {
      const timer = setTimeout(() => {
        setVisibleCommitCount((prev) => Math.min(prev + 10, commits.length));
      }, 500); // 0.5초 간격

      return () => clearTimeout(timer);
    }
  }, [commits.length, visibleCommitCount]);

  // 분석 결과 점진적 로딩: 1초마다 3개씩 추가 표시
  useEffect(() => {
    if (groupedFeatures.length > visibleFeatureCount) {
      const timer = setTimeout(() => {
        setVisibleFeatureCount((prev) =>
          Math.min(prev + 3, groupedFeatures.length),
        );
      }, 1000); // 1초 간격

      return () => clearTimeout(timer);
    }
  }, [groupedFeatures.length, visibleFeatureCount]);

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
              {commitsFetching && !isInitialCommitsLoading && (
                <div className="flex items-center gap-2 text-sm text-gray-500">
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-gray-300 border-t-blue-600"></div>
                  <span>업데이트 중...</span>
                </div>
              )}
              <button
                onClick={() => refetchCommits()}
                disabled={commitsFetching}
                className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700 disabled:opacity-50"
              >
                {commitsFetching ? '새로고침 중...' : '새로고침'}
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
        {isInitialCommitsLoading && (
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
        {commitsError && !isInitialCommitsLoading && (
          <div className="rounded-lg bg-red-50 p-4 text-center">
            <p className="text-red-800">
              {commitsError instanceof Error
                ? commitsError.message
                : 'Commit을 불러오지 못했습니다'}
            </p>
            <button
              onClick={() => refetchCommits()}
              className="mt-2 text-sm text-red-600 hover:text-red-800"
            >
              다시 시도
            </button>
          </div>
        )}

        {/* 분석 기능 섹션 */}
        <div className="mb-6 rounded-lg bg-white p-6 shadow">
          <h2 className="text-xl font-bold text-gray-900">
            커밋 분석 (OpenAI)
          </h2>
          <p className="mt-2 text-gray-600">
            최근 커밋들을 기능 단위로 그룹화하고 각 기능에 소요된 시간을
            분석합니다.
          </p>

          {/* 알고리즘 설명 */}
          <details className="mt-3 text-sm">
            <summary className="cursor-pointer font-medium text-blue-600 hover:text-blue-800">
              📖 이 분석은 어떻게 작동하나요?
            </summary>
            <div className="mt-3 space-y-2 rounded-lg bg-blue-50 p-4 text-gray-700">
              <p className="font-medium text-blue-900">분석 과정:</p>
              <ol className="ml-4 list-decimal space-y-2">
                <li>
                  <strong>커밋 그룹화 (OpenAI):</strong> 커밋 메시지를 분석하여
                  유사한 작업을 기능 단위로 자동 그룹화합니다.
                </li>
                <li>
                  <strong>실제 작업 시간 계산 (세션 기반):</strong>
                  <ul className="ml-4 mt-1 list-disc space-y-1">
                    <li>커밋 간 간격이 3시간 이내면 같은 작업 세션으로 간주</li>
                    <li>
                      3시간 이상 간격이 벌어지면 다른 세션 (휴식/다른 작업)
                    </li>
                    <li>
                      마지막 커밋 후 정리 시간 30분 자동 추가 (테스트, 리뷰 등)
                    </li>
                  </ul>
                </li>
                <li>
                  <strong>총 경과 시간:</strong> 첫 커밋부터 마지막 커밋까지의
                  실제 경과 시간 (휴식 포함)
                </li>
              </ol>
              <p className="mt-3 text-xs text-gray-600">
                💡 <strong>왜 이렇게 계산하나요?</strong> 커밋 사이의 긴 간격은
                수면, 식사, 다른 작업 등으로 실제 작업 시간이 아닐 가능성이
                높습니다. 세션 기반 계산은 순수 작업 시간에 더 가깝게
                추정합니다.
              </p>
            </div>
          </details>

          <button
            onClick={handleAnalyze}
            disabled={analysisLoading || analysisFetching}
            className="mt-4 rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-green-700 disabled:opacity-50"
          >
            {analysisLoading || analysisFetching
              ? '분석 중...'
              : '커밋 분석 시작'}
          </button>

          {/* 분석 로딩/에러/결과 */}
          {analysisTriggered && (
            <div className="mt-6">
              {analysisLoading && (
                <div className="flex items-center justify-center py-4">
                  <div className="mx-auto h-8 w-8 animate-spin rounded-full border-4 border-gray-200 border-t-green-600"></div>
                  <p className="ml-3 text-gray-600">
                    분석 데이터를 가져오는 중...
                  </p>
                </div>
              )}

              {analysisError && (
                <div className="rounded-lg bg-red-50 p-4 text-center">
                  <p className="text-red-800">
                    {analysisError instanceof Error
                      ? analysisError.message
                      : '분석 데이터를 불러오지 못했습니다'}
                  </p>
                  <button
                    onClick={() => refetchAnalysis()}
                    className="mt-2 text-sm text-red-600 hover:text-red-800"
                  >
                    다시 시도
                  </button>
                </div>
              )}

              {!analysisLoading &&
                !analysisError &&
                groupedFeatures.length > 0 && (
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold text-gray-800">
                      분석 결과:{' '}
                      <span className="text-blue-600">
                        {visibleFeatureCount}
                      </span>{' '}
                      / {groupedFeatures.length}개 기능별 작업 시간
                      {visibleFeatureCount < groupedFeatures.length && (
                        <span className="ml-2 text-sm text-blue-600">
                          (자동으로 더 불러오는 중...)
                        </span>
                      )}
                    </h3>
                    {groupedFeatures
                      .slice(0, visibleFeatureCount)
                      .map((feature, index) => (
                        <div
                          key={index}
                          className="rounded-lg border bg-gray-50 p-4 shadow-sm"
                        >
                          <div className="flex items-start gap-3">
                            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-blue-100 text-sm font-semibold text-blue-700">
                              {index + 1}
                            </span>
                            <div className="flex-1">
                              <p className="font-semibold text-gray-900">
                                {feature.featureName}
                              </p>
                              <div className="mt-2 space-y-1 text-sm">
                                <p className="text-gray-700">
                                  <span className="font-medium text-blue-600">
                                    실제 작업 시간:
                                  </span>{' '}
                                  {feature.timeSpentHours.toFixed(1)} 시간
                                </p>
                                <p className="text-gray-600">
                                  <span className="font-medium">
                                    총 경과 시간:
                                  </span>{' '}
                                  {feature.totalElapsedHours >= 24
                                    ? `${(feature.totalElapsedHours / 24).toFixed(1)}일`
                                    : `${feature.totalElapsedHours.toFixed(1)}시간`}{' '}
                                  ({feature.commits.length}개 커밋)
                                </p>
                              </div>
                              <details className="mt-2 text-sm text-gray-500">
                                <summary className="cursor-pointer hover:underline">
                                  포함된 커밋 보기
                                </summary>
                                <ul className="mt-1 ml-4 list-disc space-y-1">
                                  {feature.commits.map((commit) => (
                                    <li key={commit.sha}>
                                      {commit.message.split('\n')[0]}{' '}
                                      <span className="font-mono text-xs">
                                        ({commit.sha.substring(0, 7)})
                                      </span>
                                    </li>
                                  ))}
                                </ul>
                              </details>
                            </div>
                          </div>
                        </div>
                      ))}
                  </div>
                )}

              {!analysisLoading &&
                !analysisError &&
                groupedFeatures.length === 0 && (
                  <div className="rounded-lg bg-white p-6 text-center shadow">
                    <p className="text-gray-600">분석된 기능이 없습니다.</p>
                  </div>
                )}
            </div>
          )}
        </div>

        {/* Commit 목록 */}
        {!isInitialCommitsLoading && !commitsError && commits.length === 0 && (
          <div className="rounded-lg bg-white p-12 text-center shadow">
            <p className="text-gray-600">Commit이 없습니다.</p>
          </div>
        )}

        {!isInitialCommitsLoading && !commitsError && commits.length > 0 && (
          <div className="space-y-4">
            {/* 통계 */}
            <div className="rounded-lg bg-white p-4 shadow">
              <p className="text-sm text-gray-600">
                <span className="font-semibold">{visibleCommitCount}</span> /{' '}
                {commits.length}개 표시 중
                {visibleCommitCount < commits.length && (
                  <span className="ml-2 text-blue-600">
                    (자동으로 더 불러오는 중...)
                  </span>
                )}
              </p>
            </div>

            {/* Commit 목록 */}
            <div className="space-y-2">
              {commits.slice(0, visibleCommitCount).map((commit) => (
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
