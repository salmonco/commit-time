import { createClient } from '@/lib/supabase/server';
import { ROUTES } from '@/lib/constants/routes';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import PredictionForm from '@/components/PredictionForm';

export default async function DashboardPage() {
  // 서버에서 인증 확인
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // 로그인 안 되어 있으면 로그인 페이지로
  if (!user) {
    redirect(ROUTES.LOGIN);
  }

  // GitHub 사용자 정보
  const githubUsername = user.user_metadata?.user_name;
  const githubAvatar = user.user_metadata?.avatar_url;
  const githubEmail = user.email;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 헤더 */}
      <header className="border-b bg-white">
        <div className="mx-auto max-w-7xl px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold text-gray-900">Commit Time</h1>

            {/* 사용자 정보 */}
            <div className="flex items-center gap-4">
              <div className="text-right">
                <p className="text-sm font-medium text-gray-900">
                  {githubUsername}
                </p>
                <p className="text-xs text-gray-500">{githubEmail}</p>
              </div>
              {githubAvatar && (
                <img
                  src={githubAvatar}
                  alt={githubUsername}
                  className="h-10 w-10 rounded-full"
                />
              )}
              <form action={ROUTES.AUTH.LOGOUT} method="POST">
                <button
                  type="submit"
                  className="rounded-lg bg-gray-100 px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-200"
                >
                  로그아웃
                </button>
              </form>
            </div>
          </div>
        </div>
      </header>

      {/* 메인 컨텐츠 */}
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {/* 환영 메시지 */}
        <div className="mb-8 rounded-lg bg-white p-6 shadow">
          <h2 className="text-xl font-semibold text-gray-900">
            환영합니다! 🎉
          </h2>
          <p className="mt-2 text-gray-600">
            GitHub 연동이 완료되었습니다.
            <br />
            Repository를 선택해서 작업 시간 분석을 시작하세요.
          </p>
        </div>

        {/* 시간 예측 폼 */}
        <div className="mb-8">
          <PredictionForm />
        </div>

        {/* 빠른 액션 */}
        <div className="grid gap-6 md:grid-cols-2">
          <Link
            href={ROUTES.REPOSITORIES}
            className="rounded-lg border-2 border-dashed border-gray-300 p-6 text-center transition-colors hover:border-blue-500 hover:bg-blue-50"
          >
            <div className="text-3xl">📂</div>
            <h3 className="mt-2 font-semibold text-gray-900">
              내 Repositories
            </h3>
            <p className="mt-1 text-sm text-gray-600">
              Repository 목록 및 커밋 분석 확인하기
            </p>
          </Link>

          <div className="rounded-lg border-2 border-dashed border-gray-300 p-6 text-center opacity-50">
            <div className="text-3xl">📊</div>
            <h3 className="mt-2 font-semibold text-gray-900">통계 대시보드</h3>
            <p className="mt-1 text-sm text-gray-600">곧 추가될 예정</p>
          </div>
        </div>

        {/* 개발 정보 */}
        <div className="mt-8 rounded-lg bg-blue-50 p-4">
          <h3 className="font-medium text-blue-900">개발 정보</h3>
          <div className="mt-2 space-y-1 text-sm text-blue-800">
            <p>• User ID: {user.id}</p>
            <p>• GitHub Username: {githubUsername}</p>
            <p>• Email: {githubEmail}</p>
          </div>
        </div>
      </main>
    </div>
  );
}
