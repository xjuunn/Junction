import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { PaginationData, PrismaTypes, PrsimaValues } from '@junction/types';
import { PaginationOptions } from '~/decorators/pagination.decorator';

@Injectable()
export class ConversationService {
  constructor(private readonly prisma: PrismaService) { }

  /**
   * 创建或获取会话
   */
  async create(userId: string, data: { type: 'PRIVATE' | 'GROUP'; targetId?: string; title?: string; avatar?: string; memberIds?: string[] }) {
    if (data.type === 'PRIVATE') {
      if (!data.targetId) throw new BadRequestException('私聊必须指定目标用户');

      const existing = await this.prisma.conversation.findFirst({
        where: {
          type: 'PRIVATE',
          members: { every: { userId: { in: [userId, data.targetId] } } }
        }
      });

      if (existing) return this.findOne(userId, existing.id);

      return await this.prisma.$transaction(async (tx) => {
        const conv = await tx.conversation.create({
          data: { type: 'PRIVATE' },
        });

        const members: PrismaTypes.Prisma.ConversationMemberCreateManyInput[] = [
          { conversationId: conv.id, userId, role: PrsimaValues.ConversationMemberRole.OWNER },
          { conversationId: conv.id, userId: data.targetId!, role: PrsimaValues.ConversationMemberRole.MEMBER }
        ];

        await tx.conversationMember.createMany({ data: members });
        return this.findOne(userId, conv.id, tx);
      });
    }

    return await this.prisma.$transaction(async (tx) => {
      const conv = await tx.conversation.create({
        data: {
          type: 'GROUP',
          title: data.title,
          avatar: data.avatar,
          ownerId: userId
        }
      });

      const members: PrismaTypes.Prisma.ConversationMemberCreateManyInput[] = [
        { conversationId: conv.id, userId, role: PrsimaValues.ConversationMemberRole.OWNER },
        ...(data.memberIds || []).map(id => ({
          conversationId: conv.id,
          userId: id,
          role: PrsimaValues.ConversationMemberRole.MEMBER
        }))
      ];

      await tx.conversationMember.createMany({ data: members });
      return this.findOne(userId, conv.id, tx);
    });
  }

  /**
   * 获取当前用户的会话列表
   */
  async findAll(userId: string, { take, skip, page, limit }: PaginationOptions) {
    const where = { members: { some: { userId, isActive: true } } };
    const [data, total] = await Promise.all([
      this.prisma.conversation.findMany({
        where,
        take,
        skip,
        include: {
          lastMessage: {
            select: { content: true, type: true, createdAt: true, sender: { select: { name: true } } }
          },
          _count: { select: { members: true } },
          members: {
            where: { userId },
            select: { muted: true, pinned: true, role: true, joinedAt: true }
          }
        },
        orderBy: { updatedAt: 'desc' }
      }),
      this.prisma.conversation.count({ where })
    ]);

    const formatted = await Promise.all(data.map(conv => this.formatConversation(conv, userId)));
    return new PaginationData(formatted, { total, limit, page });
  }

  /**
   * 获取单个会话详情
   */
  async findOne(userId: string, conversationId: string, tx?: any) {
    const client = tx || this.prisma;
    const conv = await client.conversation.findFirst({
      where: { id: conversationId, members: { some: { userId } } },
      include: {
        lastMessage: true,
        _count: { select: { members: true } },
        members: {
          where: { userId },
          select: { muted: true, pinned: true, role: true, lastReadMessageId: true }
        }
      }
    });

    if (!conv) throw new BadRequestException('会话不存在');
    return this.formatConversation(conv, userId);
  }

  /**
   * 更新会话成员个人偏好设置
   */
  async updateMember(userId: string, conversationId: string, data: PrismaTypes.Prisma.ConversationMemberUpdateInput) {
    return this.prisma.conversationMember.update({
      where: { conversationId_userId: { conversationId, userId } },
      data
    });
  }

  /**
   * 隐藏会话
   */
  async remove(userId: string, conversationId: string) {
    return this.prisma.conversationMember.update({
      where: { conversationId_userId: { conversationId, userId } },
      data: { isActive: false }
    });
  }

  /**
   * 格式化并补全会话视图信息
   */
  private async formatConversation(conv: any, currentUserId: string) {
    const mySettings = conv.members?.[0] || null;
    let { title, avatar } = conv;
    if (conv.type === 'PRIVATE') {
      const otherMember = await this.prisma.conversationMember.findFirst({
        where: { conversationId: conv.id, userId: { not: currentUserId } },
        select: { user: { select: { name: true, image: true } } }
      });
      if (otherMember?.user) {
        title = otherMember.user.name;
        avatar = otherMember.user.image;
      }
    }

    return {
      id: conv.id,
      type: conv.type,
      title,
      avatar,
      ownerId: conv.ownerId,
      status: conv.status,
      lastMessage: conv.lastMessage,
      memberCount: conv._count?.members || 0,
      mySettings,
      updatedAt: conv.updatedAt,
      createdAt: conv.createdAt
    };
  }
}