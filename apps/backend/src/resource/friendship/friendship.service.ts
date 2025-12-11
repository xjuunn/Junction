import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { PaginationData, type PrismaTypes } from '@junction/types';
import { PaginationOptions } from '~/decorators/pagination.decorator';
import { EventBus } from '../events/event-bus.service';

@Injectable()
export class FriendshipService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly eventBus: EventBus,
  ) { }

  async create(
    userId: string,
    data: Omit<PrismaTypes.Prisma.FriendshipUncheckedCreateInput, 'senderId' | 'status'>
  ) {
    const receiverId = data.receiverId;
    const existing = await this.prisma.friendship.findUnique({
      where: { senderId_receiverId: { senderId: userId, receiverId } }
    });
    if (!existing) {
      const result = await this.prisma.friendship.create({
        data: {
          ...data,
          senderId: userId,
          status: 'PENDING',
        },
        include: { receiver: true, sender: true }
      });
      await this.eventBus.emit('notification.create', {
        title: "好友请求",
        type: 'FRIEND_REQUEST',
        userId: result.receiverId,
        icon: 'mingcute:user-add-fill',
        content: `用户${result.sender.name}想要添加你为好友。`,
        extra: result,
      })
      return result;
    }
    if (existing.status === 'ACCEPTED') {
      throw new BadRequestException('对方已是你的好友');
    }
    const result = await this.prisma.friendship.update({
      where: { id: existing.id },
      data: {
        status: 'PENDING',
        createdAt: new Date(),
      },
      include: { receiver: true, sender: true }
    });
    await this.eventBus.emit('notification.create', {
      title: "好友请求",
      type: 'FRIEND_REQUEST',
      userId: result.receiverId,
      icon: 'mingcute:user-add-fill',
      content: `用户${result.sender.name}想要添加你为好友。`,
      extra: result,
    })
    return result;
  }

  async findAll(
    userId: string,
    whereData: Omit<PrismaTypes.Prisma.FriendshipWhereInput, 'senderId'>,
    { take, skip }: PaginationOptions
  ) {
    const { page, limit, ...clearWhere } = whereData as any;
    const where = {
      AND: [
        clearWhere,
        { OR: [{ senderId: userId }, { receiverId: userId }] }
      ]
    }
    const [data, total] = await Promise.all([
      this.prisma.friendship.findMany({
        where, take, skip,
        include: { receiver: true },
      }),
      this.prisma.friendship.count({ where })
    ])
    return new PaginationData(data, { total, limit, page })
  }

  findOne(userId: string, receiverId: string) {
    return this.prisma.friendship.findUnique({
      where: {
        senderId_receiverId: { senderId: userId, receiverId }
      },
      include: { receiver: true },
    });
  }

  update(
    id: string,
    userId: string,
    data: Omit<PrismaTypes.Prisma.FriendshipUpdateInput, 'senderId'>
  ) {
    return this.prisma.friendship.update({
      where: { id, senderId: userId },
      data,
      include: { receiver: true }
    })
  }

  remove(userId: string, receiverId: string) {
    return this.prisma.friendship.delete({
      where: { senderId_receiverId: { senderId: userId, receiverId } },
      include: { receiver: true }
    })
  }
}
