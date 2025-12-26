import { Controller, Get, Post, Body, Patch, Param, Delete, Query } from '@nestjs/common';
import { ConversationService } from './conversation.service';
import { Session, UserSession } from '@thallesp/nestjs-better-auth';
import { ApiPagination, Pagination, PaginationOptions } from '~/decorators/pagination.decorator';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { PrismaTypes } from '@junction/types';

@ApiTags("会话管理")
@Controller('conversation')
export class ConversationController {
  constructor(private readonly conversationService: ConversationService) { }

  /**
   * 发起新会话
   */
  @Post()
  @ApiOperation({ summary: "发起会话" })
  create(
    @Session() session: UserSession,
    @Body() data: { type: 'PRIVATE' | 'GROUP'; targetId?: string; title?: string; avatar?: string; memberIds?: string[] }
  ) {
    return this.conversationService.create(session.user.id, data);
  }

  /**
   * 获取当前用户的会话列表
   */
  @Get()
  @ApiPagination()
  @ApiOperation({ summary: "会话列表" })
  findAll(
    @Session() session: UserSession,
    @Pagination() pagination: PaginationOptions
  ) {
    return this.conversationService.findAll(session.user.id, pagination);
  }

  /**
   * 获取会话详情
   */
  @Get(':id')
  @ApiOperation({ summary: "会话详情" })
  findOne(
    @Session() session: UserSession,
    @Param('id') id: string
  ) {
    return this.conversationService.findOne(session.user.id, id);
  }

  /**
   * 修改个人在会话中的设置（如置顶、免打扰）
   */
  @Patch(':id/settings')
  @ApiOperation({ summary: "修改个人会话设置" })
  updateSettings(
    @Session() session: UserSession,
    @Param('id') id: string,
    @Body() data: PrismaTypes.Prisma.ConversationMemberUpdateInput
  ) {
    return this.conversationService.updateMember(session.user.id, id, data);
  }

  /**
   * 隐藏会话或从列表中移除
   */
  @Delete(':id')
  @ApiOperation({ summary: "移除/隐藏会话" })
  remove(
    @Session() session: UserSession,
    @Param('id') id: string
  ) {
    return this.conversationService.remove(session.user.id, id);
  }
}