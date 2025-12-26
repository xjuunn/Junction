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

  /**
   * 发起好友申请
   */
  async create(
    userId: string,
    data: Omit<PrismaTypes.Prisma.FriendshipUncheckedCreateInput, 'senderId' | 'status'>
  ) {
    const receiverId = data.receiverId;
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);

    const [myRecord, theirRecord] = await Promise.all([
      this.prisma.friendship.findUnique({ where: { senderId_receiverId: { senderId: userId, receiverId } } }),
      this.prisma.friendship.findUnique({ where: { senderId_receiverId: { senderId: receiverId, receiverId: userId } } })
    ]);

    if (myRecord?.status === 'ACCEPTED') throw new BadRequestException('对方已是你的好友');
    if (theirRecord?.status === 'PENDING') return this.accept(userId, receiverId);
    if (myRecord && myRecord.createdAt > oneHourAgo && myRecord.status === 'PENDING') {
      throw new BadRequestException('请勿频繁发送申请');
    }

    const result = await this.prisma.friendship.upsert({
      where: { senderId_receiverId: { senderId: userId, receiverId } },
      create: { ...data, senderId: userId, status: 'PENDING' },
      update: { ...data, status: 'PENDING', createdAt: new Date() },
      include: { sender: true, receiver: true }
    });

    await this.eventBus.emit('notification.create', {
      title: '好友请求',
      type: 'FRIEND_REQUEST',
      userId: receiverId,
      icon: 'mingcute:user-add-fill',
      cover: result.sender.image,
      content: `用户 ${result.sender.name} 想要添加你为好友。`,
      payload: { id: userId, type: 'friendship' }
    });

    return result;
  }

  /**
   * 接受好友请求
   */
  async accept(currentUserId: string, friendId: string) {
    return await this.prisma.$transaction(async (tx) => {
      const request = await tx.friendship.findUnique({
        where: { senderId_receiverId: { senderId: friendId, receiverId: currentUserId } }
      });

      if (!request) throw new BadRequestException('好友申请不存在');

      const updatedRequest = await tx.friendship.update({
        where: { id: request.id },
        data: { status: 'ACCEPTED' },
        include: { sender: true, receiver: true }
      });

      await tx.friendship.upsert({
        where: { senderId_receiverId: { senderId: currentUserId, receiverId: friendId } },
        create: { senderId: currentUserId, receiverId: friendId, status: 'ACCEPTED' },
        update: { status: 'ACCEPTED' }
      });

      await this.eventBus.emit('notification.create', {
        title: '好友申请已通过',
        type: 'SYSTEM',
        userId: friendId,
        content: `${updatedRequest.receiver.name} 接受了你的好友请求。`,
        payload: { id: currentUserId, type: 'friendship_accepted' }
      });

      return { ...updatedRequest, friend: updatedRequest.sender };
    });
  }

  /**
   * 查询好友关系列表
   */
  async findAll(
    userId: string,
    whereData: Omit<PrismaTypes.Prisma.FriendshipWhereInput, 'senderId'>,
    { take, skip }: PaginationOptions
  ) {
    const { page, limit, ...clearWhere } = whereData as any;
    const where = {
      ...clearWhere,
      senderId: userId,
      status: clearWhere.status || 'ACCEPTED'
    };

    const [data, total] = await Promise.all([
      this.prisma.friendship.findMany({
        where,
        take,
        skip,
        include: { receiver: true },
        orderBy: { updatedAt: 'desc' }
      }),
      this.prisma.friendship.count({ where })
    ]);

    return new PaginationData(data.map(i => ({ ...i, friend: i.receiver })), { total, limit, page });
  }

  /**
   * 查找单个好友关系
   */
  async findOne(userId: string, friendId: string) {
    let record = await this.prisma.friendship.findUnique({
      where: { senderId_receiverId: { senderId: userId, receiverId: friendId } },
      include: { sender: true, receiver: true }
    });

    if (!record) {
      record = await this.prisma.friendship.findFirst({
        where: { senderId: friendId, receiverId: userId },
        include: { sender: true, receiver: true }
      });
    }

    if (!record) return null;
    return { ...record, friend: record.senderId === userId ? record.receiver : record.sender };
  }

  /**
   * 通用更新逻辑
   */
  async update(
    currentUserId: string,
    friendId: string,
    data: PrismaTypes.Prisma.FriendshipUpdateInput
  ) {
    if (data.status === 'REJECTED') {
      const incoming = await this.prisma.friendship.findUnique({
        where: { senderId_receiverId: { senderId: friendId, receiverId: currentUserId } }
      });
      if (!incoming) throw new BadRequestException('找不到对应的申请记录');
      return this.prisma.friendship.update({
        where: { id: incoming.id },
        data: { status: 'REJECTED' },
        include: { sender: true }
      }).then(i => ({ ...i, friend: i.sender }));
    }

    // 针对自己视角的记录进行更新
    return this.prisma.friendship.upsert({
      where: { senderId_receiverId: { senderId: currentUserId, receiverId: friendId } },
      create: {
        senderId: currentUserId,
        receiverId: friendId,
        status: (data.status as any) || 'ACCEPTED'
      },
      update: data,
      include: { receiver: true }
    }).then(i => ({ ...i, friend: i.receiver }));
  }

  /**
   * 删除好友
   */
  async remove(userId: string, friendId: string) {
    const record = await this.prisma.friendship.findUnique({
      where: { senderId_receiverId: { senderId: userId, receiverId: friendId } },
      include: { receiver: true }
    });

    return await this.prisma.$transaction(async (tx) => {
      if (record) await tx.friendship.delete({ where: { id: record.id } });
      await tx.friendship.deleteMany({ where: { senderId: friendId, receiverId: userId } });
      return record ? { ...record, friend: record.receiver } : null;
    });
  }
}