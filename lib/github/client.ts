// 🐙 GitHub API와 통신하는 클라이언트
// Octokit을 사용해서 GitHub 데이터를 가져옵니다

import { Octokit } from '@octokit/rest';

/**
 * GitHub API 클라이언트 생성
 * @param accessToken - 사용자의 GitHub access token
 */
export function createGitHubClient(accessToken: string) {
  return new Octokit({
    auth: accessToken,
  });
}

/**
 * 사용자의 모든 Repository 가져오기
 */
export async function getUserRepositories(accessToken: string) {
  const octokit = createGitHubClient(accessToken);

  try {
    // 최대 100개까지 한 번에 가져오기
    const { data } = await octokit.repos.listForAuthenticatedUser({
      per_page: 100,
      sort: 'updated', // 최근 업데이트된 순서
      affiliation: 'owner,collaborator', // 소유자 + 협업자
    });

    return data.map((repo) => ({
      id: repo.id,
      name: repo.name,
      fullName: repo.full_name,
      description: repo.description,
      private: repo.private,
      language: repo.language,
      stargazersCount: repo.stargazers_count,
      forksCount: repo.forks_count,
      updatedAt: repo.updated_at,
      htmlUrl: repo.html_url,
    }));
  } catch (error) {
    console.error('Repository 목록 가져오기 실패:', error);
    throw new Error('GitHub에서 Repository 정보를 가져올 수 없습니다.');
  }
}

/**
 * 특정 Repository의 최근 Commit 가져오기
 */
export async function getRepositoryCommits(
  accessToken: string,
  owner: string,
  repo: string,
  options?: {
    since?: string; // ISO 8601 날짜
    until?: string;
    per_page?: number;
    page?: number;
  },
) {
  const octokit = createGitHubClient(accessToken);

  try {
    const { data } = await octokit.repos.listCommits({
      owner,
      repo,
      per_page: options?.per_page || 100,
      page: options?.page || 1,
      since: options?.since,
      until: options?.until,
    });

    return data.map((commit) => ({
      sha: commit.sha,
      message: commit.commit.message,
      author: {
        name: commit.commit.author?.name,
        email: commit.commit.author?.email,
        date: commit.commit.author?.date,
      },
      htmlUrl: commit.html_url,
    }));
  } catch (error) {
    console.error('Commit 목록 가져오기 실패:', error);
    throw new Error('GitHub에서 Commit 정보를 가져올 수 없습니다.');
  }
}

/**
 * Commit의 상세 정보 (변경된 파일 등) 가져오기
 */
export async function getCommitDetails(
  accessToken: string,
  owner: string,
  repo: string,
  sha: string,
) {
  const octokit = createGitHubClient(accessToken);

  try {
    const { data } = await octokit.repos.getCommit({
      owner,
      repo,
      ref: sha,
    });

    return {
      sha: data.sha,
      message: data.commit.message,
      author: {
        name: data.commit.author?.name,
        email: data.commit.author?.email,
        date: data.commit.author?.date,
      },
      stats: {
        additions: data.stats?.additions || 0,
        deletions: data.stats?.deletions || 0,
        total: data.stats?.total || 0,
      },
      files: data.files?.map((file) => ({
        filename: file.filename,
        status: file.status,
        additions: file.additions,
        deletions: file.deletions,
        changes: file.changes,
      })),
    };
  } catch (error) {
    console.error('Commit 상세 정보 가져오기 실패:', error);
    throw new Error('Commit 상세 정보를 가져올 수 없습니다.');
  }
}
