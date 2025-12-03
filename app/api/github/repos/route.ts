import { createClient } from '@/lib/supabase/server';
import { getUserRepositories } from '@/lib/github/client';
import { NextResponse } from 'next/server';

// Repository 목록 가져오기 API
export async function GET() {
  try {
    // 1. 인증된 사용자 확인
    const supabase = await createClient();
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session) {
      return NextResponse.json(
        { error: '로그인이 필요합니다' },
        { status: 401 },
      );
    }

    // 2. GitHub access token 가져오기
    const accessToken = session.provider_token;
    if (!accessToken) {
      return NextResponse.json(
        { error: 'GitHub 토큰이 없습니다' },
        { status: 401 },
      );
    }

    // 3. GitHub API로 Repository 목록 가져오기
    const repositories = await getUserRepositories(accessToken);

    return NextResponse.json({
      success: true,
      data: repositories,
      count: repositories.length,
    });
  } catch (error) {
    console.error('Repository API 에러:', error);
    return NextResponse.json(
      {
        error: 'Repository 정보를 가져오는데 실패했습니다',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 },
    );
  }
}
