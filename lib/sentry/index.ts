import * as Sentry from '@sentry/nextjs';

if (process.env.NODE_ENV === 'production') {
  if (!process.env.NEXT_PUBLIC_SENTRY_DSN) {
    throw new Error('NEXT_PUBLIC_SENTRY_DSN is not defined');
  }

  Sentry.init({
    /**
     * Sentry 프로젝트의 DSN (Data Source Name)
     * 에러 데이터를 전송할 Sentry 프로젝트를 식별하는 고유 URL
     */
    dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,

    /**
     * 성능 추적 샘플링 비율 (0.0 ~ 1.0)
     * 1.0은 모든 트랜잭션을 수집
     */
    tracesSampleRate: 1.0,

    /**
     * 세션 리플레이 샘플링 비율 (0.0 ~ 1.0)
     * 0.1은 10%의 세션에 대해 리플레이를 기록
     */
    replaysSessionSampleRate: 0.1,

    /**
     * 에러 발생 시 세션 리플레이 샘플링 비율 (0.0 ~ 1.0)
     * 1.0은 에러가 발생한 모든 세션의 리플레이를 기록
     */
    replaysOnErrorSampleRate: 1.0,
  });
}

export { Sentry };
