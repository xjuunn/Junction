import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ApiTags } from '@nestjs/swagger';
import { PaginationData, PrismaTypes } from '@junction/types';
import { PaginationOptions } from '~/decorators/pagination.decorator';

@ApiTags("好友关系")
@Injectable()
export class FriendshipService {
  constructor(
    private readonly prisma: PrismaService,
  ) { }

  create<
    T extends { senderId: string, receiverId: string }
    & Partial<PrismaTypes.Friendship>
  >(data: T) {
    return this.prisma.friendship.create({
      data,
      include: { receiver: true, sender: true }
    });
  }

  async findAll<T extends Partial<PrismaTypes.Prisma.FriendshipWhereInput>>
    (userId: string, whereData: T, { take, skip }: PaginationOptions) {
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

  findOne(senderId: string, receiverId: string) {
    return this.prisma.friendship.findUnique({
      where: {
        senderId_receiverId: { senderId, receiverId }
      },
      include: { sender: true, receiver: true },
    });
  }

  update<T extends Partial<PrismaTypes.Friendship>>(id: string, data: T) {
    return this.prisma.friendship.update({
      where: { id },
      data,
      include: { sender: true, receiver: true }
    })
  }

  remove(id: string) {
    return this.prisma.friendship.delete({
      where: { id },
      include: { sender: true, receiver: true }
    })
  }
}
