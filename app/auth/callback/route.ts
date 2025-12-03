import { createClient } from '@/lib/supabase/server';
import { ROUTES } from '@/lib/constants/routes';
import { NextResponse } from 'next/server';

// GitHub OAuth 콜백 핸들러
// GitHub에서 로그인 후 이 URL로 리다이렉트됩니다
export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get('code');

  if (code) {
    const supabase = await createClient();

    // code를 사용해서 세션 생성
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (error) {
      console.error('세션 생성 에러:', error);
      // 에러 발생 시 로그인 페이지로
      return NextResponse.redirect(
        new URL(`${ROUTES.LOGIN}?error=auth`, requestUrl.origin),
      );
    }
  }

  // 성공하면 대시보드로 이동
  return NextResponse.redirect(new URL(ROUTES.DASHBOARD, requestUrl.origin));
}
