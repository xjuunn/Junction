import type { GithubController } from '@junction/backend/src/resource/github/github.controller'

const base = '/github'

type RepoQuery = {
  owner?: string
  repo?: string
  refresh?: '0' | '1'
}

export type GithubInsightsData = AwaitedReturnType<GithubController['getInsights']>
export type GithubCommitsData = AwaitedReturnType<GithubController['getCommits']>
export type GithubCommitDetailData = AwaitedReturnType<GithubController['getCommitDetail']>

export function getGithubInsights(params?: RepoQuery) {
  return api.get<GithubInsightsData>(`${base}/insights`, params)
}

export function getGithubCommits(params?: RepoQuery & { page?: number; limit?: number }) {
  return api.get<GithubCommitsData>(`${base}/commits`, params)
}

export function getGithubCommitDetail(sha: string, params?: RepoQuery) {
  return api.get<GithubCommitDetailData>(`${base}/commits/${sha}`, params)
}
