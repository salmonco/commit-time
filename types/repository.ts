// Repository 관련 타입 정의

export type Repository = {
  id: number;
  name: string;
  fullName: string;
  description: string | null;
  private: boolean;
  language: string | null;
  stargazersCount: number;
  forksCount: number;
  updatedAt: string;
  htmlUrl: string;
};

export type RepositoryInfo = {
  id: number;
  name: string;
  fullName: string;
  lastSyncAt: string | null;
};
