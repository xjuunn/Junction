import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ApiTags } from '@nestjs/swagger';
import { PrismaTypes } from '@junction/types';

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

  findAll<T extends Partial<PrismaTypes.Friendship>>(data: T) {
    return this.prisma.friendship.findMany({
      where: data,
      include: { receiver: true, sender: true }
    });
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
