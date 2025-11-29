import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { PaginationData, PrismaTypes } from '@junction/types';
import { PaginationOptions } from '~/decorators/pagination.decorator';

@Injectable()
export class NotificationService {
  constructor(private readonly prisma: PrismaService) { }

  /**
   * 创建通知
   * 通常由系统内部调用，或者通过消息队列触发
   */
  async create(data: PrismaTypes.Prisma.NotificationUncheckedCreateInput) {
    return this.prisma.notification.create({
      data,
    });
  }

  /**
   * 获取用户的所有通知（支持分页和筛选）
   */
  async findAll(
    userId: string,
    whereData: Omit<PrismaTypes.Prisma.NotificationWhereInput, 'userId'> = {},
    { take, skip }: PaginationOptions
  ) {
    const { page, limit, ...clearWhere } = whereData as any;

    const where: PrismaTypes.Prisma.NotificationWhereInput = {
      ...clearWhere,
      userId,
    };

    const [data, total] = await Promise.all([
      this.prisma.notification.findMany({
        where,
        take,
        skip,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.notification.count({ where }),
    ]);

    return new PaginationData(data, { total, limit, page });
  }

  /**
   * 获取单条通知详情
   * 确保只能获取自己的通知
   */
  async findOne(userId: string, id: string) {
    return this.prisma.notification.findUnique({
      where: {
        id,
        userId,
      },
    });
  }

  /**
   * 获取未读数量
   */
  async getUnreadCount(userId: string) {
    return this.prisma.notification.count({
      where: {
        userId,
        status: 'UNREAD',
      },
    });
  }

  /**
   * 标记通知为已读
   */
  async markAsRead(userId: string, notificationId: string) {
    const exists = await this.prisma.notification.findFirst({
      where: { id: notificationId, userId }
    });

    if (!exists) return null;

    return this.prisma.notification.update({
      where: { id: notificationId },
      data: { status: 'READ' },
    });
  }

  /**
   * 标记用户的所有通知为已读
   */
  async markAllAsReadForUser(userId: string) {
    return this.prisma.notification.updateMany({
      where: { userId, status: 'UNREAD' },
      data: { status: 'READ' },
    });
  }

  /**
   * 删除单条通知
   */
  async remove(userId: string, notificationId: string) {
    const result = await this.prisma.notification.deleteMany({
      where: { id: notificationId, userId },
    });
    return result.count > 0;
  }

  /**
   * 清空用户的所有通知
   */
  async removeAllForUser(userId: string) {
    return this.prisma.notification.deleteMany({
      where: { userId },
    });
  }
}