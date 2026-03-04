import { HttpException, HttpStatus, Injectable } from '@nestjs/common'

type CacheEntry<T> = {
  data: T
  expiresAt: number
}

type GithubUser = {
  login?: string
  avatar_url?: string
  html_url?: string
}

type GithubCommitListItem = {
  sha: string
  html_url: string
  author: GithubUser | null
  commit: {
    message: string
    author: {
      name: string
      email: string
      date: string
    }
  }
}

type GithubContributor = {
  login: string
  avatar_url: string
  html_url: string
  contributions: number
}

type GithubRepo = {
  full_name: string
  description: string | null
  html_url: string
  stargazers_count: number
  forks_count: number
  open_issues_count: number
  subscribers_count: number
  language: string | null
  default_branch: string
  pushed_at: string
  updated_at: string
  created_at: string
}

type GithubCommitDetail = {
  sha: string
  html_url: string
  author: GithubUser | null
  commit: {
    message: string
    author: {
      name: string
      email: string
      date: string
    }
  }
  stats?: {
    additions: number
    deletions: number
    total: number
  }
  files?: Array<{
    filename: string
    status: string
    additions: number
    deletions: number
    changes: number
    patch?: string
  }>
}

type RepoOverview = {
  fullName: string
  description: string | null
  htmlUrl: string
  stars: number
  forks: number
  openIssues: number
  watchers: number
  language: string | null
  defaultBranch: string
  pushedAt: string
  updatedAt: string
  createdAt: string
}

type CommitItem = {
  sha: string
  shortSha: string
  message: string
  authorName: string
  authorLogin: string | null
  authorAvatar: string | null
  authorUrl: string | null
  committedAt: string
  htmlUrl: string
}

export type GithubInsights = {
  owner: string
  repo: string
  overview: RepoOverview
  frequency: {
    last7Days: number
    last30Days: number
    avgPerWeek: number
    activeDaysIn30Days: number
    avgIntervalHours: number | null
  }
  topAuthors: Array<{
    name: string
    login: string | null
    avatar: string | null
    htmlUrl: string | null
    commits: number
  }>
  contributors: Array<{
    login: string
    avatar: string
    htmlUrl: string
    contributions: number
  }>
  commits: CommitItem[]
}

@Injectable()
export class GithubService {
  private readonly defaultOwner = process.env.GITHUB_OWNER || 'xjuunn'
  private readonly defaultRepo = process.env.GITHUB_REPO || 'Junction'
  private readonly token = process.env.GITHUB_TOKEN || ''
  private readonly cacheTtlMs = 60 * 1000
  private readonly shortCacheTtlMs = 30 * 1000
  private readonly requestTimeoutMs = 10 * 1000
  private readonly cache = new Map<string, CacheEntry<unknown>>()

  private resolveRepo(owner?: string, repo?: string) {
    const currentOwner = (owner || this.defaultOwner).trim()
    const currentRepo = (repo || this.defaultRepo).trim()
    return {
      owner: currentOwner,
      repo: currentRepo,
      key: `${currentOwner}/${currentRepo}`,
      baseUrl: `https://api.github.com/repos/${currentOwner}/${currentRepo}`,
    }
  }

  private getHeaders() {
    const headers: Record<string, string> = {
      Accept: 'application/vnd.github+json',
      'User-Agent': 'junction-backend',
    }
    if (this.token) headers.Authorization = `Bearer ${this.token}`
    return headers
  }

