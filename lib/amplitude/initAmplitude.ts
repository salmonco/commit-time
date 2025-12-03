import { amplitude } from '.';

export const initAmplitude = () => {
  // 개발 환경에서는 Amplitude 비활성화
  if (process.env.NODE_ENV === 'development') {
    console.log('[Amplitude DEV] Init');
    return;
  }

  const apiKey = process.env.NEXT_PUBLIC_AMPLITUDE_API_KEY;

  if (!apiKey) {
    console.warn('Amplitude API key is not set.');
    return;
  }

  console.log('[Amplitude] Init');

  amplitude.init(apiKey, undefined, {
    defaultTracking: {
      /**
       * 기본 페이지 뷰 이벤트 활성화 (default = true)
       */
      pageViews: true,
    },
  });
};
