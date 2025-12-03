import { trackAmplitudeEvent } from '@/lib/amplitude/trackAmplitudeEvent';

/**
 * 이벤트 추적 함수
 * - 이벤트명, 속성명을 snake_case로 작성
 * @param eventName 이벤트명
 * @param properties 이벤트 속성
 * @todo GA 이벤트 추적 추가
 */
export const trackEvent = (
  eventName: string,
  properties?: Record<string, unknown>,
) => {
  trackAmplitudeEvent(eventName, properties);
};