  private async requestGithub<T>(url: string): Promise<T> {
    const requestOnce = async () => {
      const controller = new AbortController()
      const timeout = setTimeout(() => controller.abort(), this.requestTimeoutMs)
      try {
        return await fetch(url, {
          headers: this.getHeaders(),
          signal: controller.signal,
        })
      }
      finally {
        clearTimeout(timeout)
      }
    }

    let response: Response | null = null
    let lastError: unknown = null
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        response = await requestOnce()
        break
      }
      catch (error) {
        lastError = error
        if (attempt === 0) {
          await new Promise(resolve => setTimeout(resolve, 250))
          continue
        }
      }
    }

    if (!response) {
      const isTimeout = lastError instanceof Error && lastError.name === 'AbortError'
      throw new HttpException(
        isTimeout ? 'GitHub request timeout' : 'GitHub request failed',
        HttpStatus.BAD_GATEWAY,
      )
    }

    if (!response.ok) {
      const body = await response.text()
      let message = 'GitHub API request failed'
      try {
        const json = JSON.parse(body) as { message?: string }
        if (json?.message) message = json.message
      }
      catch {
        if (body) message = body
      }
      throw new HttpException(`GitHub API error: ${message}`, HttpStatus.BAD_GATEWAY)
    }

    return (await response.json()) as T
  }

  private async withCache<T>(
    key: string,
    getter: () => Promise<T>,
    ttlMs = this.cacheTtlMs,
    forceRefresh = false,
  ): Promise<T> {
    const now = Date.now()
    const cached = this.cache.get(key) as CacheEntry<T> | undefined
    if (!forceRefresh && cached && cached.expiresAt > now) return cached.data
    try {
      const data = await getter()
      this.cache.set(key, { data, expiresAt: now + ttlMs })
      return data
    }
    catch (error) {
      // GitHub 抖动时回退到历史缓存，避免前端直接 502。
      if (cached) return cached.data
      throw error
    }
  }

  private normalizeCommit(item: GithubCommitListItem): CommitItem {
    return {
      sha: item.sha,
      shortSha: item.sha.slice(0, 7),
      message: item.commit.message.split('\n')[0] || '(no message)',
      authorName: item.commit.author?.name || 'Unknown',
      authorLogin: item.author?.login || null,
      authorAvatar: item.author?.avatar_url || null,
      authorUrl: item.author?.html_url || null,
      committedAt: item.commit.author?.date,
      htmlUrl: item.html_url,
    }
  }

  private buildFrequency(commits: CommitItem[]) {
    const now = Date.now()
    const dayMs = 24 * 60 * 60 * 1000
    const sevenDaysAgo = now - 7 * dayMs
    const thirtyDaysAgo = now - 30 * dayMs

    let last7Days = 0
    let last30Days = 0
    const activeDaysSet = new Set<string>()
    const dates: number[] = []

    for (const commit of commits) {
      const ts = new Date(commit.committedAt).getTime()
      if (!Number.isFinite(ts)) continue
      dates.push(ts)
      if (ts >= sevenDaysAgo) last7Days++
      if (ts >= thirtyDaysAgo) {
        last30Days++
        activeDaysSet.add(new Date(ts).toISOString().slice(0, 10))
      }
    }

    dates.sort((a, b) => b - a)
    let avgIntervalHours: number | null = null
    if (dates.length >= 2) {
      let sumGap = 0
      let count = 0
      for (let i = 0; i < dates.length - 1; i++) {
        const gap = dates[i] - dates[i + 1]
        if (gap > 0) {
          sumGap += gap
          count++
        }
      }
      if (count > 0) avgIntervalHours = Number((sumGap / count / (60 * 60 * 1000)).toFixed(1))
    }

    return {
      last7Days,
      last30Days,
      avgPerWeek: Number((last30Days / 4.2857).toFixed(1)),
      activeDaysIn30Days: activeDaysSet.size,
      avgIntervalHours,
    }
  }

  private buildTopAuthors(commits: CommitItem[]) {
    const map = new Map<string, { name: string; login: string | null; avatar: string | null; htmlUrl: string | null; commits: number }>()
    for (const commit of commits) {
      const key = commit.authorLogin || commit.authorName
      const prev = map.get(key)
      if (prev) {
        prev.commits += 1
        continue
      }
      map.set(key, {
        name: commit.authorName,
        login: commit.authorLogin,
        avatar: commit.authorAvatar,
        htmlUrl: commit.authorUrl,
        commits: 1,
      })
    }
    return Array.from(map.values())
      .sort((a, b) => b.commits - a.commits)
      .slice(0, 8)
  }

  async getLatestRelease(forceRefresh = false, owner?: string, repo?: string) {
    const repoInfo = this.resolveRepo(owner, repo)
    return this.withCache(
      `release:latest:${repoInfo.key}`,
      () => this.requestGithub(`${repoInfo.baseUrl}/releases/latest`),
      this.cacheTtlMs,
      forceRefresh,
    )
  }

  async getReleaseList(page = 1, limit = 20, forceRefresh = false, owner?: string, repo?: string) {
    const repoInfo = this.resolveRepo(owner, repo)
    const currentPage = Number.isFinite(page) ? Math.max(1, page) : 1
    const currentLimit = Number.isFinite(limit) ? Math.min(100, Math.max(1, limit)) : 20
    return this.withCache(
      `release:list:${repoInfo.key}:${currentPage}:${currentLimit}`,
      () => this.requestGithub(`${repoInfo.baseUrl}/releases?page=${currentPage}&per_page=${currentLimit}`),
      this.cacheTtlMs,
      forceRefresh,
    )
  }

  async getRepoOverview(forceRefresh = false, owner?: string, repo?: string): Promise<RepoOverview> {
    const repoInfo = this.resolveRepo(owner, repo)
    const data = await this.withCache(
      `repo:overview:${repoInfo.key}`,
      () => this.requestGithub<GithubRepo>(repoInfo.baseUrl),
      this.cacheTtlMs,
      forceRefresh,
    )

    return {
      fullName: data.full_name,
      description: data.description,
      htmlUrl: data.html_url,
      stars: data.stargazers_count,
      forks: data.forks_count,
      openIssues: data.open_issues_count,
      watchers: data.subscribers_count,
      language: data.language,
      defaultBranch: data.default_branch,
      pushedAt: data.pushed_at,
      updatedAt: data.updated_at,
      createdAt: data.created_at,
    }
  }

  async getCommits(page = 1, limit = 20, forceRefresh = false, owner?: string, repo?: string): Promise<CommitItem[]> {
    const repoInfo = this.resolveRepo(owner, repo)
    const currentPage = Number.isFinite(page) ? Math.max(1, page) : 1
    const currentLimit = Number.isFinite(limit) ? Math.min(100, Math.max(1, limit)) : 20
    const data = await this.withCache(
      `repo:commits:${repoInfo.key}:${currentPage}:${currentLimit}`,
      () => this.requestGithub<GithubCommitListItem[]>(
        `${repoInfo.baseUrl}/commits?page=${currentPage}&per_page=${currentLimit}`,
      ),
      this.shortCacheTtlMs,
      forceRefresh,
    )
    return data.map(item => this.normalizeCommit(item))
  }

  async getCommitDetail(sha: string, forceRefresh = false, owner?: string, repo?: string): Promise<GithubCommitDetail> {
    const repoInfo = this.resolveRepo(owner, repo)
    return this.withCache(
      `repo:commit:${repoInfo.key}:${sha}`,
      () => this.requestGithub<GithubCommitDetail>(`${repoInfo.baseUrl}/commits/${sha}`),
      this.cacheTtlMs,
      forceRefresh,
    )
  }

  async getInsights(forceRefresh = false, owner?: string, repo?: string): Promise<GithubInsights> {
    const repoInfo = this.resolveRepo(owner, repo)
    return this.withCache(
      `repo:insights:${repoInfo.key}`,
      async () => {
        const [overview, commits, contributors] = await Promise.all([
          this.getRepoOverview(forceRefresh, repoInfo.owner, repoInfo.repo),
          this.getCommits(1, 60, forceRefresh, repoInfo.owner, repoInfo.repo),
          this.withCache(
            `repo:contributors:${repoInfo.key}`,
            () => this.requestGithub<GithubContributor[]>(
              `${repoInfo.baseUrl}/contributors?page=1&per_page=10`,
            ),
            this.cacheTtlMs,
            forceRefresh,
          ),
        ])

        return {
          owner: repoInfo.owner,
          repo: repoInfo.repo,
          overview,
          frequency: this.buildFrequency(commits),
          topAuthors: this.buildTopAuthors(commits),
          contributors: contributors.map(item => ({
            login: item.login,
            avatar: item.avatar_url,
            htmlUrl: item.html_url,
            contributions: item.contributions,
          })),
          commits: commits.slice(0, 30),
        }
      },
      this.shortCacheTtlMs,
      forceRefresh,
    )
  }
}
