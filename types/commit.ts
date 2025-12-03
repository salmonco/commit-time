// Commit 관련 타입 정의

export type Commit = {
  sha: string;
  message: string;
  author: {
    name?: string;
    email?: string;
    date?: string;
  };
  stats?: {
    additions: number;
    deletions: number;
  };
  filesChanged?: number;
  htmlUrl?: string;
};

export type SyncInfo = {
  synced: boolean;
  total: number;
  saved: number;
  skipped: number;
};
