import { createClient } from '@/lib/supabase/server';
import { ROUTES } from '@/lib/constants/routes';
import { NextResponse } from 'next/server';

export async function POST() {
  const supabase = await createClient();

  // 로그아웃
  await supabase.auth.signOut();

  // 로그인 페이지로 리다이렉트
  return NextResponse.redirect(
    new URL(ROUTES.LOGIN, process.env.NEXT_PUBLIC_APP_URL),
  );
}
