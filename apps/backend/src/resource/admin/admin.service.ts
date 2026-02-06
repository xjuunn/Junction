import { ForbiddenException, Injectable } from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service'
import { PaginationData, PrismaValues } from '@junction/types'
import { PaginationOptions } from '~/decorators/pagination.decorator'
import { StatusService } from '../status/status.service'

@Injectable()
export class AdminService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly statusService: StatusService
  ) { }

  private async assertAdmin(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, role: true, accountType: true }
    })
    const isAdmin = user?.role?.toLowerCase() === 'admin' || user?.accountType === PrismaValues.UserAccountType.ADMIN
    if (!isAdmin) throw new ForbiddenException('仅管理员可访问')
    return user
  }

  async listUsers(userId: string, pagination: PaginationOptions, query: { keyword?: string; accountType?: string }) {
    await this.assertAdmin(userId)
    const keyword = query.keyword?.trim()
    const where: any = {
      ...(keyword ? {
        OR: [
          { id: { contains: keyword } },
          { name: { contains: keyword } },
          { email: { contains: keyword } }
        ]
      } : {}),
      ...(query.accountType ? { accountType: query.accountType } : {})
    }

    const [items, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        take: pagination.take,
        skip: pagination.skip,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          accountType: true,
          banned: true,
          createdAt: true,
          updatedAt: true
        }
      }),
      this.prisma.user.count({ where })
    ])
    return new PaginationData(items, { total, limit: pagination.limit, page: pagination.page })
  }

  async updateUser(userId: string, targetId: string, data: {
    role?: string
    accountType?: PrismaValues.UserAccountType
    banned?: boolean
    banReason?: string | null
  }) {
    await this.assertAdmin(userId)
    if (userId === targetId) {
      throw new ForbiddenException('管理员不可修改自身权限')
    }
    return this.prisma.user.update({
      where: { id: targetId },
      data: {
        ...(data.role !== undefined ? { role: data.role } : {}),
        ...(data.accountType !== undefined ? { accountType: data.accountType } : {}),
        ...(data.banned !== undefined ? { banned: data.banned } : {}),
        ...(data.banReason !== undefined ? { banReason: data.banReason } : {})
      },
      select: { id: true, name: true, role: true, accountType: true, banned: true, banReason: true }
    })
  }

  async getStatus(userId: string) {
    await this.assertAdmin(userId)
    const [totalUsers, totalBots, totalConversations, totalMessages, onlineCount] = await Promise.all([
      this.prisma.user.count({ where: { accountType: PrismaValues.UserAccountType.USER } }),
      this.prisma.user.count({ where: { accountType: PrismaValues.UserAccountType.BOT } }),
      this.prisma.conversation.count(),
      this.prisma.message.count(),
      this.statusService.getGlobalOnlineCount()
    ])
    return {
      totalUsers,
      totalBots,
      totalConversations,
      totalMessages,
      onlineCount
    }
  }

  async getDatabaseStats(userId: string) {
    await this.assertAdmin(userId)
    const [
      users,
      bots,
      conversations,
      messages,
      friendships,
      notifications
    ] = await Promise.all([
      this.prisma.user.count(),
      this.prisma.aiBot.count(),
      this.prisma.conversation.count(),
      this.prisma.message.count(),
      this.prisma.friendship.count(),
      this.prisma.notification.count()
    ])
    return { users, bots, conversations, messages, friendships, notifications }
  }
}
