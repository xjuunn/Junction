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
            select: { userId: true, muted: true, pinned: true, role: true, joinedAt: true, isActive: true }
          }
        },
        orderBy: { updatedAt: 'desc' }
      }),
      this.prisma.conversation.count({ where })
    ]);

    const allMemberIds = [...new Set(data.flatMap(c => c.members.map(m => m.userId)))];
    const onlineMap = await this.statusService.getStatuses(allMemberIds);

    const formatted = await Promise.all(data.map(conv => this.formatConversation(conv, userId, onlineMap)));
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
          select: { userId: true, muted: true, pinned: true, role: true, lastReadMessageId: true, isActive: true }
        }
      }
    });

    if (!conv) throw new BadRequestException('会话不存在');

    const memberIds = conv.members.map(m => m.userId);
    const onlineMap = await this.statusService.getStatuses(memberIds);

    return this.formatConversation(conv, userId, onlineMap);
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
  private async formatConversation(conv: any, currentUserId: string, onlineMap: Record<string, boolean> = {}) {
    const mySettings = conv.members.find((m: any) => m.userId === currentUserId) || null;
    let { title, avatar } = conv;
    let online = 0;
    let otherUserId: string | null = null;

    if (conv.type === 'PRIVATE') {
      const otherMember = await this.prisma.conversationMember.findFirst({
        where: { conversationId: conv.id, userId: { not: currentUserId } },
        select: { userId: true, user: { select: { name: true, image: true } } }
      });
      if (otherMember) {
        title = otherMember.user.name;
        avatar = otherMember.user.image;
        online = onlineMap[otherMember.userId] ? 1 : 0;
        otherUserId = otherMember.userId;
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
      updatedAt: conv.updatedAt,
      createdAt: conv.createdAt
    };
  }

  /**
   * 获取会话中所有在线成员详情
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
              select: { id: true, name: true, image: true, role: true }
            }
          }
        }
      }
    });

    if (!conversation) throw new BadRequestException('会话不存在或无权访问');

    const memberIds = conversation.members.map(m => m.userId);
    const onlineMap = await this.statusService.getStatuses(memberIds);

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
              select: { id: true, name: true, image: true, email: true, role: true }
            }
          },
          orderBy: { joinedAt: 'asc' }
        }
      }
    });

    if (!conversation) throw new BadRequestException('群聊不存在或无权访问');

    const memberIds = conversation.members.map(m => m.userId);
    const onlineMap = await this.statusService.getStatuses(memberIds);

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
}