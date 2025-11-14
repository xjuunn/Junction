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
    data: PrismaTypes.Prisma.FriendshipUncheckedCreateInput
  ) {
    return this.prisma.friendship.create({
      data: {
        ...data,
        senderId: userId,
      },
      include: { receiver: true, sender: true }
    });
  }

  async findAll(
    userId: string,
    whereData: PrismaTypes.Prisma.FriendshipWhereInput,
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
        include: { receiver: true, sender: true },
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
      include: { sender: true, receiver: true },
    });
  }

  update(
    id: string,
    userId: string,
    data: PrismaTypes.Prisma.FriendshipUpdateInput
  ) {
    return this.prisma.friendship.update({
      where: { id, senderId: userId },
      data,
      include: { sender: true, receiver: true }
    })
  }

  remove(id: string, userId: string) {
    return this.prisma.friendship.delete({
      where: { id, senderId: userId },
      include: { sender: true, receiver: true }
    })
  }
}
