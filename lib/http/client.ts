import axios, { AxiosError } from 'axios';
import { ROUTES } from '@/lib/constants/routes';
import { captureAxiosError } from '@/lib/sentry/captureAxiosError';

const axiosInstance = axios.create();

axiosInstance.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    // 401 (Unauthorized) 또는 403 (Forbidden) 에러 처리: 로그인 페이지로 리디렉션
    if (
      error.response &&
      (error.response.status === 401 || error.response.status === 403)
    ) {
      if (typeof window !== 'undefined') {
        window.location.href = ROUTES.LOGIN;
      }
    } else {
      // 그 외 에러는 Sentry로 캡쳐 (운영 환경에서만)
      if (
        process.env.NODE_ENV === 'production' &&
        error instanceof AxiosError
      ) {
        captureAxiosError(error);
      }
    }
    return Promise.reject(error);
  },
);

export default axiosInstance;
