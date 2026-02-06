import { Body, Controller, Get, Param, Patch, Post, Query } from '@nestjs/common'
import { ApiOperation, ApiTags } from '@nestjs/swagger'
import { Session, UserSession } from '@thallesp/nestjs-better-auth'
import { ApiPagination, Pagination, PaginationOptions } from '~/decorators/pagination.decorator'
import { AiBotService, CreateBotInput, UpdateBotInput } from './ai-bot.service'
import { PrismaValues } from '@junction/types'

@ApiTags('机器人')
@Controller('ai-bot')
export class AiBotController {
  constructor(private readonly aiBotService: AiBotService) { }

  @Post()
  @ApiOperation({ summary: '创建机器人' })
  create(@Session() session: UserSession, @Body() body: CreateBotInput) {
    return this.aiBotService.createBot(session.user.id, body)
  }

  @Get()
  @ApiPagination()
  @ApiOperation({ summary: '获取机器人列表' })
  list(
    @Session() session: UserSession,
    @Pagination() pagination: PaginationOptions,
    @Query('keyword') keyword?: string,
    @Query('mine') mine?: string,
    @Query('visibility') visibility?: PrismaValues.BotVisibility,
    @Query('includeDisabled') includeDisabled?: string
  ) {
    return this.aiBotService.listBots(session.user.id, pagination, {
      keyword,
      mine: mine === 'true',
      visibility,
      includeDisabled: includeDisabled === 'true'
    })
  }

  @Get(':id')
  @ApiOperation({ summary: '获取机器人详情' })
  findOne(@Session() session: UserSession, @Param('id') id: string) {
    return this.aiBotService.findOne(session.user.id, id)
  }

  @Patch(':id')
  @ApiOperation({ summary: '更新机器人' })
  update(@Session() session: UserSession, @Param('id') id: string, @Body() body: UpdateBotInput) {
    return this.aiBotService.updateBot(session.user.id, id, body)
  }
}
