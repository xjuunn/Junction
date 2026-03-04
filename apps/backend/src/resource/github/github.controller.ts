import { Controller, Get, Param, Query } from '@nestjs/common'
import { ApiOperation, ApiTags } from '@nestjs/swagger'
import { AllowAnonymous } from '@thallesp/nestjs-better-auth'
import { GithubService } from './github.service'

@ApiTags('github')
@Controller('github')
export class GithubController {
  constructor(
    private readonly githubService: GithubService,
  ) {}

  @ApiOperation({ summary: 'Get latest release' })
  @Get('releases/latest')
  @AllowAnonymous()
  getLatestRelease(
    @Query('owner') owner?: string,
    @Query('repo') repo?: string,
    @Query('refresh') refresh?: string,
  ) {
    return this.githubService.getLatestRelease(refresh === '1', owner, repo)
  }

  @ApiOperation({ summary: 'Get release list' })
  @Get('releases')
  @AllowAnonymous()
  getReleaseList(
    @Query('owner') owner?: string,
    @Query('repo') repo?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('refresh') refresh?: string,
  ) {
    const currentPage = Number(page || 1)
    const currentLimit = Number(limit || 20)
    return this.githubService.getReleaseList(currentPage, currentLimit, refresh === '1', owner, repo)
  }

  @ApiOperation({ summary: 'Get repository overview' })
  @Get('repo')
  @AllowAnonymous()
  getRepoOverview(
    @Query('owner') owner?: string,
    @Query('repo') repo?: string,
    @Query('refresh') refresh?: string,
  ) {
    return this.githubService.getRepoOverview(refresh === '1', owner, repo)
  }

  @ApiOperation({ summary: 'Get recent commits' })
  @Get('commits')
  @AllowAnonymous()
  getCommits(
    @Query('owner') owner?: string,
    @Query('repo') repo?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('refresh') refresh?: string,
  ) {
    const currentPage = Number(page || 1)
    const currentLimit = Number(limit || 20)
    return this.githubService.getCommits(currentPage, currentLimit, refresh === '1', owner, repo)
  }

  @ApiOperation({ summary: 'Get commit detail by sha' })
  @Get('commits/:sha')
  @AllowAnonymous()
  getCommitDetail(
    @Param('sha') sha: string,
    @Query('owner') owner?: string,
    @Query('repo') repo?: string,
    @Query('refresh') refresh?: string,
  ) {
    return this.githubService.getCommitDetail(sha, refresh === '1', owner, repo)
  }

  @ApiOperation({ summary: 'Get repository insights' })
  @Get('insights')
  @AllowAnonymous()
  getInsights(
    @Query('owner') owner?: string,
    @Query('repo') repo?: string,
    @Query('refresh') refresh?: string,
  ) {
    return this.githubService.getInsights(refresh === '1', owner, repo)
  }
}
