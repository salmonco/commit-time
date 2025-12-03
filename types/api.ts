// API 응답 타입 정의

import type { FeatureCommit, GroupedFeature } from './analysis';
import type { Commit, SyncInfo } from './commit';
import type { Repository, RepositoryInfo } from './repository';

export type RepositoriesResponse = {
  success: boolean;
  data: Repository[];
  count: number;
};

export type CommitsResponse = {
  success: boolean;
  data: Commit[];
  count: number;
  repository: RepositoryInfo;
  sync?: SyncInfo;
  needsFullSync?: boolean; // 백그라운드 전체 동기화 필요 여부
};

export interface AnalysisResponse {
  success: boolean;
  data: FeatureCommit[]; // 모든 커밋 데이터
  groupedFeatures: GroupedFeature[];
  count: number;
}

export interface PredictionResponse {
  success: boolean;
  predictedTimeHours: number;
  reason: string;
}
