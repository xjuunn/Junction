import { BadRequestException, ForbiddenException, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { PaginationData, PrismaTypes, PrismaValues } from '@junction/types';
import { PaginationOptions } from '~/decorators/pagination.decorator';
import { StatusService } from '../status/status.service';

@Injectable()
export class ConversationService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly statusService: StatusService
  ) { }

  /**
   * 创建或获取会话
   */
  async create(userId: string, data: { type: 'PRIVATE' | 'GROUP'; targetId?: string; title?: string; avatar?: string; memberIds?: string[] }) {
    const currentUser = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, role: true, accountType: true, email: true }
    })
    if (data.type === 'PRIVATE') {
      if (!data.targetId) throw new BadRequestException('私聊必须指定目标用户');

      await this.assertBotVisibility(currentUser, data.targetId);

        const existing = await this.prisma.conversation.findFirst({
          where: {
            type: 'PRIVATE',
            AND: [
              { members: { some: { userId } } },
              { members: { some: { userId: data.targetId } } }
            ]
          },
          include: {
            members: {
              select: { userId: true, isActive: true }
            }
          }
        });

      if (existing) {
        const memberIds = existing.members.map(m => m.userId);
        const hasBoth = memberIds.includes(userId) && memberIds.includes(data.targetId);
        if (hasBoth) return this.findOne(userId, existing.id);
      }

      return await this.prisma.$transaction(async (tx) => {
        const conv = await tx.conversation.create({
          data: { type: 'PRIVATE' },
        });

        const members: PrismaTypes.Prisma.ConversationMemberCreateManyInput[] = [
          { conversationId: conv.id, userId, role: PrismaValues.ConversationMemberRole.OWNER },
          { conversationId: conv.id, userId: data.targetId!, role: PrismaValues.ConversationMemberRole.MEMBER }
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

      // 去重并过滤无效用户ID
      const uniqueMemberIds = [...new Set(data.memberIds || [])].filter(id => id && id !== userId);
      await this.assertBotVisibility(currentUser, uniqueMemberIds);

      const members: PrismaTypes.Prisma.ConversationMemberCreateManyInput[] = [
        { conversationId: conv.id, userId, role: PrismaValues.ConversationMemberRole.OWNER },
        ...uniqueMemberIds.map(id => ({
          conversationId: conv.id,
          userId: id,
          role: PrismaValues.ConversationMemberRole.MEMBER
        }))
      ];

      await tx.conversationMember.createMany({ data: members });
      return this.findOne(userId, conv.id, tx);
    });
  }

  /**
   * 获取当前用户的会话列表
   */
  async findAll(userId: string, { take, skip, page, limit }: PaginationOptions, type?: 'PRIVATE' | 'GROUP') {
    const where: any = { members: { some: { userId, isActive: true } } };
    if (type) {
      where.type = type;
    }

    const [data, total, blockedFriends] = await Promise.all([
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
            select: { userId: true, muted: true, pinned: true, role: true, joinedAt: true, isActive: true, lastReadMessageId: true }
          }
        },
        orderBy: { updatedAt: 'desc' }
      }),
      this.prisma.conversation.count({ where }),
      this.prisma.friendship.findMany({
        where: {
          OR: [
            { senderId: userId, status: 'BLOCKED' },
            { receiverId: userId, status: 'BLOCKED' }
          ]
        },
        select: { senderId: true, receiverId: true }
      })
    ]);

    const blockedUserIds = new Set(blockedFriends.flatMap(f => [f.senderId, f.receiverId]).filter(id => id !== userId));
    const filteredData = data.filter(conv => {
      if (conv.type !== 'PRIVATE') return true;
      const otherMemberId = conv.members.find(m => m.userId !== userId)?.userId;
      return otherMemberId && !blockedUserIds.has(otherMemberId);
    });

    const allMemberIds = [...new Set(filteredData.flatMap(c => c.members.map(m => m.userId)))];
    const onlineMap = await this.statusService.getStatuses(allMemberIds);
    await this.ensureBotOnline(allMemberIds, onlineMap);
    const unreadCountMap = await this.getUnreadCountMap(userId, filteredData);

    const formatted = await Promise.all(filteredData.map(conv => this.formatConversation(conv, userId, onlineMap, unreadCountMap)));
    return new PaginationData(formatted, { total: filteredData.length, limit, page });
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
          select: { userId: true, muted: true, pinned: true, role: true, lastReadMessageId: true, isActive: true }
        }
      }
    });

    if (!conv) throw new BadRequestException('会话不存在');

    const memberIds = conv.members.map(m => m.userId);
    const onlineMap = await this.statusService.getStatuses(memberIds);
    await this.ensureBotOnline(memberIds, onlineMap);
    const unreadCountMap = await this.getUnreadCountMap(userId, [conv]);

    return this.formatConversation(conv, userId, onlineMap, unreadCountMap);
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
   * 格式化会话视图
   */
  private async formatConversation(
    conv: any,
    currentUserId: string,
    onlineMap: Record<string, boolean> = {},
    unreadCountMap: Record<string, number> = {}
  ) {
    const mySettings = conv.members.find((m: any) => m.userId === currentUserId) || null;
    let { title, avatar } = conv;
    let online = 0;
    let otherUserId: string | null = null;
    let otherUserAccountType: string | null = null;

    if (conv.type === 'PRIVATE') {
      const otherMember = await this.prisma.conversationMember.findFirst({
        where: { conversationId: conv.id, userId: { not: currentUserId } },
        select: { userId: true, user: { select: { name: true, image: true, accountType: true } } }
      });
      if (otherMember) {
        const friendship = await this.prisma.friendship.findFirst({
          where: {
            OR: [
              { senderId: currentUserId, receiverId: otherMember.userId },
              { senderId: otherMember.userId, receiverId: currentUserId }
            ]
          },
          select: { note: true }
        });
        title = otherMember.user.name;
        if (friendship?.note && friendship.note.trim()) {
          title = friendship.note.trim();
        }
        avatar = otherMember.user.image;
        online = onlineMap[otherMember.userId] ? 1 : 0;
        otherUserId = otherMember.userId;
        otherUserAccountType = otherMember.user.accountType;
      }
    } else {
      online = conv.members.reduce((acc: number, m: any) => acc + (onlineMap[m.userId] ? 1 : 0), 0);
    }

    return {
      id: conv.id,
      type: conv.type,
      title,
      avatar,
      online,
      ownerId: conv.ownerId,
      status: conv.status,
      lastMessage: conv.lastMessage,
      memberCount: conv._count?.members || 0,
      mySettings,
      otherUserId,
      otherUserAccountType,
      unreadCount: unreadCountMap[conv.id] ?? 0,
      updatedAt: conv.updatedAt,
      createdAt: conv.createdAt
    };
  }

  /**
   * 计算未读数映射
   */
  private async getUnreadCountMap(
    userId: string,
    conversations: Array<{ id: string; members: Array<{ userId: string; lastReadMessageId?: string | null }> }>
  ) {
    if (!conversations.length) return {};

    const lastReadMap = new Map<string, string | null>();
    conversations.forEach(conv => {
      const member = conv.members.find(m => m.userId === userId);
      lastReadMap.set(conv.id, member?.lastReadMessageId ?? null);
    });

    const lastReadIds = [...new Set([...lastReadMap.values()].filter((id): id is string => !!id))];
    const readMessages = lastReadIds.length
      ? await this.prisma.message.findMany({
        where: { id: { in: lastReadIds } },
        select: { id: true, sequence: true }
      })
      : [];
    const seqMap = new Map(readMessages.map(m => [m.id, m.sequence]));

    const counts = await Promise.all(conversations.map(async conv => {
      const lastReadId = lastReadMap.get(conv.id);
      const lastReadSeq = lastReadId ? (seqMap.get(lastReadId) ?? 0) : 0;
      const unreadCount = await this.prisma.message.count({
        where: {
          conversationId: conv.id,
          senderId: { not: userId },
          status: PrismaValues.MessageStatus.NORMAL,
          sequence: { gt: lastReadSeq }
        }
      });
      return [conv.id, unreadCount] as const;
    }));

    const map: Record<string, number> = {};
    counts.forEach(([id, count]) => {
      map[id] = count;
    });

    return map;
  }

  /**
   * 获取在线成员
   */
  async getOnlineMembers(userId: string, conversationId: string) {
    const conversation = await this.prisma.conversation.findFirst({
      where: {
        id: conversationId,
        members: { some: { userId } }
      },
      select: {
        members: {
          select: {
            userId: true,
            user: {
              select: { id: true, name: true, image: true, role: true, accountType: true }
            }
          }
        }
      }
    });

    if (!conversation) throw new BadRequestException('会话不存在或无权限访问');

    const memberIds = conversation.members.map(m => m.userId);
    const onlineMap = await this.statusService.getStatuses(memberIds);
    await this.ensureBotOnline(memberIds, onlineMap);

    return conversation.members
      .filter(m => onlineMap[m.userId])
      .map(m => m.user);
  }

  /**
   * 获取群聊成员列表
   */
  async getMembers(userId: string, conversationId: string) {
    const conversation = await this.prisma.conversation.findFirst({
      where: {
        id: conversationId,
        type: 'GROUP',
        members: { some: { userId } }
      },
      select: {
        id: true,
        members: {
          select: {
            id: true,
            userId: true,
            role: true,
            muted: true,
            pinned: true,
            isActive: true,
            joinedAt: true,
            user: {
              select: { id: true, name: true, image: true, email: true, role: true, accountType: true }
            }
          },
          orderBy: { joinedAt: 'asc' }
        }
      }
    });

    if (!conversation) throw new BadRequestException('群聊不存在或无权限访问');

    const memberIds = conversation.members.map(m => m.userId);
    const onlineMap = await this.statusService.getStatuses(memberIds);
    await this.ensureBotOnline(memberIds, onlineMap);

    return conversation.members.map(member => ({
      ...member,
      user: {
        ...member.user,
        isOnline: onlineMap[member.userId] || false
      }
    }));
  }

  /**
   * 邀请成员加入群聊
   */
  async addMembers(userId: string, conversationId: string, memberIds: string[]) {
    // 检查权限：只有群主和管理员可以邀请成员
    const myMember = await this.prisma.conversationMember.findFirst({
      where: { conversationId, userId },
      select: { role: true }
    });

    if (!myMember || (myMember.role !== 'OWNER' && myMember.role !== 'ADMIN')) {
      throw new ForbiddenException('无权限邀请成员');
    }

    const conversation = await this.prisma.conversation.findUnique({
      where: { id: conversationId, type: 'GROUP' }
    });

    if (!conversation) throw new BadRequestException('群聊不存在');

    // 去重并过滤无效用户ID
    const uniqueMemberIds = [...new Set(memberIds || [])]
      .filter(id => id && id !== userId)
      .filter(id => id.trim() !== '');

    if (uniqueMemberIds.length === 0) {
      throw new BadRequestException('请提供有效的用户ID');
    }

    // 检查新成员是否已经是群成员
    const existingMembers = await this.prisma.conversationMember.findMany({
      where: { conversationId, userId: { in: uniqueMemberIds } },
      select: { userId: true }
    });

    const existingMemberIds = existingMembers.map(m => m.userId);
    const newMemberIds = uniqueMemberIds.filter(id => !existingMemberIds.includes(id));

    if (newMemberIds.length === 0) {
      throw new BadRequestException('所有用户都已经是群成员');
    }

    const currentUser = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, role: true, accountType: true, email: true }
    });

    await this.assertBotVisibility(currentUser, newMemberIds);

    // 添加新成员
    const newMembers = newMemberIds.map(userId => ({
      conversationId,
      userId,
      role: PrismaValues.ConversationMemberRole.MEMBER
    }));

    await this.prisma.conversationMember.createMany({ data: newMembers });

    // 返回更新后的成员列表
    return this.getMembers(userId, conversationId);
  }

  /**
   * 移除群聊成员
   */
  async removeMember(userId: string, conversationId: string, targetUserId: string) {
    // 检查权限
    const myMember = await this.prisma.conversationMember.findFirst({
      where: { conversationId, userId },
      select: { role: true }
    });

    const targetMember = await this.prisma.conversationMember.findFirst({
      where: { conversationId, userId: targetUserId },
      select: { role: true }
    });

    if (!myMember || !targetMember) {
      throw new BadRequestException('成员不存在');
    }

    // 群主可以移除任何成员（除了自己），管理员可以移除普通成员
    const canRemove =
      myMember.role === 'OWNER' ||
      (myMember.role === 'ADMIN' && targetMember.role === 'MEMBER');

    // 用户也可以主动退出群聊
    const isSelfRemove = userId === targetUserId;

    if (!canRemove && !isSelfRemove) {
      throw new ForbiddenException('无权限移除此成员');
    }

    // 群主不能退出自己创建的群（除非先转让群主）
    if (isSelfRemove && myMember.role === 'OWNER') {
      throw new ForbiddenException('群主不能退出群聊，请先转让群主权限');
    }

    await this.prisma.conversationMember.delete({
      where: { conversationId_userId: { conversationId, userId: targetUserId } }
    });

    return { success: true, message: isSelfRemove ? '已退出群聊' : '成员已移除' };
  }

  /**
   * 修改成员角色
   */
  async updateMemberRole(userId: string, conversationId: string, targetUserId: string, role: 'ADMIN' | 'MEMBER') {
    // 只有群主可以修改成员角色
    const myMember = await this.prisma.conversationMember.findFirst({
      where: { conversationId, userId },
      select: { role: true }
    });

    if (!myMember || myMember.role !== 'OWNER') {
      throw new ForbiddenException('只有群主可以修改成员角色');
    }

    const targetMember = await this.prisma.conversationMember.findFirst({
      where: { conversationId, userId: targetUserId },
      select: { role: true }
    });

    if (!targetMember) {
      throw new BadRequestException('成员不存在');
    }

    // 群主不能修改自己的角色
    if (userId === targetUserId) {
      throw new ForbiddenException('群主不能修改自己的角色');
    }

    await this.prisma.conversationMember.update({
      where: { conversationId_userId: { conversationId, userId: targetUserId } },
      data: { role: PrismaValues.ConversationMemberRole[role] }
    });

    return { success: true, message: '角色已更新' };
  }

  /**
   * 转让群主
   */
  async transferOwner(userId: string, conversationId: string, targetUserId: string) {
    const conversation = await this.prisma.conversation.findUnique({
      where: { id: conversationId, type: 'GROUP' },
      select: { id: true, ownerId: true }
    });
    if (!conversation) throw new BadRequestException('群聊不存在');
    if (conversation.ownerId !== userId) throw new ForbiddenException('只有群主可以转让群主');
    if (userId === targetUserId) throw new BadRequestException('不能将群主转让给自己');

    const targetMember = await this.prisma.conversationMember.findFirst({
      where: { conversationId, userId: targetUserId },
      select: { id: true }
    });
    if (!targetMember) throw new BadRequestException('目标成员不在群聊中');

    await this.prisma.$transaction(async (tx) => {
      await tx.conversation.update({
        where: { id: conversationId },
        data: { ownerId: targetUserId }
      });
      await tx.conversationMember.update({
        where: { conversationId_userId: { conversationId, userId } },
        data: { role: PrismaValues.ConversationMemberRole.MEMBER }
      });
      await tx.conversationMember.update({
        where: { conversationId_userId: { conversationId, userId: targetUserId } },
        data: { role: PrismaValues.ConversationMemberRole.OWNER }
      });
    });

    return { success: true, message: '群主已转让' };
  }

  /**
   * 更新群聊信息
   */
  async updateGroupInfo(userId: string, conversationId: string, data: { title?: string; avatar?: string }) {
    // 只有群主和管理员可以修改群聊信息
    const myMember = await this.prisma.conversationMember.findFirst({
      where: { conversationId, userId },
      select: { role: true }
    });

    if (!myMember || (myMember.role !== 'OWNER' && myMember.role !== 'ADMIN')) {
      throw new ForbiddenException('无权限修改群聊信息');
    }

    const conversation = await this.prisma.conversation.update({
      where: { id: conversationId, type: 'GROUP' },
      data: {
        ...(data.title && { title: data.title }),
        ...(data.avatar !== undefined && { avatar: data.avatar })
      },
      select: {
        id: true,
        type: true,
        title: true,
        avatar: true,
        updatedAt: true
      }
    });

    return conversation;
  }

  /**
   * 验证机器人可见性
   */
  private async assertBotVisibility(
    currentUser: { id: string; role?: string | null; accountType?: string | null; email?: string | null } | null,
    targetIds: string | string[]
  ) {
    if (!currentUser) throw new ForbiddenException('无权限访问');
    const ids = Array.isArray(targetIds) ? targetIds : [targetIds];
    if (!ids.length) return;

    const targets = await this.prisma.user.findMany({
      where: { id: { in: ids } },
      select: {
        id: true,
        accountType: true,
        botProfile: {
          select: { status: true, creatorId: true, visibility: true, orgDomain: true }
        }
      }
    });

    const domain = this.getEmailDomain(currentUser.email || '');
    const isAdmin = this.isAdmin(currentUser);
    for (const target of targets) {
      if (target.accountType !== 'BOT') continue;
      if (!target.botProfile || target.botProfile.status !== 'ACTIVE') {
        throw new ForbiddenException('机器人不可用');
      }
      if (isAdmin) continue;
      if (target.botProfile.creatorId === currentUser.id) continue;
      if (target.botProfile.visibility === 'PUBLIC') continue;
      if (target.botProfile.visibility === 'ORG' && domain && target.botProfile.orgDomain === domain) continue;
      throw new ForbiddenException('机器人不可见或无权限');
    }
  }

  private isAdmin(user: { role?: string | null; accountType?: string | null }) {
    return user.role?.toLowerCase() === 'admin' || user.accountType === 'ADMIN';
  }

  private getEmailDomain(email: string) {
    const parts = email.split('@');
    return parts.length === 2 ? parts[1].toLowerCase() : '';
  }

  private async ensureBotOnline(userIds: string[], onlineMap: Record<string, boolean>) {
    if (!userIds.length) return;
    const bots = await this.prisma.aiBot.findMany({
      where: {
        userId: { in: userIds },
        status: PrismaValues.BotStatus.ACTIVE,
        deletedAt: null
      },
      select: { userId: true }
    });
    if (!bots.length) return;
    await Promise.all(bots.map(bot => this.statusService.setOnline(bot.userId)));
    bots.forEach(bot => {
      onlineMap[bot.userId] = true;
    });
  }
}
