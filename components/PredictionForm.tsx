'use client';

import { ROUTES } from '@/lib/constants/routes';
import axios from '@/lib/http/client';
import type { PredictionResponse, RepositoriesResponse } from '@/types/api';
import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';

/**
 * 시간 예측 폼 컴포넌트
 * - 사용자가 Repository를 선택하고 새로운 기능 설명을 입력
 * - OpenAI 기반 예측 API를 호출하여 예상 작업 시간을 표시
 */
export default function PredictionForm() {
  const [selectedRepo, setSelectedRepo] = useState<string>('');
  const [newFeatureDescription, setNewFeatureDescription] = useState('');
  const [predictionResult, setPredictionResult] =
    useState<PredictionResponse | null>(null);
  const [predictionLoading, setPredictionLoading] = useState(false);
  const [predictionError, setPredictionError] = useState<string | null>(null);

  // Repository 목록 가져오기
  const {
    data: reposData,
    isLoading: reposLoading,
    error: reposError,
  } = useQuery<RepositoriesResponse>({
    queryKey: ['repositories'],
    queryFn: async () => {
      const { data } = await axios.get<RepositoriesResponse>(
        ROUTES.API.GITHUB.REPOS,
      );
      return data;
    },
  });

  const repositories = reposData?.data || [];

  const handlePredictTime = async () => {
    if (!selectedRepo) {
      setPredictionError('Repository를 선택해주세요.');
      return;
    }

    if (newFeatureDescription.trim() === '') {
      setPredictionError('기능 설명을 입력해주세요.');
      return;
    }

    setPredictionLoading(true);
    setPredictionError(null);
    setPredictionResult(null);

    try {
      const [owner, repo] = selectedRepo.split('/');
      const url = `/api/prediction/${owner}/${repo}`;
      const { data } = await axios.post<PredictionResponse>(url, {
        newFeatureDescription,
      });

      if (data.success) {
        setPredictionResult(data);
      } else {
        setPredictionError('예측에 실패했습니다.');
      }
    } catch (err) {
      setPredictionError(
        err instanceof Error
          ? err.message
          : '예측 데이터를 불러오지 못했습니다.',
      );
    } finally {
      setPredictionLoading(false);
    }
  };

  return (
    <div className="rounded-lg bg-white p-6 shadow">
      <div className="mb-4 flex items-center gap-2">
        <div className="text-3xl">⏱️</div>
        <h2 className="text-xl font-bold text-gray-900">
          새 기능 작업 시간 예측
        </h2>
      </div>
      <p className="mb-6 text-gray-600">
        Repository를 선택하고 개발할 기능을 설명하면, 과거 커밋 데이터를
        분석하여 예상 작업 시간을 예측합니다.
      </p>

      {/* Repository 선택 */}
      <div className="mb-4">
        <label
          htmlFor="repository"
          className="mb-2 block text-sm font-medium text-gray-700"
        >
          Repository 선택
        </label>
        {reposLoading && (
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-gray-300 border-t-blue-600"></div>
            <span>Repository 목록 불러오는 중...</span>
          </div>
        )}
        {reposError && (
          <p className="text-sm text-red-600">
            Repository 목록을 불러오지 못했습니다.
          </p>
        )}
        {!reposLoading && !reposError && (
          <select
            id="repository"
            value={selectedRepo}
            onChange={(e) => setSelectedRepo(e.target.value)}
            className="w-full rounded-md border-gray-300 shadow-sm focus:border-purple-500 focus:ring-purple-500"
          >
            <option value="">선택하세요</option>
            {repositories.map((repo) => (
              <option key={repo.id} value={repo.fullName}>
                {repo.fullName}
              </option>
            ))}
          </select>
        )}
      </div>

      {/* 새 기능 설명 입력 */}
      <div className="mb-4">
        <label
          htmlFor="feature-description"
          className="mb-2 block text-sm font-medium text-gray-700"
        >
          새 기능 설명
        </label>
        <textarea
          id="feature-description"
          className="w-full rounded-md border-gray-300 shadow-sm focus:border-purple-500 focus:ring-purple-500"
          rows={4}
          placeholder="예: 사용자 프로필 페이지에 다크 모드 토글 추가"
          value={newFeatureDescription}
          onChange={(e) => setNewFeatureDescription(e.target.value)}
        ></textarea>
      </div>

      {/* 예측 버튼 */}
      <button
        onClick={handlePredictTime}
        disabled={
          predictionLoading ||
          !selectedRepo ||
          newFeatureDescription.trim() === ''
        }
        className="w-full rounded-lg bg-purple-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-purple-700 disabled:opacity-50"
      >
        {predictionLoading ? '예측 중...' : '작업 시간 예측'}
      </button>

      {/* 예측 로딩 */}
      {predictionLoading && (
        <div className="mt-6 flex items-center justify-center py-4">
          <div className="mx-auto h-8 w-8 animate-spin rounded-full border-4 border-gray-200 border-t-purple-600"></div>
          <p className="ml-3 text-gray-600">예측 데이터를 가져오는 중...</p>
        </div>
      )}

      {/* 예측 에러 */}
      {predictionError && (
        <div className="mt-6 rounded-lg bg-red-50 p-4 text-center">
          <p className="text-red-800">{predictionError}</p>
        </div>
      )}

      {/* 예측 결과 */}
      {predictionResult && !predictionLoading && !predictionError && (
        <div className="mt-6 rounded-lg bg-purple-50 p-4 shadow">
          <h3 className="font-semibold text-purple-900">예측 결과</h3>
          <p className="mt-2 text-3xl font-bold text-purple-900">
            약 {predictionResult.predictedTimeHours.toFixed(1)} 시간
          </p>
          <p className="mt-3 text-sm text-purple-700">
            <strong>이유:</strong> {predictionResult.reason}
          </p>
        </div>
      )}
    </div>
  );
}
