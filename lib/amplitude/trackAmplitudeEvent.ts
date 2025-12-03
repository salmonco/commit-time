import { amplitude } from '.';

export const trackAmplitudeEvent = (
  eventName: string,
  properties?: Record<string, unknown>,
) => {
  // 개발 환경에서는 Amplitude 비활성화
  if (process.env.NODE_ENV === 'development') {
    console.log('[Amplitude DEV] Track:', eventName, properties ?? '');
    return;
  }

  amplitude.track(eventName, properties);
};
