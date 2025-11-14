import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { PaginationData, type PrismaTypes } from '@junction/types';
import { PaginationOptions } from '~/decorators/pagination.decorator';

@Injectable()
export class FriendshipService {
  constructor(
    private readonly prisma: PrismaService,
  ) { }

  create(
    userId: string,
    data: Omit<PrismaTypes.Prisma.FriendshipUncheckedCreateInput, 'senderId' | 'status'>
  ) {
    return this.prisma.friendship.create({
      data: {
        ...data,
        senderId: userId,
      },
      include: { receiver: true }
    });
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
