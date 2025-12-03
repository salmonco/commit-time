import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

// GitHub token이 제대로 저장되는지 테스트하는 API
export async function GET() {
  const supabase = await createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
    return NextResponse.json({
      error: '로그인되지 않음',
    });
  }

  return NextResponse.json({
    hasProviderToken: !!session.provider_token,
    providerTokenLength: session.provider_token?.length || 0,
    provider: session.user.app_metadata.provider,
    message: session.provider_token
      ? '✅ Provider token이 저장되어 있습니다!'
      : '❌ Provider token이 없습니다. Supabase에서 "Store provider tokens" 설정을 켜주세요.',
  });
}
