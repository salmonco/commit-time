'use client';

import { createClient } from '@/lib/supabase/client';
import { ROUTES } from '@/lib/constants/routes';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

export default function LoginPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const supabase = createClient();

  // GitHub으로 로그인하기
  const handleGitHubLogin = async () => {
    try {
      setIsLoading(true);

      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'github',
        options: {
          redirectTo: `${window.location.origin}${ROUTES.AUTH.CALLBACK}`,
          scopes: 'read:user user:email repo', // GitHub 권한 요청
        },
      });

      if (error) {
        console.error('로그인 에러:', error);
        alert('로그인에 실패했습니다. 다시 시도해주세요.');
      }
    } catch (error) {
      console.error('예상치 못한 에러:', error);
      alert('문제가 발생했습니다.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-gray-900 via-purple-900 to-violet-800">
      <div className="w-full max-w-md space-y-8 rounded-2xl bg-white p-10 shadow-2xl">
        {/* 로고 영역 */}
        <div className="text-center">
          <h1 className="text-4xl font-bold text-gray-900">Commit Time</h1>
          <p className="mt-2 text-sm text-gray-600">
            GitHub 커밋으로 작업 시간을 예측하세요
          </p>
        </div>

        {/* 로그인 버튼 */}
        <div className="mt-8 space-y-6">
          <button
            onClick={handleGitHubLogin}
            disabled={isLoading}
            className="group relative flex w-full justify-center rounded-lg border border-transparent bg-gray-900 px-4 py-3 text-sm font-medium text-white transition-all hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isLoading ? (
              <span className="flex items-center gap-2">
                <svg
                  className="h-5 w-5 animate-spin"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  />
                </svg>
                연결 중...
              </span>
            ) : (
              <span className="flex items-center gap-2">
                <svg
                  className="h-5 w-5"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M10 0C4.477 0 0 4.484 0 10.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0110 4.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.203 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.942.359.31.678.921.678 1.856 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0020 10.017C20 4.484 15.522 0 10 0z"
                    clipRule="evenodd"
                  />
                </svg>
                GitHub으로 로그인
              </span>
            )}
          </button>

          {/* 설명 */}
          <div className="text-center text-xs text-gray-500">
            <p>로그인하면 다음에 동의하게 됩니다:</p>
            <ul className="mt-2 space-y-1 text-left">
              <li>• GitHub 프로필 정보 조회</li>
              <li>• Repository 및 커밋 데이터 분석</li>
              <li>• 작업 시간 통계 생성</li>
            </ul>
          </div>
        </div>

        {/* 푸터 */}
        <div className="text-center text-xs text-gray-500">
          <p>
            GitHub 데이터는 안전하게 보호되며
            <br />
            언제든지 연동을 해제할 수 있습니다.
          </p>
        </div>
      </div>
    </div>
  );
}
