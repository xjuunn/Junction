import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { PaginationData, PrismaTypes, PrismaValues } from '@junction/types';
import { PaginationOptions } from '~/decorators/pagination.decorator';
import { MessageGateway } from './message.gateway';
import { EventBus } from '../events/event-bus.service';

@Injectable()
export class MessageService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly messageGateway: MessageGateway,
    private readonly eventBus: EventBus
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
    sender: { select: { id: true, name: true, image: true, accountType: true } },
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
  async create(
    userId: string,
    data: Omit<PrismaTypes.Prisma.MessageUncheckedCreateInput, 'sequence' | 'senderId'> & {
      sequence?: number;
      senderId?: string | null;
    },
    options?: { emitEvent?: boolean }
  ) {
    const emitEvent = options?.emitEvent !== false;
    const conversationId = data.conversationId?.trim();
    if (!conversationId) throw new BadRequestException('会话 ID 不能为空');

    const members = await this.prisma.conversationMember.findMany({
      where: { conversationId },
      select: {
        userId: true,
        isActive: true,
        id: true,
        lastReadMessageId: true,
        user: {
          select: {
            id: true,
            name: true,
            image: true,
            accountType: true,
            botProfile: { select: { status: true } }
          }
        }
      }
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

    if (conversation?.type === 'PRIVATE') {
      const otherMember = members.find(m => m.userId !== userId);
      const botStatus = otherMember?.user?.botProfile?.status;
      if (otherMember && otherMember.user?.accountType === 'BOT' && botStatus === PrismaValues.BotStatus.ACTIVE) {
        await this.prisma.conversationMember.update({
          where: { conversationId_userId: { conversationId, userId: otherMember.userId } },
          data: { lastReadMessageId: message.id }
        });
        otherMember.lastReadMessageId = message.id;
        this.messageGateway.broadcastToUsers(members.map(m => m.userId), 'message-read', {
          conversationId,
          messageId: message.id,
          userId: otherMember.userId,
          sequence: message.sequence,
          readAt: new Date().toISOString()
        });
      }
    }

    const enrichedForSender = await this.buildMessageForUser(message, members as any, userId, conversation?.type);

    await Promise.all(
      members.map(async member => {
        const enriched = member.userId === userId
          ? enrichedForSender
          : await this.buildMessageForUser(message, members, member.userId, conversation?.type);
        this.messageGateway.broadcastToUsers([member.userId], 'new-message', enriched);
      })
    );

    if (emitEvent) {
      const senderIsBot = members.find(m => m.userId === userId)?.user?.accountType === 'BOT';
      if (!senderIsBot) {
        this.eventBus.emit('message.created', {
          messageId: enrichedForSender.id,
          conversationId: enrichedForSender.conversationId,
          senderId: enrichedForSender.senderId ?? null,
          type: enrichedForSender.type,
          content: enrichedForSender.content ?? null,
          payload: enrichedForSender.payload,
          isBotMessage: false
        });
      }
    }

    return enrichedForSender;
  }

  /**
   * 内部更新消息（机器人流式等场景）
   */
  async updateInternal(messageId: string, data: { content?: string | null; payload?: any }) {
    const updatedRaw = await this.prisma.message.update({
      where: { id: messageId },
      data: {
        ...(data.content !== undefined ? { content: data.content } : {}),
        ...(data.payload !== undefined ? { payload: data.payload } : {}),
        isEdited: false
      },
      select: this.messageSelect
    });

    const members = await this.prisma.conversationMember.findMany({
      where: { conversationId: updatedRaw.conversationId },
      select: { userId: true }
    });

    this.messageGateway.broadcastToUsers(members.map(m => m.userId), 'message-updated', updatedRaw);
    return updatedRaw;
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

    const revokedMessageRaw = await this.prisma.message.update({
      where: { id: messageId },
      data: { status: PrismaValues.MessageStatus.REVOKED, content: null as any, payload: null as any },
      select: this.messageSelect
    });
    const revokedMessage = (await this.attachRemarkToMessages([revokedMessageRaw], userId))[0];

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

    const updatedRaw = await this.prisma.message.update({
      where: { id: messageId },
      data: { content, payload, isEdited: true },
      select: this.messageSelect
    });
    const updated = (await this.attachRemarkToMessages([updatedRaw], userId))[0];

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
  async findAll(
    userId: string,
    conversationId: string,
    pagination: PaginationOptions,
    cursor?: number,
    direction: 'before' | 'after' = 'before'
  ) {
    const cleanId = conversationId?.trim();
    const isMember = await this.prisma.conversationMember.findFirst({
      where: { conversationId: cleanId, userId }
    });
    if (!isMember) throw new ForbiddenException('无权访问历史记录');

    const where: PrismaTypes.Prisma.MessageWhereInput = {
      conversationId: cleanId,
      sequence: cursor
        ? direction === 'after'
          ? { gt: cursor }
          : { lt: cursor }
        : undefined,
      status: { not: PrismaValues.MessageStatus.BLOCKED }
    };

    const [items, total, members, conversation] = await Promise.all([
      this.prisma.message.findMany({
        where,
        take: pagination.take,
        skip: pagination.skip,
        orderBy: { sequence: direction === 'after' ? 'asc' : 'desc' },
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
    const remarkMessages = await this.attachRemarkToMessages(items, userId);
    const enriched = remarkMessages.map(item => ({
      ...item,
      readInfo: readInfoMap[item.id]
    }));

    const ordered = direction === 'after' ? enriched : enriched.reverse();
    return new PaginationData(ordered, { total, limit: pagination.limit, page: pagination.page });
  }

  /**
   * 已读进度上报
   */

    /**
     * 获取指定消息的上下文
     */
    async getContext(
      userId: string,
      conversationId: string,
      messageId: string,
      options: { before?: number; after?: number }
    ) {
      const cleanId = conversationId?.trim();
      const isMember = await this.prisma.conversationMember.findFirst({
        where: { conversationId: cleanId, userId }
      });
      if (!isMember) throw new ForbiddenException('无权访问历史记录');

      const anchor = await this.prisma.message.findFirst({
        where: { id: messageId, conversationId: cleanId, status: { not: PrismaValues.MessageStatus.BLOCKED } },
        select: { id: true, sequence: true }
      });
      if (!anchor) throw new NotFoundException('消息不存在');

      const before = Math.max(0, Math.min(50, options.before ?? 20));
      const after = Math.max(0, Math.min(50, options.after ?? 20));
      const minSeq = Math.max(0, anchor.sequence - before);
      const maxSeq = anchor.sequence + after;

      const items = await this.prisma.message.findMany({
        where: {
          conversationId: cleanId,
          sequence: { gte: minSeq, lte: maxSeq },
          status: { not: PrismaValues.MessageStatus.BLOCKED }
        },
        orderBy: { sequence: 'asc' },
        select: this.messageSelect
      });

      const members = await this.prisma.conversationMember.findMany({
        where: { conversationId: cleanId },
        select: { userId: true, lastReadMessageId: true, user: { select: { id: true, name: true, image: true } } }
      });
      const conversation = await this.prisma.conversation.findUnique({
        where: { id: cleanId },
        select: { type: true }
      });

      const readInfoMap = await this.buildReadInfo(items, members, userId, conversation?.type);
      const remarkMessages = await this.attachRemarkToMessages(items, userId);
      const enriched = remarkMessages.map(item => ({
        ...item,
        readInfo: readInfoMap[item.id]
      }));

      const first = enriched[0];
      const last = enriched[enriched.length - 1];
      const [beforeCount, afterCount] = await Promise.all([
        first
          ? this.prisma.message.count({
            where: { conversationId: cleanId, sequence: { lt: first.sequence } }
          })
          : 0,
        last
          ? this.prisma.message.count({
            where: { conversationId: cleanId, sequence: { gt: last.sequence } }
          })
          : 0
      ]);

      return {
        items: enriched,
        anchorId: anchor.id,
        hasMoreBefore: beforeCount > 0,
        hasMoreAfter: afterCount > 0
      };
    }

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
    }).then(items => this.attachRemarkToMessages(items, userId));
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

  /**
   * 附加备注显示名称
   */
  private async attachRemarkToMessages<
    T extends { senderId: string | null; sender?: { id: string; name: string; image: string | null } | null }
  >(
    messages: T[],
    currentUserId: string
  ): Promise<T[]> {
    const senderIds = [...new Set(messages.map(m => m.senderId).filter((id): id is string => !!id && id !== currentUserId))];
    if (!senderIds.length) return messages;

    const friendships = await this.prisma.friendship.findMany({
      where: {
        OR: [
          { senderId: currentUserId, receiverId: { in: senderIds } },
          { receiverId: currentUserId, senderId: { in: senderIds } }
        ]
      },
      select: { senderId: true, receiverId: true, note: true }
    });

    const remarkMap = new Map<string, string>();
    friendships.forEach(f => {
      const otherId = f.senderId === currentUserId ? f.receiverId : f.senderId;
      if (f.note && f.note.trim()) remarkMap.set(otherId, f.note.trim());
    });

    return messages.map(message => {
      if (!message.sender || !message.senderId || message.senderId === currentUserId) return message;
      const remark = remarkMap.get(message.senderId);
      if (!remark) return message;
      return {
        ...message,
        sender: { ...message.sender, name: remark }
      } as T;
    });
  }

  /**
   * 鏍规嵁鎸囧畾鐢ㄦ埛鏋勫缓鍙箍鎾殑娑堟伅瀵硅薄
   */
  private async buildMessageForUser<
    T extends { id: string; sequence: number; senderId: string | null; sender?: { id: string; name: string; image: string | null } | null }
  >(
    message: T,
    members: Array<{ userId: string; lastReadMessageId?: string | null; user?: { id: string; name: string; image: string | null } }>,
    currentUserId: string,
    conversationType?: string | null
  ) {
    const readInfoMap = await this.buildReadInfo([message], members, currentUserId, conversationType);
    const remarkMessages = await this.attachRemarkToMessages([message], currentUserId);
    return { ...remarkMessages[0], readInfo: readInfoMap[message.id] };
  }

  /**
   * 导出消息记录归档
   */
  async exportArchive(userId: string, conversationIds?: string[]) {
    const ids = (conversationIds || []).map(id => id?.trim()).filter((id): id is string => !!id);
    const conversations = await this.prisma.conversation.findMany({
      where: {
        ...(ids.length ? { id: { in: ids } } : {}),
        members: { some: { userId, isActive: true } }
      },
      include: {
        members: { select: { userId: true, role: true } },
        _count: { select: { members: true } }
      }
    });

    const conversationIdList = conversations.map(conv => conv.id);
    const messages = conversationIdList.length
      ? await this.prisma.message.findMany({
        where: {
          conversationId: { in: conversationIdList },
          status: { not: PrismaValues.MessageStatus.BLOCKED }
        },
        orderBy: { sequence: 'asc' },
        select: {
          id: true,
          conversationId: true,
          type: true,
          content: true,
          payload: true,
          status: true,
          createdAt: true,
          senderId: true,
          clientMessageId: true,
          sequence: true,
          replyToId: true,
          moduleId: true,
          expiresAt: true,
          sender: { select: { id: true, name: true, image: true } }
        }
      })
      : [];

    const messageMap = new Map<string, any[]>();
    messages.forEach(message => {
      const list = messageMap.get(message.conversationId) || [];
      list.push(message);
      messageMap.set(message.conversationId, list);
    });

    return {
      version: 1,
      exportedAt: new Date().toISOString(),
      exportedBy: userId,
      conversations: conversations.map(conv => ({
        id: conv.id,
        type: conv.type,
        title: conv.title,
        avatar: conv.avatar,
        ownerId: conv.ownerId,
        memberCount: conv._count?.members || 0,
        createdAt: conv.createdAt,
        updatedAt: conv.updatedAt,
        members: conv.members.map(member => ({
          userId: member.userId,
          role: member.role
        })),
        messages: (messageMap.get(conv.id) || []).map(message => ({
          id: message.id,
          type: message.type,
          content: message.content,
          payload: message.payload,
          status: message.status,
          createdAt: message.createdAt,
          senderId: message.senderId,
          clientMessageId: message.clientMessageId,
          sequence: message.sequence,
          replyToId: message.replyToId,
          moduleId: message.moduleId,
          expiresAt: message.expiresAt,
          sender: message.sender
        }))
      }))
    };
  }

  /**
   * 导入消息记录归档
   */
  async importArchive(userId: string, payload: any) {
    const archive = this.normalizeArchivePayload(payload);
    const conversations = Array.isArray(archive?.conversations) ? archive.conversations : [];
    if (!conversations.length) {
      return { importedConversations: 0, skippedConversations: 0, importedMessages: 0, skippedMessages: 0 };
    }

    const requestedIds = conversations.map(item => item?.id).filter((id): id is string => !!id);
    const allowed = await this.prisma.conversation.findMany({
      where: { id: { in: requestedIds }, members: { some: { userId } } },
      select: { id: true }
    });
    const allowedSet = new Set(allowed.map(item => item.id));

    let importedConversations = 0;
    let skippedConversations = 0;
    let importedMessages = 0;
    let skippedMessages = 0;

    for (const conversation of conversations) {
      const conversationId = conversation?.id;
      if (!conversationId || !allowedSet.has(conversationId)) {
        skippedConversations += 1;
        skippedMessages += Array.isArray(conversation?.messages) ? conversation.messages.length : 0;
        continue;
      }

      const members = await this.prisma.conversationMember.findMany({
        where: { conversationId },
        select: { userId: true }
      });
      const memberSet = new Set(members.map(member => member.userId));
      const rawMessages = Array.isArray(conversation.messages) ? conversation.messages : [];
      const sorted = rawMessages.slice().sort((a: any, b: any) => {
        const seqA = Number(a?.sequence ?? 0);
        const seqB = Number(b?.sequence ?? 0);
        if (seqA && seqB) return seqA - seqB;
        const timeA = this.parseDateValue(a?.createdAt)?.getTime() || 0;
        const timeB = this.parseDateValue(b?.createdAt)?.getTime() || 0;
        return timeA - timeB;
      });

      const last = await this.prisma.message.findFirst({
        where: { conversationId },
        orderBy: { sequence: 'desc' },
        select: { sequence: true }
      });
      let nextSequence = last?.sequence ?? 0;
      const batchId = `import_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
      const data: PrismaTypes.Prisma.MessageCreateManyInput[] = [];

      sorted.forEach((message: any, index: number) => {
        const senderId = message?.senderId ?? null;
        if (senderId && !memberSet.has(senderId)) {
          skippedMessages += 1;
          return;
        }
        nextSequence += 1;
        data.push({
          conversationId,
          senderId,
          type: this.resolveMessageType(message?.type),
          content: message?.content ?? null,
          payload: message?.payload ?? null,
          status: this.resolveMessageStatus(message?.status),
          createdAt: this.parseDateValue(message?.createdAt) || new Date(),
          clientMessageId: `${batchId}_${index}`,
          sequence: nextSequence,
          moduleId: message?.moduleId ?? null,
          expiresAt: this.parseDateValue(message?.expiresAt) || null
        });
      });

      if (data.length) {
        await this.prisma.message.createMany({ data });
        importedMessages += data.length;
      }
      importedConversations += 1;

      const latest = await this.prisma.message.findFirst({
        where: { conversationId },
        orderBy: { sequence: 'desc' },
        select: { id: true }
      });
      if (latest) {
        await this.prisma.conversation.update({
          where: { id: conversationId },
          data: { lastMessageId: latest.id, updatedAt: new Date() }
        });
      }
    }

    return { importedConversations, skippedConversations, importedMessages, skippedMessages };
  }

  /**
   * 规范化归档结构
   */
  private normalizeArchivePayload(payload: any) {
    if (!payload) return null;
    if (payload.archive) return payload.archive;
    if (payload.success !== undefined && payload.data) return payload.data;
    return payload;
  }

  /**
   * 解析时间字段
   */
  private parseDateValue(value?: string | Date | null) {
    if (!value) return null;
    if (value instanceof Date) return value;
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) return null;
    return parsed;
  }

  /**
   * 解析消息类型
   */
  private resolveMessageType(value?: string) {
    if (!value) return PrismaValues.MessageType.TEXT;
    const upper = String(value).toUpperCase();
    return (PrismaValues.MessageType as any)[upper] || PrismaValues.MessageType.TEXT;
  }

  /**
   * 解析消息状态
   */
  private resolveMessageStatus(value?: string) {
    if (!value) return PrismaValues.MessageStatus.NORMAL;
    const upper = String(value).toUpperCase();
    return (PrismaValues.MessageStatus as any)[upper] || PrismaValues.MessageStatus.NORMAL;
  }
}
