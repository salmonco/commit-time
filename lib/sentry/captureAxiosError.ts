import { AxiosError } from 'axios';
import { Sentry } from '.';

const checkIsError = (error: unknown): error is Error => {
  return error instanceof Error;
};

/**
 * API 에러를 센트리로 캡쳐하는 함수
 * @param error - AxiosError
 */
const captureSentryError = (error: AxiosError) => {
  if (!checkIsError(error)) {
    return;
  }

  Sentry.withScope((scope: Sentry.Scope) => {
    // 기본 정보 설정
    scope.setTag('type', 'api');

    // 데이터 없는 경우 필터링
    if (!error.config) {
      return;
    }

    Sentry.captureException(error);
  });
};

/**
 * API 에러를 센트리로 캡쳐하기 위한 인터셉터
 * - 비동기로 캡쳐 수행
 * @param error - AxiosError
 * @returns
 */
export const captureAxiosError = (error: AxiosError) => {
  setTimeout(() => captureSentryError(error), 0);

  return Promise.reject(error);
};
