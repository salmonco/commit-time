// types/analysis.ts

import { Commit } from '@/lib/prisma/generated/client';

export interface FeatureCommit extends Omit<Commit, 'authorDate'> {
  authorDate: string; // Override authorDate to be string for API response consistency
}

export interface GroupedFeature {
  featureName: string;
  commits: FeatureCommit[];
  timeSpentSeconds: number;
  timeSpentHours: number; // 실제 작업 시간 (세션 기반)
  totalElapsedHours: number; // 총 경과 시간 (첫 ~ 마지막 커밋)
}
