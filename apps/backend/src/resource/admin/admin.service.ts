import { BadRequestException, ForbiddenException, Injectable } from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service'
import { AdminFieldSchema, AdminLookupItem, AdminTableName, AdminTableSchema, PaginationData, PrismaValues } from '@junction/types'
import { PaginationOptions } from '~/decorators/pagination.decorator'
import { StatusService } from '../status/status.service'

@Injectable()
export class AdminService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly statusService: StatusService
  ) { }

  private readonly databaseSchemas: Record<AdminTableName, AdminTableSchema> = {
    user: {
      name: 'user',
      label: '用户',
      primaryKey: 'id',
      allowCreate: false,
      allowUpdate: true,
      allowDelete: false,
      fields: [
        { name: 'id', label: 'ID', type: 'string', readOnly: true },
        { name: 'name', label: '名称', type: 'string', editable: true },
        { name: 'email', label: '邮箱', type: 'string', readOnly: true },
        { name: 'role', label: '角色', type: 'string', editable: true },
        { name: 'accountType', label: '账号类型', type: 'enum', editable: true, enumValues: Object.values(PrismaValues.UserAccountType) },
        { name: 'banned', label: '封禁', type: 'boolean', editable: true },
        { name: 'banReason', label: '封禁原因', type: 'string', editable: true },
        { name: 'createdAt', label: '创建时间', type: 'datetime', readOnly: true },
        { name: 'updatedAt', label: '更新时间', type: 'datetime', readOnly: true }
      ]
    },
    aiBot: {
      name: 'aiBot',
      label: '机器人',
      primaryKey: 'id',
      allowCreate: false,
      allowUpdate: true,
      allowDelete: false,
      fields: [
        { name: 'id', label: 'ID', type: 'string', readOnly: true },
        { name: 'userId', label: '用户ID', type: 'string', readOnly: true, relation: { table: 'user', valueField: 'id', labelField: 'name' } },
        { name: 'creatorId', label: '创建者ID', type: 'string', readOnly: true, relation: { table: 'user', valueField: 'id', labelField: 'name' } },
        { name: 'name', label: '名称', type: 'string', editable: true },
        { name: 'description', label: '描述', type: 'string', editable: true },
        { name: 'visibility', label: '可见性', type: 'enum', editable: true, enumValues: Object.values(PrismaValues.BotVisibility) },
        { name: 'status', label: '状态', type: 'enum', editable: true, enumValues: Object.values(PrismaValues.BotStatus) },
        { name: 'triggerMode', label: '触发方式', type: 'enum', editable: true, enumValues: Object.values(PrismaValues.BotTriggerMode) },
        { name: 'responseMode', label: '响应模式', type: 'enum', editable: true, enumValues: Object.values(PrismaValues.BotResponseMode) },
        { name: 'autoReplyInGroup', label: '群聊自动回复', type: 'boolean', editable: true },
        { name: 'systemPrompt', label: '系统提示词', type: 'string', editable: true },
        { name: 'temperature', label: '温度', type: 'number', editable: true },
        { name: 'maxTokens', label: '最大令牌', type: 'number', editable: true },
        { name: 'memoryLength', label: '记忆长度', type: 'number', editable: true },
        { name: 'model', label: '模型', type: 'string', editable: true },
        { name: 'apiBaseUrl', label: 'API 基础地址', type: 'string', editable: true },
        { name: 'orgDomain', label: '组织域名', type: 'string', editable: true },
        { name: 'createdAt', label: '创建时间', type: 'datetime', readOnly: true },
        { name: 'updatedAt', label: '更新时间', type: 'datetime', readOnly: true }
      ]
    },
    conversation: {
      name: 'conversation',
      label: '会话',
      primaryKey: 'id',
      allowCreate: false,
      allowUpdate: true,
      allowDelete: false,
      fields: [
        { name: 'id', label: 'ID', type: 'string', readOnly: true },
        { name: 'type', label: '类型', type: 'enum', readOnly: true, enumValues: Object.values(PrismaValues.ConversationType) },
        { name: 'title', label: '标题', type: 'string', editable: true },
        { name: 'ownerId', label: '拥有者ID', type: 'string', editable: true, relation: { table: 'user', valueField: 'id', labelField: 'name' } },
        { name: 'status', label: '状态', type: 'enum', editable: true, enumValues: Object.values(PrismaValues.ConversationStatus) },
        { name: 'isTemporary', label: '临时会话', type: 'boolean', editable: true },
        { name: 'createdAt', label: '创建时间', type: 'datetime', readOnly: true },
        { name: 'updatedAt', label: '更新时间', type: 'datetime', readOnly: true }
      ]
    },
    message: {
      name: 'message',
      label: '消息',
      primaryKey: 'id',
      allowCreate: false,
      allowUpdate: true,
      allowDelete: true,
      fields: [
        { name: 'id', label: 'ID', type: 'string', readOnly: true },
        { name: 'conversationId', label: '会话ID', type: 'string', readOnly: true, relation: { table: 'conversation', valueField: 'id', labelField: 'title' } },
        { name: 'senderId', label: '发送者ID', type: 'string', editable: true, relation: { table: 'user', valueField: 'id', labelField: 'name' } },
        { name: 'type', label: '类型', type: 'enum', editable: true, enumValues: Object.values(PrismaValues.MessageType) },
        { name: 'content', label: '内容', type: 'string', editable: true },
        { name: 'status', label: '状态', type: 'enum', editable: true, enumValues: Object.values(PrismaValues.MessageStatus) },
        { name: 'replyToId', label: '引用消息', type: 'string', editable: true, relation: { table: 'message', valueField: 'id', labelField: 'id' } },
        { name: 'createdAt', label: '创建时间', type: 'datetime', readOnly: true },
        { name: 'updatedAt', label: '更新时间', type: 'datetime', readOnly: true }
      ]
    },
    friendship: {
      name: 'friendship',
      label: '好友关系',
      primaryKey: 'id',
      allowCreate: false,
      allowUpdate: true,
      allowDelete: true,
      fields: [
        { name: 'id', label: 'ID', type: 'string', readOnly: true },
        { name: 'senderId', label: '发送者ID', type: 'string', readOnly: true, relation: { table: 'user', valueField: 'id', labelField: 'name' } },
        { name: 'receiverId', label: '接收者ID', type: 'string', readOnly: true, relation: { table: 'user', valueField: 'id', labelField: 'name' } },
        { name: 'status', label: '状态', type: 'enum', editable: true, enumValues: Object.values(PrismaValues.FriendshipStatus) },
        { name: 'isBlocked', label: '已拉黑', type: 'boolean', editable: true },
        { name: 'note', label: '备注', type: 'string', editable: true },
        { name: 'updatedAt', label: '更新时间', type: 'datetime', readOnly: true },
        { name: 'createdAt', label: '创建时间', type: 'datetime', readOnly: true }
      ]
    },
    notification: {
      name: 'notification',
      label: '通知',
      primaryKey: 'id',
      allowCreate: true,
      allowUpdate: true,
      allowDelete: true,
      fields: [
        { name: 'id', label: 'ID', type: 'string', readOnly: true },
        { name: 'type', label: '类型', type: 'enum', editable: true, enumValues: Object.values(PrismaValues.NotificationType) },
        { name: 'title', label: '标题', type: 'string', editable: true },
        { name: 'content', label: '内容', type: 'string', editable: true },
        { name: 'status', label: '状态', type: 'enum', editable: true, enumValues: Object.values(PrismaValues.NotificationStatus) },
        { name: 'processStatus', label: '处理状态', type: 'enum', editable: true, enumValues: Object.values(PrismaValues.NotificationProcessStatus) },
        { name: 'level', label: '等级', type: 'enum', editable: true, enumValues: Object.values(PrismaValues.NotificationLevel) },
        { name: 'userId', label: '用户ID', type: 'string', editable: true, relation: { table: 'user', valueField: 'id', labelField: 'name' } },
        { name: 'createdAt', label: '创建时间', type: 'datetime', readOnly: true },
        { name: 'updatedAt', label: '更新时间', type: 'datetime', readOnly: true }
      ]
    },
    emojiCategory: {
      name: 'emojiCategory',
      label: '表情分类',
      primaryKey: 'id',
      allowCreate: true,
      allowUpdate: true,
      allowDelete: true,
      fields: [
        { name: 'id', label: 'ID', type: 'string', readOnly: true },
        { name: 'name', label: '名称', type: 'string', editable: true },
        { name: 'description', label: '描述', type: 'string', editable: true },
        { name: 'status', label: '状态', type: 'enum', editable: true, enumValues: Object.values(PrismaValues.EmojiCategoryStatus) },
        { name: 'sortOrder', label: '排序', type: 'number', editable: true },
        { name: 'createdAt', label: '创建时间', type: 'datetime', readOnly: true },
        { name: 'updatedAt', label: '更新时间', type: 'datetime', readOnly: true }
      ]
    },
    emoji: {
      name: 'emoji',
      label: '表情',
      primaryKey: 'id',
      allowCreate: true,
      allowUpdate: true,
      allowDelete: true,
      fields: [
        { name: 'id', label: 'ID', type: 'string', readOnly: true },
        { name: 'name', label: '名称', type: 'string', editable: true },
        { name: 'description', label: '描述', type: 'string', editable: true },
        { name: 'keywords', label: '关键词', type: 'string', editable: true },
        { name: 'imageUrl', label: '图片地址', type: 'string', editable: true },
        { name: 'aiSummary', label: 'AI 摘要', type: 'string', editable: false },
        { name: 'aiTags', label: 'AI 关键词', type: 'string', editable: false },
        { name: 'aiText', label: 'AI 识别文字', type: 'string', editable: false },
        { name: 'aiMeta', label: 'AI 元数据', type: 'json', editable: false },
        { name: 'categoryId', label: '分类ID', type: 'string', editable: true, relation: { table: 'emojiCategory', valueField: 'id', labelField: 'name' } },
        { name: 'status', label: '状态', type: 'enum', editable: true, enumValues: Object.values(PrismaValues.EmojiStatus) },
        { name: 'sortOrder', label: '排序', type: 'number', editable: true },
        { name: 'usageCount', label: '使用次数', type: 'number', editable: true },
        { name: 'createdById', label: '创建者ID', type: 'string', editable: true, relation: { table: 'user', valueField: 'id', labelField: 'name' } },
        { name: 'sourceMessageId', label: '来源消息ID', type: 'string', editable: true, relation: { table: 'message', valueField: 'id', labelField: 'id' } },
        { name: 'createdAt', label: '创建时间', type: 'datetime', readOnly: true },
        { name: 'updatedAt', label: '更新时间', type: 'datetime', readOnly: true }
      ]
    },
    aiLog: {
      name: 'aiLog',
      label: 'AI 日志',
      primaryKey: 'id',
      allowCreate: false,
      allowUpdate: false,
      allowDelete: false,
      fields: [
        { name: 'id', label: 'ID', type: 'string', readOnly: true },
        { name: 'userId', label: '用户ID', type: 'string', readOnly: true, relation: { table: 'user', valueField: 'id', labelField: 'name' } },
        { name: 'provider', label: '提供方', type: 'string', readOnly: true },
        { name: 'model', label: '模型', type: 'string', readOnly: true },
        { name: 'request', label: '请求', type: 'json', readOnly: true },
        { name: 'response', label: '响应', type: 'json', readOnly: true },
        { name: 'createdAt', label: '创建时间', type: 'datetime', readOnly: true }
      ]
    }
  }

  private readonly databaseModelMap: Record<AdminTableName, keyof PrismaService> = {
    user: 'user',
    aiBot: 'aiBot',
    conversation: 'conversation',
    message: 'message',
    friendship: 'friendship',
    notification: 'notification',
    aiLog: 'aiLog',
    emoji: 'emoji',
    emojiCategory: 'emojiCategory'
  }

  private readonly databaseSearchFields: Record<AdminTableName, string[]> = {
    user: ['id', 'name', 'email'],
    aiBot: ['id', 'name', 'description', 'userId', 'creatorId'],
    conversation: ['id', 'title', 'ownerId'],
    message: ['id', 'conversationId', 'senderId', 'content'],
    friendship: ['id', 'senderId', 'receiverId', 'note'],
    notification: ['id', 'title', 'userId', 'content'],
    aiLog: ['id', 'userId', 'provider', 'model'],
    emoji: ['id', 'name', 'keywords', 'imageUrl', 'categoryId', 'aiSummary', 'aiTags', 'aiText'],
    emojiCategory: ['id', 'name', 'description']
  }

  private async assertAdmin(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, role: true, accountType: true }
    })
    const isAdmin = user?.role?.toLowerCase() === 'admin' || user?.accountType === PrismaValues.UserAccountType.ADMIN
    if (!isAdmin) throw new ForbiddenException('仅管理员可访问')
    return user
  }

  private getDatabaseSchema(table: AdminTableName) {
    const schema = this.databaseSchemas[table]
    if (!schema) throw new BadRequestException('无效数据表')
    return schema
  }

  private getTableClient(table: AdminTableName) {
    const model = this.databaseModelMap[table]
    if (!model) throw new BadRequestException('无效数据表')
    return this.prisma[model] as any
  }

  private getSelectableFields(schema: AdminTableSchema) {
    return schema.fields.reduce((acc, field) => {
      acc[field.name] = true
      return acc
    }, {} as Record<string, boolean>)
  }

  private buildKeywordWhere(table: AdminTableName, keyword?: string) {
    const trimmed = keyword?.trim()
    if (!trimmed) return undefined
    const fields = this.databaseSearchFields[table] || []
    if (!fields.length) return undefined
    return {
      OR: fields.map(field => ({ [field]: { contains: trimmed } }))
    }
  }

  private normalizeFieldValue(field: AdminFieldSchema, value: any) {
    if (value === undefined) return undefined
    if (value === null || value === '') {
      return field.required ? value : null
    }
    if (field.type === 'number') {
      const num = Number(value)
      if (Number.isNaN(num)) throw new BadRequestException(`字段 ${field.name} 不是有效数字`)
      return num
    }
    if (field.type === 'boolean') {
      if (value === true || value === false) return value
      if (value === 'true' || value === '1' || value === 1) return true
      if (value === 'false' || value === '0' || value === 0) return false
      throw new BadRequestException(`字段 ${field.name} 不是有效布尔值`)
    }
    if (field.type === 'datetime') {
      const date = new Date(value)
      if (Number.isNaN(date.getTime())) throw new BadRequestException(`字段 ${field.name} 不是有效时间`)
      return date
    }
    if (field.type === 'json') {
      if (typeof value === 'string') {
        const trimmed = value.trim()
        if (!trimmed) return null
        try {
          return JSON.parse(trimmed)
        } catch {
          throw new BadRequestException(`字段 ${field.name} 不是有效 JSON`)
        }
      }
      return value
    }
    if (field.type === 'enum') {
      if (field.enumValues && !field.enumValues.includes(String(value))) {
        throw new BadRequestException(`字段 ${field.name} 不是有效枚举值`)
      }
      return value
    }
    return value
  }

  private buildWriteData(schema: AdminTableSchema, payload: Record<string, any>) {
    const data: Record<string, any> = {}
    schema.fields.forEach((field) => {
      if (!field.editable || field.readOnly) return
      if (!Object.prototype.hasOwnProperty.call(payload, field.name)) return
      data[field.name] = this.normalizeFieldValue(field, payload[field.name])
    })
    return data
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
      notifications,
      emojis,
      emojiCategories
    ] = await Promise.all([
      this.prisma.user.count(),
      this.prisma.aiBot.count(),
      this.prisma.conversation.count(),
      this.prisma.message.count(),
      this.prisma.friendship.count(),
      this.prisma.notification.count(),
      this.prisma.emoji.count(),
      this.prisma.emojiCategory.count()
    ])
    return { users, bots, conversations, messages, friendships, notifications, emojis, emojiCategories }
  }

  async getDatabaseTables(userId: string) {
    await this.assertAdmin(userId)
    return Object.values(this.databaseSchemas)
  }

  async listDatabaseTable(userId: string, table: AdminTableName, pagination: PaginationOptions, keyword?: string) {
    await this.assertAdmin(userId)
    const schema = this.getDatabaseSchema(table)
    const model = this.getTableClient(table)
    const where = this.buildKeywordWhere(table, keyword)
    const select = this.getSelectableFields(schema)
    const [items, total] = await Promise.all([
      model.findMany({
        where,
        take: pagination.take,
        skip: pagination.skip,
        orderBy: { createdAt: 'desc' },
        select
      }),
      model.count({ where })
    ])
    return new PaginationData(items, { total, limit: pagination.limit, page: pagination.page })
  }

  async getDatabaseRow(userId: string, table: AdminTableName, id: string) {
    await this.assertAdmin(userId)
    const schema = this.getDatabaseSchema(table)
    const model = this.getTableClient(table)
    const select = this.getSelectableFields(schema)
    return model.findUnique({ where: { [schema.primaryKey]: id }, select })
  }

  async createDatabaseRow(userId: string, table: AdminTableName, payload: Record<string, any>) {
    await this.assertAdmin(userId)
    const schema = this.getDatabaseSchema(table)
    if (!schema.allowCreate) throw new ForbiddenException('该数据表不允许新增')
    const model = this.getTableClient(table)
    const data = this.buildWriteData(schema, payload)
    return model.create({ data })
  }

  async updateDatabaseRow(userId: string, table: AdminTableName, id: string, payload: Record<string, any>) {
    await this.assertAdmin(userId)
    const schema = this.getDatabaseSchema(table)
    if (!schema.allowUpdate) throw new ForbiddenException('该数据表不允许更新')
    const model = this.getTableClient(table)
    const data = this.buildWriteData(schema, payload)
    return model.update({ where: { [schema.primaryKey]: id }, data })
  }

  async deleteDatabaseRow(userId: string, table: AdminTableName, id: string) {
    await this.assertAdmin(userId)
    const schema = this.getDatabaseSchema(table)
    if (!schema.allowDelete) throw new ForbiddenException('该数据表不允许删除')
    const model = this.getTableClient(table)
    return model.delete({ where: { [schema.primaryKey]: id } })
  }

  async lookupDatabaseTable(userId: string, table: AdminTableName, keyword?: string, limit = 20): Promise<AdminLookupItem[]> {
    await this.assertAdmin(userId)
    const schema = this.getDatabaseSchema(table)
    const model = this.getTableClient(table)
    const where = this.buildKeywordWhere(table, keyword)
    const preferredLabels = ['name', 'title', 'email', 'model']
    const labelField = preferredLabels.find(field => schema.fields.some(item => item.name === field)) || schema.primaryKey
    const selectFields = new Set([schema.primaryKey, labelField])
    schema.fields.forEach((field) => {
      if (field.name === schema.primaryKey || field.name === labelField) return
      if (field.type === 'string') selectFields.add(field.name)
    })
    const select = Array.from(selectFields).reduce((acc, field) => {
      acc[field] = true
      return acc
    }, {} as Record<string, boolean>)
    const items = await model.findMany({
      where,
      take: limit,
      orderBy: { createdAt: 'desc' },
      select
    })
    return items.map((item: Record<string, any>) => {
      const label = item[labelField] ?? item[schema.primaryKey]
      const extra = { ...item }
      return { value: String(item[schema.primaryKey]), label: String(label), extra }
    })
  }
}
