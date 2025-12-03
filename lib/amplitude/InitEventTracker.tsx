'use client';

import { initAmplitude } from '@/lib/amplitude/initAmplitude';
import { useEffect } from 'react';

/**
 * 이벤트 추적 초기화
 * - Amplitude 초기화
 */
export const InitEventTracker = () => {
  useEffect(() => {
    initAmplitude();
  }, []);

  return null;
};
