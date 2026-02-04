import { BadRequestException, ForbiddenException, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { PaginationData, PrismaTypes, PrismaValues } from '@junction/types';
import { PaginationOptions } from '~/decorators/pagination.decorator';
import { MessageGateway } from './message.gateway';

@Injectable()
export class MessageService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly messageGateway: MessageGateway
  ) { }

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
    conversationId: true,
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
   * 创建消息
   */
  async create(userId: string, data: PrismaTypes.Prisma.MessageUncheckedCreateInput) {
    const conversationId = data.conversationId?.trim();
    if (!conversationId) throw new BadRequestException('会话 ID 不能为空');

    const members = await this.prisma.conversationMember.findMany({
      where: { conversationId },
      select: { userId: true, isActive: true, id: true, user: { select: { id: true, name: true, image: true } } }
    });

    const isMember = members.find(m => m.userId === userId);
    if (!isMember) throw new ForbiddenException('您不在此会话中');

    const conversation = await this.prisma.conversation.findUnique({
      where: { id: conversationId },
      select: { type: true, ownerId: true }
    });

    if (conversation?.type === 'PRIVATE') {
      const otherMemberId = members.find(m => m.userId !== userId)?.userId;
      if (otherMemberId) {
        const friendship = await this.prisma.friendship.findFirst({
          where: {
            OR: [
              { senderId: userId, receiverId: otherMemberId },
              { senderId: otherMemberId, receiverId: userId }
            ]
          },
          select: { status: true }
        });
        if (friendship?.status === 'BLOCKED') {
          throw new ForbiddenException('无法与该用户发送消息');
        }
      }
    }

    const message = await this.prisma.$transaction(async (tx) => {
      if (!isMember.isActive) {
        await tx.conversationMember.update({ where: { id: isMember.id }, data: { isActive: true } });
      }

      const lastMsg = await tx.message.findFirst({
        where: { conversationId },
        orderBy: { sequence: 'desc' },
        select: { sequence: true }
      });

      const newMessage = await tx.message.create({
        data: {
          ...data,
          conversationId,
          senderId: userId,
          sequence: (lastMsg?.sequence ?? 0) + 1,
          status: PrismaValues.MessageStatus.NORMAL
        },
        select: this.messageSelect
      });

      await tx.conversation.update({
        where: { id: conversationId },
        data: { lastMessageId: newMessage.id, updatedAt: new Date() }
      });

      return newMessage;
    });

    const readInfoMap = await this.buildReadInfo([message], members, userId, conversation?.type);
    const enriched = { ...message, readInfo: readInfoMap[message.id] };

    this.messageGateway.broadcastToUsers(members.map(m => m.userId), 'new-message', enriched, userId);
    return enriched;
  }

  /**
   * 撤回消息
   */
  async revoke(userId: string, messageId: string) {
    const message = await this.prisma.message.findUnique({
      where: { id: messageId },
      select: { senderId: true, conversationId: true }
    });

    if (!message || message.senderId !== userId) throw new ForbiddenException('无权撤回');

    const revokedMessage = await this.prisma.message.update({
      where: { id: messageId },
      data: { status: PrismaValues.MessageStatus.REVOKED, content: null as any, payload: null as any },
      select: this.messageSelect
    });

    const members = await this.prisma.conversationMember.findMany({
      where: { conversationId: message.conversationId },
      select: { userId: true }
    });

    this.messageGateway.broadcastToUsers(members.map(m => m.userId), 'message-revoked', revokedMessage, userId);
    return revokedMessage;
  }

  /**
   * 编辑消息
   */
  async update(userId: string, messageId: string, content: string, payload?: any) {
    const message = await this.prisma.message.findUnique({
      where: { id: messageId },
      select: { senderId: true, status: true, conversationId: true }
    });

    if (!message || message.senderId !== userId) throw new ForbiddenException('只能编辑自己的消息');

    const updated = await this.prisma.message.update({
      where: { id: messageId },
      data: { content, payload, isEdited: true },
      select: this.messageSelect
    });

    const members = await this.prisma.conversationMember.findMany({
      where: { conversationId: message.conversationId },
      select: { userId: true }
    });

    this.messageGateway.broadcastToUsers(members.map(m => m.userId), 'message-updated', updated, userId);
    return updated;
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
   * 分页查询消息
   */
  async findAll(userId: string, conversationId: string, pagination: PaginationOptions, cursor?: number) {
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

    const [items, total, members, conversation] = await Promise.all([
      this.prisma.message.findMany({
        where,
        take: pagination.take,
        skip: pagination.skip,
        orderBy: { sequence: 'desc' },
        select: this.messageSelect
      }),
      this.prisma.message.count({ where: { conversationId: cleanId } }),
      this.prisma.conversationMember.findMany({
        where: { conversationId: cleanId },
        select: { userId: true, lastReadMessageId: true, user: { select: { id: true, name: true, image: true } } }
      }),
      this.prisma.conversation.findUnique({
        where: { id: cleanId },
        select: { type: true }
      })
    ]);

    const readInfoMap = await this.buildReadInfo(items, members, userId, conversation?.type);
    const enriched = items.map(item => ({
      ...item,
      readInfo: readInfoMap[item.id]
    }));

    return new PaginationData(enriched.reverse(), { total, limit: pagination.limit, page: pagination.page });
  }

  /**
   * 已读进度上报
   */
  async markAsRead(userId: string, conversationId: string, messageId: string) {
    const cleanId = conversationId?.trim();
    const message = await this.prisma.message.findFirst({
      where: { id: messageId, conversationId: cleanId },
      select: { id: true, sequence: true }
    });

    const result = await this.prisma.conversationMember.update({
      where: { conversationId_userId: { conversationId: cleanId, userId } },
      data: { lastReadMessageId: messageId }
    });

    if (message) {
      const members = await this.prisma.conversationMember.findMany({
        where: { conversationId: cleanId, isActive: true },
        select: { userId: true }
      });

      this.messageGateway.broadcastToUsers(members.map(m => m.userId), 'message-read', {
        conversationId: cleanId,
        messageId: message.id,
        userId,
        sequence: message.sequence,
        readAt: new Date().toISOString()
      });
    }

    return result;
  }

  /**
   * 会话内全文检索
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

  /**
   * 鏋勫缓娑堟伅宸茶淇℃伅
   */
  private async buildReadInfo(
    messages: Array<{ id: string; sequence: number; senderId: string | null }>,
    members: Array<{ userId: string; lastReadMessageId?: string | null; user?: { id: string; name: string; image: string | null } }>,
    currentUserId: string,
    conversationType?: string | null
  ) {
    const lastReadIds = [...new Set(members.map(m => m.lastReadMessageId).filter((id): id is string => !!id))];
    const readMessages = lastReadIds.length
      ? await this.prisma.message.findMany({
        where: { id: { in: lastReadIds } },
        select: { id: true, sequence: true }
      })
      : [];

    const seqMap = new Map(readMessages.map(m => [m.id, m.sequence]));
    const lastReadSeqMap = new Map<string, number>();
    members.forEach(m => {
      const seq = m.lastReadMessageId ? (seqMap.get(m.lastReadMessageId) ?? 0) : 0;
      lastReadSeqMap.set(m.userId, seq);
    });

    const infoMap: Record<string, any> = {};
    messages.forEach(message => {
      const targets = members.filter(m => m.userId !== message.senderId);
      const readMembers = targets.filter(m => (lastReadSeqMap.get(m.userId) ?? 0) >= message.sequence);
      const unreadMembers = targets.filter(m => (lastReadSeqMap.get(m.userId) ?? 0) < message.sequence);
      const isRead = message.senderId === currentUserId
        ? unreadMembers.length === 0
        : (lastReadSeqMap.get(currentUserId) ?? 0) >= message.sequence;

      if (conversationType === 'GROUP') {
        infoMap[message.id] = {
          isRead,
          readCount: readMembers.length,
          unreadCount: unreadMembers.length,
          readMembers: readMembers.map(m => m.user),
          unreadMembers: unreadMembers.map(m => m.user)
        };
      } else {
        infoMap[message.id] = {
          isRead,
          readCount: readMembers.length,
          unreadCount: unreadMembers.length
        };
      }
    });

    return infoMap;
  }
}
