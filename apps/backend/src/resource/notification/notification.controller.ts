import { Controller, Get, Post, Body, Patch, Param, Delete, Query, UseGuards } from '@nestjs/common';
import { NotificationService } from './notification.service';
import { Session, UserSession } from '@thallesp/nestjs-better-auth';
import { ApiPagination, Pagination, PaginationOptions } from '~/decorators/pagination.decorator';
import { PrismaTypes } from '@junction/types';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { NotificationGateway } from './notification.gateway';
import { EventPayloadMap } from '../events/event-types';
import { OnEvent } from '@nestjs/event-emitter';
import { EventBus } from '../events/event-bus.service';

@ApiTags("通知管理")
@Controller('notification')
export class NotificationController {
  constructor(
    private readonly notificationService: NotificationService,
  ) { }

  @Get()
  @ApiPagination()
  @ApiOperation({ summary: "通知列表", description: "获取当前用户的通知列表" })
  findAll(
    @Session() session: UserSession,
    @Query() query: Omit<PrismaTypes.Prisma.NotificationWhereInput, 'userId'> = {},
    @Pagination() pagination: PaginationOptions
  ) {
    return this.notificationService.findAll(session.user.id, query, pagination);
  }

  @Get('/:id')
  @ApiOperation({ summary: "通知详情", description: "获取通知详情" })
  findOne(
    @Param('id') id: string,
    @Session() session: UserSession
  ) {
    return this.notificationService.findOne(session.user.id, id);
  }

  @Get('unread-count')
  @ApiOperation({ summary: "未读数量", description: "获取未读通知数量" })
  getUnreadCount(@Session() session: UserSession) {
    return this.notificationService.getUnreadCount(session.user.id);
  }

  @Patch('read-all')
  @ApiOperation({ summary: "全部已读", description: "将当前用户所有通知标记为已读" })
  markAllAsRead(@Session() session: UserSession) {
    return this.notificationService.markAllAsReadForUser(session.user.id);
  }

  @Patch(':id/status')
  @ApiOperation({ summary: '更新通知处理状态' })
  updateStatus(
    @Session() session: UserSession,
    @Param('id') id: string,
    @Body() body: { processStatus: PrismaTypes.NotificationProcessStatus }
  ) {
    return this.notificationService.updateStatus(
      session.user.id,
      id,
      body.processStatus
    )
  }


  @Patch(':id/read')
  @ApiOperation({ summary: "标记已读", description: "将指定通知标记为已读" })
  markAsRead(
    @Session() session: UserSession,
    @Param('id') id: string
  ) {
    return this.notificationService.markAsRead(session.user.id, id);
  }

  @Delete()
  @ApiOperation({ summary: "清空通知", description: "删除当前用户的所有通知" })
  removeAll(@Session() session: UserSession) {
    return this.notificationService.removeAllForUser(session.user.id);
  }

  @Delete(':id')
  @ApiOperation({ summary: "删除通知" })
  remove(
    @Session() session: UserSession,
    @Param('id') id: string
  ) {
    return this.notificationService.remove(session.user.id, id);
  }

  @OnEvent('notification.create', { async: true, suppressErrors: false })
  async handleNotificationEvent(payload: EventPayloadMap['notification.create']) {
    this.notificationService.create(payload)
  }

}