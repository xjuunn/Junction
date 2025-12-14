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
    const receiverId = data.receiverId
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000)

    const existing = await this.prisma.friendship.findFirst({
      where: {
        OR: [
          { senderId: userId, receiverId },
          { senderId: receiverId, receiverId: userId }
        ]
      }
    })

    if (existing) {
      if (existing.status === 'ACCEPTED') {
        throw new BadRequestException('对方已是你的好友')
      }

      if (existing.senderId === userId && existing.createdAt > oneHourAgo) {
        throw new BadRequestException('每小时只能发送一次好友请求')
      }

      const result = await this.prisma.friendship.update({
        where: { id: existing.id },
        data: {
          status: 'PENDING',
          createdAt: new Date()
        },
        include: { sender: true, receiver: true }
      })

      await this.eventBus.emit('notification.create', {
        title: '好友请求',
        type: 'FRIEND_REQUEST',
        userId: result.receiverId,
        icon: 'mingcute:user-add-fill',
        cover: result.sender.image,
        content: `用户${result.sender.name}想要添加你为好友。`,
        payload: {
          id: result.senderId,
          type: 'friendship'
        }
      })

      return result
    }

    const result = await this.prisma.friendship.create({
      data: {
        ...data,
        senderId: userId,
        status: 'PENDING'
      },
      include: { sender: true, receiver: true }
    })

    await this.eventBus.emit('notification.create', {
      title: '好友请求',
      type: 'FRIEND_REQUEST',
      userId: result.receiverId,
      icon: 'mingcute:user-add-fill',
      cover: result.sender.image,
      content: `用户${result.sender.name}想要添加你为好友。`,
      payload: {
        id: result.senderId,
        type: 'friendship'
      }
    })

    return result
  }


  async findAll(
    userId: string,
    whereData: Omit<PrismaTypes.Prisma.FriendshipWhereInput, 'senderId'>,
    { take, skip }: PaginationOptions
  ) {
    const { page, limit, ...clearWhere } = whereData as any
    const where = {
      AND: [
        clearWhere,
        { OR: [{ senderId: userId }, { receiverId: userId }] }
      ]
    }
    const [data, total] = await Promise.all([
      this.prisma.friendship.findMany({
        where,
        take,
        skip,
        include: { sender: true, receiver: true }
      }),
      this.prisma.friendship.count({ where })
    ])
    const formatted = data.map(i => {
      const friend = i.senderId === userId ? i.receiver : i.sender
      return { ...i, friend }
    })
    return new PaginationData(formatted, { total, limit, page })
  }

  findOne(userId: string, friendId: string) {
    return this.prisma.friendship.findFirst({
      where: {
        OR: [
          { senderId: userId, receiverId: friendId },
          { senderId: friendId, receiverId: userId }
        ]
      },
      include: { sender: true, receiver: true }
    }).then(i => {
      if (!i) return null
      const friend = i.senderId === userId ? i.receiver : i.sender
      return { ...i, friend }
    })
  }

  async update(
    currentUserId: string,
    friendId: string,
    data: Omit<PrismaTypes.Prisma.FriendshipUpdateInput, 'senderId'>
  ) {
    const record = await this.prisma.friendship.findFirst({
      where: {
        OR: [
          { senderId: currentUserId, receiverId: friendId },
          { senderId: friendId, receiverId: currentUserId }
        ]
      }
    })
    if (!record) throw new BadRequestException('好友关系不存在')
    return this.prisma.friendship.update({
      where: { id: record.id },
      data,
      include: { sender: true, receiver: true }
    }).then(i => {
      const friend = i.senderId === currentUserId ? i.receiver : i.sender
      return { ...i, friend }
    })
  }

  async remove(userId: string, friendId: string) {
    const record = await this.prisma.friendship.findFirst({
      where: {
        OR: [
          { senderId: userId, receiverId: friendId },
          { senderId: friendId, receiverId: userId }
        ]
      }
    })
    if (!record) throw new BadRequestException('好友关系不存在')
    return this.prisma.friendship.delete({
      where: { id: record.id },
      include: { sender: true, receiver: true }
    }).then(i => {
      const friend = i.senderId === userId ? i.receiver : i.sender
      return { ...i, friend }
    })
  }

}
