import { BadRequestException, ForbiddenException, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { PaginationData, PrismaTypes, PrismaValues } from '@junction/types';
import { PaginationOptions } from '~/decorators/pagination.decorator';

@Injectable()
export class MessageService {
  constructor(private readonly prisma: PrismaService) { }

  /**
   * 统一的消息查询字段定义
   */
  private readonly messageSelect = {
    id: true,
    type: true,
    content: true,
    payload: true,
    sequence: true,
    isEdited: true,
    status: true,
    createdAt: true,
    senderId: true,
    replyToId: true,
    clientMessageId: true,
    sender: { select: { id: true, name: true, image: true } },
    replyTo: {
      select: {
        id: true,
        content: true,
        type: true,
        sender: { select: { name: true } }
      }
    }
  } as const;

  /**
   * 发送消息：增加了参数清洗、成员状态自动激活及事务级权限校验
   */
  async create(userId: string, data: PrismaTypes.Prisma.MessageUncheckedCreateInput) {
    const conversationId = data.conversationId?.trim();
    const clientMessageId = data.clientMessageId?.trim();
    if (!conversationId) throw new BadRequestException('会话 ID 不能为空');
    const member = await this.prisma.conversationMember.findFirst({
      where: {
        conversationId,
        userId,
      },
      include: { conversation: true }
    });

    if (!member) throw new ForbiddenException('您不在此会话中');
    if (member.conversation.status === 'DISABLED') throw new ForbiddenException('该会话已被禁用');

    return await this.prisma.$transaction(async (tx) => {
      if (!member.isActive) {
        await tx.conversationMember.update({
          where: { id: member.id },
          data: { isActive: true }
        });
      }
      if (clientMessageId) {
        const existing = await tx.message.findUnique({
          where: { conversationId_clientMessageId: { conversationId, clientMessageId } },
          select: this.messageSelect
        });
        if (existing) return existing;
      }
      const lastMsg = await tx.message.findFirst({
        where: { conversationId },
        orderBy: { sequence: 'desc' },
        select: { sequence: true }
      });
      const nextSequence = (lastMsg?.sequence ?? 0) + 1;

      const message = await tx.message.create({
        data: {
          ...data,
          conversationId,
          clientMessageId,
          senderId: userId,
          sequence: nextSequence,
          status: PrismaValues.MessageStatus.NORMAL
        },
        select: this.messageSelect
      });

      await tx.conversation.update({
        where: { id: conversationId },
        data: { lastMessageId: message.id, updatedAt: new Date() }
      });

      return message;
    });
  }

  /**
   * 批量删除消息
   */
  async bulkDelete(userId: string, ids: string[]) {
    return this.prisma.message.updateMany({
      where: { id: { in: ids }, senderId: userId },
      data: { status: PrismaValues.MessageStatus.DELETED }
    });
  }

  /**
   * 分页查询消息记录
   */
  async findAll(userId: string, conversationId: string, { take, skip, page, limit }: PaginationOptions, cursor?: number) {
    const cleanId = conversationId?.trim();

    const isMember = await this.prisma.conversationMember.findFirst({
      where: { conversationId: cleanId, userId }
    });
    if (!isMember) throw new ForbiddenException('无权访问历史记录');

    const where: PrismaTypes.Prisma.MessageWhereInput = {
      conversationId: cleanId,
      sequence: cursor ? { lt: cursor } : undefined,
      status: { not: PrismaValues.MessageStatus.BLOCKED }
    };

    const [items, total] = await Promise.all([
      this.prisma.message.findMany({
        where,
        take,
        skip,
        orderBy: { sequence: 'desc' },
        select: this.messageSelect
      }),
      this.prisma.message.count({ where: { conversationId: cleanId } })
    ]);

    return new PaginationData(items.reverse(), { total, limit, page });
  }

  /**
   * 更新消息内容
   */
  async update(userId: string, messageId: string, content: string, payload?: any) {
    const message = await this.prisma.message.findUnique({
      where: { id: messageId },
      select: { senderId: true, status: true }
    });

    if (!message || message.senderId !== userId) throw new ForbiddenException('只能编辑自己的消息');

    return this.prisma.message.update({
      where: { id: messageId },
      data: { content, payload, isEdited: true },
      select: this.messageSelect
    });
  }

  /**
   * 撤回消息
   */
  async revoke(userId: string, messageId: string) {
    const message = await this.prisma.message.findUnique({
      where: { id: messageId },
      select: { senderId: true, createdAt: true }
    });

    if (!message || message.senderId !== userId) throw new ForbiddenException('无权撤回');

    return this.prisma.message.update({
      where: { id: messageId },
      data: {
        status: PrismaValues.MessageStatus.REVOKED,
        content: null as any,
        payload: null as any
      },
      select: this.messageSelect
    });
  }

  /**
   * 上报已读进度
   */
  async markAsRead(userId: string, conversationId: string, messageId: string) {
    const cleanId = conversationId?.trim();
    return this.prisma.conversationMember.update({
      where: { conversationId_userId: { conversationId: cleanId, userId } },
      data: { lastReadMessageId: messageId }
    });
  }

  /**
   * 会话内搜索
   */
  async search(userId: string, conversationId: string, query: string) {
    const cleanId = conversationId?.trim();
    return this.prisma.message.findMany({
      where: {
        conversationId: cleanId,
        content: { contains: query },
        status: PrismaValues.MessageStatus.NORMAL,
        conversation: { members: { some: { userId } } }
      },
      take: 50,
      orderBy: { sequence: 'desc' },
      select: this.messageSelect
    });
  }
}