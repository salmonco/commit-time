'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { AxiosError } from 'axios';

const RETRY_COUNT = 1;

/**
 * React Query Client 싱글톤 인스턴스
 *
 * ✅ 모듈 레벨에서 생성 (권장 방식 - Next.js App Router)
 * - 앱 시작 시 딱 한 번만 생성
 * - Providers 컴포넌트가 재마운트되어도 같은 인스턴스 사용
 * - 페이지 이동 시에도 캐시 유지
 *
 * ❌ useState(() => new QueryClient()) 방식 (비권장)
 * - Providers가 재마운트되면 새 인스턴스 생성
 * - Next.js App Router에서 특정 네비게이션 시 재마운트 발생 가능
 * - 캐시가 날아가는 문제 발생
 *
 * @see https://tanstack.com/query/latest/docs/framework/react/guides/advanced-ssr#initial-setup-1
 */
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 0, // 항상 stale로 간주 → 페이지 방문 시마다 백그라운드 refetch
      gcTime: 10 * 60 * 1000, // 10분: 캐시 유지 시간 (빠른 UX 제공)
      refetchOnWindowFocus: false, // 창 포커스 시 자동 refetch 비활성화
      retry: (failureCount, error) => {
        // 401, 403 에러는 재시도하지 않음
        if (
          error instanceof AxiosError &&
          (error?.status === 401 || error?.status === 403)
        ) {
          return false;
        }
        // 다른 에러는 1번만 재시도
        return failureCount < RETRY_COUNT;
      },
    },
  },
});

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <QueryClientProvider client={queryClient}>
      {children}
      <ReactQueryDevtools initialIsOpen={false} />
    </QueryClientProvider>
  );
}
