// API 응답 타입 정의

import type { Repository, RepositoryInfo } from './repository';
import type { Commit, SyncInfo } from './commit';

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
};
