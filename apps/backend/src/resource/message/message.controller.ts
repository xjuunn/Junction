import { Controller, Get, Post, Body, Patch, Param, Delete, Query } from '@nestjs/common';
import { MessageService } from './message.service';
import { Session, UserSession } from '@thallesp/nestjs-better-auth';
import { ApiPagination, Pagination, PaginationOptions } from '~/decorators/pagination.decorator';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { PrismaTypes } from '@junction/types';

@ApiTags("消息服务")
@Controller('message')
export class MessageController {
  constructor(private readonly messageService: MessageService) { }

  /**
   * 批量删除消息
   * 注意：静态路由必须放在动态路由 (:conversationId) 之前
   */
  @Delete('bulk')
  @ApiOperation({ summary: "批量删除消息" })
  bulkDelete(
    @Session() session: UserSession,
    @Body() body: { ids: string[] }
  ) {
    return this.messageService.bulkDelete(session.user.id, body.ids);
  }

  /**
   * 导出消息记录归档
   */
  @Post('export')
  @ApiOperation({ summary: "导出消息记录归档" })
  exportArchive(
    @Session() session: UserSession,
    @Body() body: { conversationIds?: string[] }
  ) {
    return this.messageService.exportArchive(session.user.id, body?.conversationIds);
  }

  /**
   * 导入消息记录归档
   */
  @Post('import')
  @ApiOperation({ summary: "导入消息记录归档" })
  importArchive(
    @Session() session: UserSession,
    @Body() body: any
  ) {
    return this.messageService.importArchive(session.user.id, body);
  }

  /**
   * 发送新消息
   */
  @Post()
  @ApiOperation({ summary: "发送消息" })
  create(
    @Session() session: UserSession,
    @Body()
    data: Omit<PrismaTypes.Prisma.MessageUncheckedCreateInput, 'sequence' | 'senderId'> & {
      sequence?: number;
      senderId?: string | null;
    }
  ) {
    return this.messageService.create(session.user.id, data);
  }

  /**
   * 分页获取会话消息
   */
  @Get(':conversationId')
  @ApiPagination()
  @ApiOperation({ summary: "获取历史消息" })
  findAll(
    @Session() session: UserSession,
    @Param('conversationId') conversationId: string,
    @Pagination() pagination: PaginationOptions,
    @Query('cursor') cursor?: string
  ) {
    return this.messageService.findAll(session.user.id, conversationId, pagination, cursor ? Number(cursor) : undefined);
  }

  /**
   * 编辑消息内容
   */
  @Patch(':id')
  @ApiOperation({ summary: "编辑消息" })
  update(
    @Session() session: UserSession,
    @Param('id') id: string,
    @Body() body: { content: string; payload?: any }
  ) {
    return this.messageService.update(session.user.id, id, body.content, body.payload);
  }

  /**
   * 撤回消息
   */
  @Patch(':id/revoke')
  @ApiOperation({ summary: "撤回消息" })
  revoke(@Session() session: UserSession, @Param('id') id: string) {
    return this.messageService.revoke(session.user.id, id);
  }

  /**
   * 上报已读状态
   */
  @Patch(':conversationId/read/:messageId')
  @ApiOperation({ summary: "已读上报" })
  markRead(
    @Session() session: UserSession,
    @Param('conversationId') conversationId: string,
    @Param('messageId') messageId: string
  ) {
    return this.messageService.markAsRead(session.user.id, conversationId, messageId);
  }

  /**
   * 会话内全文搜索
   */
  @Get(':conversationId/search')
  @ApiOperation({ summary: "搜索消息" })
  search(
    @Session() session: UserSession,
    @Param('conversationId') conversationId: string,
    @Query('q') q: string
  ) {
    return this.messageService.search(session.user.id, conversationId, q);
  }
}
