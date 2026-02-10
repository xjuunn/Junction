import { BadRequestException, ForbiddenException, Injectable, Logger } from '@nestjs/common'
import { randomUUID } from 'crypto'
import { PaginationOptions } from '~/decorators/pagination.decorator'
import { PrismaService } from '../prisma/prisma.service'
import { MessageService } from '../message/message.service'
import { StatusService } from '../status/status.service'
import { MessageGateway } from '../message/message.gateway'
import { PaginationData, PrismaTypes, PrismaValues } from '@junction/types'
import { decryptSecret, encryptSecret, maskSecret } from '~/utils/crypto'
import type { MessageCreatedEvent } from '../events/event-types'
import { McpRuntime, createDefaultMcpRegistry, type McpConfig } from './mcp'
import { generateAiText, streamAiText } from '~/utils/ai'
import { tool, jsonSchema, type ToolSet, type ToolChoice } from 'ai'

export interface CreateBotInput {
  name: string
  description?: string
  avatar?: string
  visibility?: PrismaValues.BotVisibility
  triggerMode?: PrismaValues.BotTriggerMode
  autoReplyInGroup?: boolean
  responseMode?: PrismaValues.BotResponseMode
  systemPrompt?: string
  temperature?: number
  maxTokens?: number
  memoryLength?: number
  humanizeEnabled?: boolean
  humanizeMinDelay?: number
  humanizeMaxDelay?: number
  humanizeChunkSize?: number
  humanizeCharMinMs?: number
  humanizeCharMaxMs?: number
  humanizeOverLimitThreshold?: number
  humanizeOverLimitDelayMs?: number
  tools?: any
  knowledgeBase?: any
  summaryEnabled?: boolean
  translationEnabled?: boolean
  apiKey?: string
  apiBaseUrl?: string
  model?: string
}

export interface UpdateBotInput extends Partial<CreateBotInput> {
  status?: PrismaValues.BotStatus
}

@Injectable()
export class AiBotService {
  private readonly logger = new Logger(AiBotService.name)
  private readonly replyGuards = new Map<string, { token: number }>()
  private readonly mcpRuntime = new McpRuntime(createDefaultMcpRegistry())

  constructor(
    private readonly prisma: PrismaService,
    private readonly messageService: MessageService,
    private readonly messageGateway: MessageGateway,
    private readonly statusService: StatusService
  ) { }

  async createBot(creatorId: string, input: CreateBotInput) {
    const creator = await this.prisma.user.findUnique({
      where: { id: creatorId },
      select: { id: true, email: true, role: true, accountType: true }
    })
    if (!creator) throw new BadRequestException('创建者不存在')
    if (creator.accountType === 'BOT') throw new ForbiddenException('机器人账户不可创建机器人')

    const normalized = this.normalizeBotInput(input)
    const name = normalized.name ?? ''
    if (!name) {
      throw new BadRequestException('机器人名称不能为空')
    }
    const visibility = normalized.visibility ?? PrismaValues.BotVisibility.PRIVATE
    const triggerMode = normalized.triggerMode ?? PrismaValues.BotTriggerMode.MENTION
    const responseMode = normalized.responseMode ?? PrismaValues.BotResponseMode.INSTANT
    const botId = randomUUID()
    const email = `bot+${botId}@bot.local`
    const apiKeyPayload = normalized.apiKey?.trim()
    const apiKeyEncrypted = apiKeyPayload ? encryptSecret(apiKeyPayload) : null
    const apiKeyHint = apiKeyPayload ? maskSecret(apiKeyPayload) : null

    const orgDomain = visibility === PrismaValues.BotVisibility.ORG
      ? this.getEmailDomain(creator.email)
      : null

    const result = await this.prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          id: botId,
          name,
          email,
          emailVerified: true,
          image: normalized.avatar || null,
          role: 'bot',
          accountType: PrismaValues.UserAccountType.BOT
        }
      })

      const bot = await tx.aiBot.create({
        data: {
          userId: user.id,
          creatorId: creatorId,
          name,
          description: normalized.description,
          avatar: normalized.avatar,
          visibility,
          status: PrismaValues.BotStatus.ACTIVE,
          triggerMode,
          autoReplyInGroup: normalized.autoReplyInGroup ?? false,
          responseMode,
          systemPrompt: normalized.systemPrompt,
          temperature: normalized.temperature,
          maxTokens: normalized.maxTokens,
          memoryLength: normalized.memoryLength,
          humanizeEnabled: normalized.humanizeEnabled ?? false,
          humanizeMinDelay: normalized.humanizeMinDelay ?? 300,
          humanizeMaxDelay: normalized.humanizeMaxDelay ?? 900,
          humanizeChunkSize: normalized.humanizeChunkSize ?? 60,
          humanizeCharMinMs: normalized.humanizeCharMinMs ?? 200,
          humanizeCharMaxMs: normalized.humanizeCharMaxMs ?? 800,
          humanizeOverLimitThreshold: normalized.humanizeOverLimitThreshold ?? 10,
          humanizeOverLimitDelayMs: normalized.humanizeOverLimitDelayMs ?? 5000,
          deletedAt: null,
          tools: normalized.tools,
          knowledgeBase: normalized.knowledgeBase,
          summaryEnabled: normalized.summaryEnabled,
          translationEnabled: normalized.translationEnabled,
          apiKeyEncrypted,
          apiKeyHint,
          apiBaseUrl: normalized.apiBaseUrl,
          model: normalized.model,
          orgDomain
        }
      })

      await tx.friendship.upsert({
        where: { senderId_receiverId: { senderId: creatorId, receiverId: user.id } },
        create: { senderId: creatorId, receiverId: user.id, status: 'ACCEPTED' },
        update: { status: 'ACCEPTED' }
      })

      await tx.friendship.upsert({
        where: { senderId_receiverId: { senderId: user.id, receiverId: creatorId } },
        create: { senderId: user.id, receiverId: creatorId, status: 'ACCEPTED' },
        update: { status: 'ACCEPTED' }
      })

      return { user, bot }
    })

    if (result.bot.status === PrismaValues.BotStatus.ACTIVE) {
      await this.statusService.setOnline(result.bot.userId)
    }

    return this.formatBot(result.bot)
  }

  async updateBot(currentUserId: string, botId: string, input: UpdateBotInput) {
    const [currentUser, bot] = await Promise.all([
      this.prisma.user.findUnique({
        where: { id: currentUserId },
        select: { id: true, role: true, accountType: true, email: true }
      }),
      this.prisma.aiBot.findUnique({
        where: { id: botId },
        include: { user: true }
      })
    ])

    if (!bot || bot.deletedAt) throw new BadRequestException('机器人不存在')
    if (!currentUser) throw new ForbiddenException('无权限操作')

    const isAdmin = this.isAdmin(currentUser)
    if (!isAdmin && bot.creatorId !== currentUserId) {
      throw new ForbiddenException('仅创建者可编辑机器人')
    }

    const normalized = this.normalizeBotInput(input)
    const updateData: PrismaTypes.Prisma.AiBotUpdateInput = {
      ...(normalized.name ? { name: normalized.name } : {}),
      ...(normalized.description !== undefined ? { description: normalized.description } : {}),
      ...(normalized.avatar !== undefined ? { avatar: normalized.avatar } : {}),
      ...(normalized.visibility ? { visibility: normalized.visibility } : {}),
      ...(normalized.triggerMode ? { triggerMode: normalized.triggerMode } : {}),
      ...(normalized.autoReplyInGroup !== undefined ? { autoReplyInGroup: normalized.autoReplyInGroup } : {}),
      ...(normalized.responseMode !== undefined ? { responseMode: normalized.responseMode } : {}),
      ...(normalized.systemPrompt !== undefined ? { systemPrompt: normalized.systemPrompt } : {}),
      ...(normalized.temperature !== undefined ? { temperature: normalized.temperature } : {}),
      ...(normalized.maxTokens !== undefined ? { maxTokens: normalized.maxTokens } : {}),
      ...(normalized.memoryLength !== undefined ? { memoryLength: normalized.memoryLength } : {}),
      ...(normalized.humanizeEnabled !== undefined ? { humanizeEnabled: normalized.humanizeEnabled } : {}),
      ...(normalized.humanizeMinDelay !== undefined ? { humanizeMinDelay: normalized.humanizeMinDelay } : {}),
      ...(normalized.humanizeMaxDelay !== undefined ? { humanizeMaxDelay: normalized.humanizeMaxDelay } : {}),
      ...(normalized.humanizeChunkSize !== undefined ? { humanizeChunkSize: normalized.humanizeChunkSize } : {}),
      ...(normalized.humanizeCharMinMs !== undefined ? { humanizeCharMinMs: normalized.humanizeCharMinMs } : {}),
      ...(normalized.humanizeCharMaxMs !== undefined ? { humanizeCharMaxMs: normalized.humanizeCharMaxMs } : {}),
      ...(normalized.humanizeOverLimitThreshold !== undefined ? { humanizeOverLimitThreshold: normalized.humanizeOverLimitThreshold } : {}),
      ...(normalized.humanizeOverLimitDelayMs !== undefined ? { humanizeOverLimitDelayMs: normalized.humanizeOverLimitDelayMs } : {}),
      ...(normalized.tools !== undefined ? { tools: normalized.tools } : {}),
      ...(normalized.knowledgeBase !== undefined ? { knowledgeBase: normalized.knowledgeBase } : {}),
      ...(normalized.summaryEnabled !== undefined ? { summaryEnabled: normalized.summaryEnabled } : {}),
      ...(normalized.translationEnabled !== undefined ? { translationEnabled: normalized.translationEnabled } : {}),
      ...(normalized.apiBaseUrl !== undefined ? { apiBaseUrl: normalized.apiBaseUrl } : {}),
      ...(normalized.model !== undefined ? { model: normalized.model } : {}),
      ...(input.status ? { status: input.status } : {})
    }

    if (normalized.visibility === PrismaValues.BotVisibility.ORG) {
      updateData.orgDomain = updateData.orgDomain ?? this.getEmailDomain(currentUser.email || '')
    } else if (normalized.visibility) {
      updateData.orgDomain = null
    }

    if (normalized.apiKey !== undefined) {
      const trimmed = normalized.apiKey?.trim() || ''
      updateData.apiKeyEncrypted = trimmed ? encryptSecret(trimmed) : null
      updateData.apiKeyHint = trimmed ? maskSecret(trimmed) : null
    }

    const updated = await this.prisma.$transaction(async (tx) => {
      if (normalized.name || normalized.avatar !== undefined) {
        await tx.user.update({
          where: { id: bot.userId },
          data: {
            ...(normalized.name ? { name: normalized.name } : {}),
            ...(normalized.avatar !== undefined ? { image: normalized.avatar } : {})
          }
        })
      }
      return tx.aiBot.update({
        where: { id: botId },
        data: updateData
      })
    })

    if (updateData.status === PrismaValues.BotStatus.ACTIVE) {
      await this.statusService.setOnline(bot.userId)
    } else if (updateData.status === PrismaValues.BotStatus.DISABLED) {
      await this.statusService.setOffline(bot.userId)
    }

    return this.formatBot(updated)
  }

  async deleteBot(currentUserId: string, botId: string) {
    const [currentUser, bot] = await Promise.all([
      this.prisma.user.findUnique({
        where: { id: currentUserId },
        select: { id: true, role: true, accountType: true }
      }),
      this.prisma.aiBot.findUnique({
        where: { id: botId }
      })
    ])
    if (!bot || bot.deletedAt) throw new BadRequestException('机器人不存在')
    if (!currentUser) throw new ForbiddenException('无权限操作')
    const isAdmin = this.isAdmin(currentUser)
    if (!isAdmin && bot.creatorId !== currentUserId) {
      throw new ForbiddenException('仅创建者可删除机器人')
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.aiBot.update({
        where: { id: botId },
        data: {
          status: PrismaValues.BotStatus.DISABLED,
          visibility: PrismaValues.BotVisibility.PRIVATE,
          deletedAt: new Date()
        }
      })
      await tx.conversationMember.deleteMany({
        where: { userId: bot.userId }
      })
      await tx.friendship.deleteMany({
        where: {
          OR: [
            { senderId: bot.userId },
            { receiverId: bot.userId }
          ]
        }
      })
    })
    await this.statusService.setOffline(bot.userId)
    return { success: true }
  }

  async findOne(currentUserId: string, botId: string) {
    const [currentUser, bot] = await Promise.all([
      this.prisma.user.findUnique({
        where: { id: currentUserId },
        select: { id: true, role: true, accountType: true, email: true }
      }),
      this.prisma.aiBot.findUnique({
        where: { id: botId }
      })
    ])
    if (!currentUser || !bot || bot.deletedAt) throw new BadRequestException('机器人不存在')

    if (!this.canViewBot(currentUser, bot)) {
      throw new ForbiddenException('无权限访问该机器人')
    }

    return this.formatBot(bot)
  }

  async listBots(currentUserId: string, pagination: PaginationOptions, query: {
    keyword?: string
    mine?: boolean
    visibility?: PrismaValues.BotVisibility
    includeDisabled?: boolean
  }) {
    const currentUser = await this.prisma.user.findUnique({
      where: { id: currentUserId },
      select: { id: true, role: true, accountType: true, email: true }
    })
    if (!currentUser) throw new ForbiddenException('无权限访问')

    const isAdmin = this.isAdmin(currentUser)
    const domain = this.getEmailDomain(currentUser.email || '')
    const keyword = query.keyword?.trim()
    const mine = query.mine === true || query.mine === ('true' as any)

    const filters: PrismaTypes.Prisma.AiBotWhereInput[] = []
    if (!query.includeDisabled) {
      filters.push({ status: PrismaValues.BotStatus.ACTIVE })
    }
    filters.push({ deletedAt: null })
    if (keyword) {
      filters.push({
        OR: [
          { name: { contains: keyword } },
          { description: { contains: keyword } },
          { userId: { contains: keyword } }
        ]
      })
    }
    if (query.visibility) {
      filters.push({ visibility: query.visibility })
    }
    if (!isAdmin) {
      if (mine) {
        filters.push({ creatorId: currentUserId })
      } else {
        filters.push({
          OR: [
            { creatorId: currentUserId },
            { visibility: PrismaValues.BotVisibility.PUBLIC },
            ...(domain ? [{ visibility: PrismaValues.BotVisibility.ORG, orgDomain: domain }] : [])
          ]
        })
      }
    }

    const where: PrismaTypes.Prisma.AiBotWhereInput = filters.length ? { AND: filters } : {}

    const [items, total] = await Promise.all([
      this.prisma.aiBot.findMany({
        where,
        take: pagination.take,
        skip: pagination.skip,
        orderBy: { updatedAt: 'desc' }
      }),
      this.prisma.aiBot.count({ where })
    ])

    return new PaginationData(items.map(bot => this.formatBot(bot)), {
      total,
      limit: pagination.limit,
      page: pagination.page
    })
  }

  async handleMessageCreated(event: MessageCreatedEvent) {
    if (!event || !event.conversationId || event.isBotMessage) return
    if (!event.content && !event.payload) return
    if (![PrismaValues.MessageType.TEXT, PrismaValues.MessageType.RICH_TEXT, PrismaValues.MessageType.EMOJI].includes(event.type as any)) return
    const conversation = await this.prisma.conversation.findUnique({
      where: { id: event.conversationId },
      select: {
        id: true,
        type: true,
        members: {
          select: {
            userId: true,
            user: {
              select: {
                id: true,
                name: true,
                accountType: true,
                botProfile: {
                  select: {
                    id: true,
                    userId: true,
                    name: true,
                    description: true,
                    avatar: true,
                    visibility: true,
                    status: true,
                    triggerMode: true,
                    autoReplyInGroup: true,
                    responseMode: true,
                    systemPrompt: true,
                    temperature: true,
                    maxTokens: true,
                    memoryLength: true,
                    humanizeEnabled: true,
                    humanizeMinDelay: true,
                    humanizeMaxDelay: true,
                    humanizeChunkSize: true,
                    humanizeCharMinMs: true,
                    humanizeCharMaxMs: true,
                    humanizeOverLimitThreshold: true,
                    humanizeOverLimitDelayMs: true,
                    tools: true,
                    knowledgeBase: true,
                    summaryEnabled: true,
                    translationEnabled: true,
                    apiKeyEncrypted: true,
                    apiKeyHint: true,
                    apiBaseUrl: true,
                    model: true,
                    creatorId: true,
                    orgDomain: true,
                    createdAt: true,
                    updatedAt: true
                  }
                }
              }
            }
          }
        }
      }
    })
    if (!conversation) return

    const senderId = event.senderId
    const senderMember = conversation.members.find(m => m.userId === senderId)
    const senderName = senderMember?.user?.name || '用户'

    const payloadText = this.extractPlainTextFromPayload(event.payload)
    const eventText = `${event.content || ''}\n${payloadText}`.trim()

    const botUserIds = conversation.members
      .map(m => m.user.botProfile?.userId)
      .filter((id): id is string => !!id)
      .filter(id => id !== senderId)

    if (!botUserIds.length) return

    const bots = await this.prisma.aiBot.findMany({
      where: {
        userId: { in: botUserIds },
        status: PrismaValues.BotStatus.ACTIVE
      }
    })

    if (!bots.length) return

    for (const bot of bots) {
      this.bumpReplyGuard(bot.id, conversation.id)
      const triggerText = eventText
      const isMentioned = this.isBotMentioned(triggerText, bot.name, bot.userId)
      const isGroup = conversation.type === 'GROUP'
      const shouldTrigger = isGroup
        ? (isMentioned || (bot.triggerMode === PrismaValues.BotTriggerMode.AUTO && bot.autoReplyInGroup !== false))
        : true
      if (!shouldTrigger) continue

      try {
        await this.replyAsBot(bot, conversation.id, senderName)
      } catch (error: any) {
        this.logger.error(`机器人回复失败: ${error?.message || error}`)
        await this.sendBotErrorMessage(bot, conversation.id)
      }
    }
  }

  private async replyAsBot(bot: PrismaTypes.AiBot, conversationId: string, senderName: string) {
    const guard = this.getReplyGuard(bot.id, conversationId)
    const memoryLength = this.clampNumber(bot.memoryLength ?? 20, 1, 80)
    const memoryCutoff = bot.updatedAt
    const history = await this.prisma.message.findMany({
      where: {
        conversationId,
        status: PrismaValues.MessageStatus.NORMAL,
        type: { in: [PrismaValues.MessageType.TEXT, PrismaValues.MessageType.RICH_TEXT, PrismaValues.MessageType.EMOJI] },
        createdAt: { gte: memoryCutoff }
      },
      orderBy: { sequence: 'desc' },
      take: memoryLength,
      include: { sender: { select: { name: true } } }
    })
    const ordered = history.slice().reverse()

    const latest = ordered[ordered.length - 1]
    const latestText = latest ? this.extractPlainText(latest) : ''
    const latestStripped = this.stripMention(latestText, bot.name, bot.userId)
    const command = this.parseCommand(latestStripped)

    const systemMessages: Array<{ role: 'system'; content: string }> = []
    if (bot.systemPrompt?.trim()) {
      systemMessages.push({ role: 'system', content: bot.systemPrompt.trim() })
    }

    const kbText = this.formatKnowledgeBase(bot.knowledgeBase, latestText)
    if (kbText) {
      systemMessages.push({ role: 'system', content: `知识库内容：\n${kbText}` })
    }

    if (bot.tools) {
      systemMessages.push({ role: 'system', content: `可用工具与能力：${JSON.stringify(bot.tools)}` })
    }

    const conversationType = await this.getConversationType(conversationId)
    const memberMap = await this.getConversationMemberMap(conversationId)
    const provider = this.resolveProvider(bot)
    const mcpConfig = this.resolveMcpConfig(bot)
    const mcpContext = {
      bot,
      conversationId,
      latestMessageText: latestStripped,
      conversationType,
      emitMessage: async (input: { content: string; payload?: any }) => {
        const text = String(input?.content || '').trim()
        if (!text) throw new Error('消息内容不能为空')
        const payload = input?.payload
        return this.createMessageWithTimeout(bot.userId, {
          conversationId,
          type: PrismaValues.MessageType.TEXT,
          content: text,
          payload,
          clientMessageId: `bot_${bot.userId}_${Date.now()}_mcp`
        })
      }
    }
    const aiSdkTools = this.buildAiSdkTools(mcpContext, mcpConfig)
    const humanizeEnabled = !!bot.humanizeEnabled
    const autoResults = await this.mcpRuntime.autoInvoke(latestStripped, mcpContext, mcpConfig)
    const autoTimeReady = autoResults.some(record => record.tool?.id === 'time.now' && record.result?.ok)
    const autoSystemReady = autoResults.some(record => record.tool?.id === 'system.info' && record.result?.ok)
    autoResults.forEach(record => {
      if (record.result && record.result.ok === false) {
        this.logger.warn(`MCP 自动调用失败: tool=${record.tool?.id} error=${record.result.error || 'unknown'}`)
      }
      const prompt = record.systemPrompt
        || (record.result?.ok ? `MCP ${record.tool?.name || record.tool?.id} 结果：${JSON.stringify(record.result.data)}` : '')
      if (prompt) systemMessages.push({ role: 'system', content: prompt })
    })

    const messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }> = [...systemMessages]
    if (aiSdkTools?.time_now && !autoTimeReady) {
      messages.push({
        role: 'system',
        content: '当需要当前时间/日期/星期等信息时，必须调用工具 time_now 获取，不要猜测。'
      })
    }
    if (aiSdkTools?.system_info && !autoSystemReady) {
      messages.push({
        role: 'system',
        content: '当用户询问系统信息/服务器状态/资源概况时，必须调用工具 system_info 获取，并基于结果回复。'
      })
    }

    const isTimeQuery = /(现在|当前).*(时间|日期)|几点|几号|星期|周[一二三四五六日天]|今天|明天|昨天|日期|时间|time|date/i.test(latestStripped)
    const isSystemQuery = /(系统|服务器).*(信息|状态|资源)|CPU|内存|负载|磁盘|system info|system status/i.test(latestStripped)
    const temperature = this.clampNumber(bot.temperature ?? 0.7, 0, 2)
    const maxTokens = this.clampNumber(bot.maxTokens ?? 1024, 1, 4096)
    if ((isTimeQuery || isSystemQuery) && autoResults.length) {
      const timeResult = autoResults.find(record => record.tool?.id === 'time.now' && record.result?.ok)?.result?.data as any
      const systemResult = autoResults.find(record => record.tool?.id === 'system.info' && record.result?.ok)?.result?.data as any
      const replyParts: string[] = []
      if (timeResult) {
        replyParts.push(`当前时间：${timeResult.localeTime || timeResult.iso || ''}`.trim())
        if (timeResult.timezone) replyParts.push(`时区：${timeResult.timezone}`)
      }
      if (systemResult) {
        const load = Array.isArray(systemResult.loadAvg) ? systemResult.loadAvg.join(', ') : ''
        const totalMemMb = systemResult.totalMemory ? Math.round(systemResult.totalMemory / 1024 / 1024) : null
        const freeMemMb = systemResult.freeMemory ? Math.round(systemResult.freeMemory / 1024 / 1024) : null
        replyParts.push(`系统：${systemResult.platform || ''}/${systemResult.arch || ''}`.trim())
        if (systemResult.cpuCount) replyParts.push(`CPU：${systemResult.cpuCount} 核 ${systemResult.cpuModel || ''}`.trim())
        if (load) replyParts.push(`负载：${load}`)
        if (totalMemMb !== null && freeMemMb !== null) replyParts.push(`内存：${freeMemMb}MB 可用 / ${totalMemMb}MB 总量`)
      }
      const reply = replyParts.filter(Boolean).join('\n')
      if (reply && !humanizeEnabled) {
        await this.createMessageWithTimeout(bot.userId, {
          conversationId,
          type: PrismaValues.MessageType.TEXT,
          content: reply,
          clientMessageId: `bot_${bot.userId}_${Date.now()}_mcp`
        })
        return
      }
      if (reply && humanizeEnabled) {
        const humanized = await this.createChatCompletion({
          ...provider,
          messages: [
            { role: 'system', content: this.buildHumanizeInstruction(bot) },
            { role: 'system', content: '你只能使用以下事实回答用户问题，不得改动任何时间/数字/名称；不要说“我来帮你查看”。' },
            { role: 'system', content: `事实：\n${reply}` },
            { role: 'user', content: latestStripped || '请用自然口语回答。' }
          ],
          temperature: Math.min(0.4, temperature),
          maxTokens,
          toolChoice: 'none',
          timeoutMs: 20000
        })
        const parsed = this.parseHumanizeResponse(String(humanized ?? ''))
        if (parsed.messages.length) {
          await this.sendHumanizedMessages(bot, conversationId, parsed.messages, guard)
          return
        }
        await this.sendHumanizedMessages(bot, conversationId, reply, guard)
        return
      }
    }

    if (humanizeEnabled && autoResults.length) {
      messages.push({
        role: 'system',
        content: '已获取 MCP 结果，请直接基于结果给出最终回复，不要说“我来帮你查看”。'
      })
    }

    const filteredHistory = ordered.filter(item => {
      if (!item.content && !item.payload) return false
      return true
    })

    if (command && latest) {
      if (command.type === 'summary' && bot.summaryEnabled) {
        const summaryTarget = filteredHistory.slice(0, -1)
        messages.push({
          role: 'system',
          content: '你是企业级对话总结助手，请用清晰的要点总结对话重点。'
        })
        messages.push({
          role: 'user',
          content: this.buildSummaryPrompt(summaryTarget, conversationType, memberMap)
        })
      } else if (command.type === 'translate' && bot.translationEnabled) {
        const target = command.target || '中文'
        const text = command.text || this.buildSummaryPrompt(filteredHistory.slice(0, -1), conversationType, memberMap)
        messages.push({
          role: 'system',
          content: `你是企业级翻译助手，请将内容翻译为${target}。`
        })
        messages.push({ role: 'user', content: text })
      }
    } else {
      filteredHistory.forEach(message => {
        const role = message.senderId === bot.userId ? 'assistant' : 'user'
        const name = message.senderId === bot.userId ? bot.name : (message as any).sender?.name || senderName
        const member = message.senderId ? memberMap.get(message.senderId) : null
        const label = this.buildMemberLabel(name, member?.role, member?.accountType)
        const senderLabel = conversationType === 'GROUP' && role === 'user'
          ? `[${label}] `
          : ''
        let content = this.extractPlainText(message)
        if (message.id === latest?.id) {
          content = this.stripMention(content, bot.name, bot.userId)
        }
        messages.push({ role, content: `${senderLabel}${content}`.trim() })
      })
    }

    const responseMode = bot.responseMode ?? PrismaValues.BotResponseMode.INSTANT

    if (responseMode === PrismaValues.BotResponseMode.STREAM && !humanizeEnabled) {
      const created = await this.messageService.create(bot.userId, {
        conversationId,
        type: PrismaValues.MessageType.TEXT,
        content: '',
        clientMessageId: `bot_${bot.userId}_${Date.now()}`
      })

      const memberIds = await this.getConversationMemberIds(conversationId)
      let fullContent = ''
      for await (const chunk of this.streamChatCompletion({
        ...provider,
        messages,
        temperature,
        maxTokens,
        tools: aiSdkTools,
        timeoutMs: 30000
      })) {
        if (!this.isGuardActive(guard)) return
        fullContent += chunk
        this.messageGateway.broadcastToUsers(memberIds, 'message-stream', {
          conversationId,
          messageId: created.id,
          delta: chunk,
          fullContent
        })
      }

      if (!this.isGuardActive(guard)) return
      await this.messageService.updateInternal(created.id, { content: fullContent })
      return
    }

    const humanizeInstruction = humanizeEnabled ? this.buildHumanizeInstruction(bot) : ''
    const content = await this.createChatCompletion({
      ...provider,
      messages: humanizeInstruction
        ? [{ role: 'system', content: humanizeInstruction }, ...messages]
        : messages,
      temperature,
      maxTokens,
      tools: aiSdkTools,
      toolChoice: humanizeEnabled ? 'none' : undefined,
      timeoutMs: 20000
    })
    const rawContent = String(content ?? '')
    if (!rawContent.trim()) {
      this.logger.error(`机器人回复为空: bot=${bot.id} conv=${conversationId}`)
      await this.sendBotErrorMessage(bot, conversationId)
      return
    }

    if (humanizeEnabled) {
      const parsed = this.parseHumanizeResponse(rawContent)
      if (parsed.messages.length) {
        await this.sendHumanizedMessages(bot, conversationId, parsed.messages, guard)
        return
      }
      await this.sendHumanizedMessages(bot, conversationId, rawContent, guard)
      return
    }

    if (!this.isGuardActive(guard)) {
      return
    }
    const safeContent = rawContent.trim()
    await this.createMessageWithTimeout(bot.userId, {
      conversationId,
      type: PrismaValues.MessageType.TEXT,
      content: safeContent,
      clientMessageId: `bot_${bot.userId}_${Date.now()}`
    })
  }

  private resolveProvider(bot: PrismaTypes.AiBot) {
    let apiKey = ''
    if (bot.apiKeyEncrypted) {
      try {
        apiKey = decryptSecret(bot.apiKeyEncrypted)
      } catch {
        apiKey = ''
      }
    }
    if (!apiKey) apiKey = process.env.DEEPSEEK_API_KEY || ''
    const baseUrl = bot.apiBaseUrl || process.env.DEEPSEEK_API_BASE_URL || 'https://api.deepseek.com/v1'
    const model = bot.model || process.env.DEEPSEEK_DEFAULT_MODEL || 'deepseek-chat'
    if (!apiKey) {
      throw new BadRequestException('机器人未配置 API Key')
    }
    return { apiKey, baseUrl, model }
  }


  private async createChatCompletion(options: {
    apiKey: string
    baseUrl: string
    model: string
    messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }>
    temperature: number
    maxTokens: number
    tools?: ToolSet
    toolChoice?: ToolChoice<ToolSet>
    timeoutMs?: number
  }) {
    try {
      return await generateAiText({
        apiKey: options.apiKey,
        baseUrl: options.baseUrl,
        model: options.model,
        messages: options.messages,
        temperature: options.temperature,
        maxTokens: options.maxTokens,
        tools: options.tools,
        toolChoice: options.toolChoice,
        timeoutMs: options.timeoutMs
      })
    } catch (error: any) {
      throw new BadRequestException(`AI 请求失败: ${error?.message || error}`)
    }
  }


  private async *streamChatCompletion(options: {
    apiKey: string
    baseUrl: string
    model: string
    messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }>
    temperature: number
    maxTokens: number
    tools?: ToolSet
    timeoutMs?: number
  }) {
    try {
      for await (const chunk of streamAiText({
        apiKey: options.apiKey,
        baseUrl: options.baseUrl,
        model: options.model,
        messages: options.messages,
        temperature: options.temperature,
        maxTokens: options.maxTokens,
        tools: options.tools,
        timeoutMs: options.timeoutMs
      })) {
        yield chunk
      }
    } catch (error: any) {
      throw new BadRequestException(`AI 流式请求失败: ${error?.message || error}`)
    }
  }

  private formatBot(bot: PrismaTypes.AiBot) {
    return {
      id: bot.id,
      userId: bot.userId,
      creatorId: bot.creatorId,
      name: bot.name,
      description: bot.description,
      avatar: bot.avatar,
      visibility: bot.visibility,
      status: bot.status,
      triggerMode: bot.triggerMode,
      autoReplyInGroup: bot.autoReplyInGroup,
      responseMode: bot.responseMode,
      systemPrompt: bot.systemPrompt,
      temperature: bot.temperature,
      maxTokens: bot.maxTokens,
      memoryLength: bot.memoryLength,
      humanizeEnabled: bot.humanizeEnabled,
      humanizeMinDelay: bot.humanizeMinDelay,
      humanizeMaxDelay: bot.humanizeMaxDelay,
      humanizeChunkSize: bot.humanizeChunkSize,
      humanizeCharMinMs: bot.humanizeCharMinMs,
      humanizeCharMaxMs: bot.humanizeCharMaxMs,
      humanizeOverLimitThreshold: bot.humanizeOverLimitThreshold,
      humanizeOverLimitDelayMs: bot.humanizeOverLimitDelayMs,
      tools: bot.tools,
      knowledgeBase: bot.knowledgeBase,
      summaryEnabled: bot.summaryEnabled,
      translationEnabled: bot.translationEnabled,
      apiBaseUrl: bot.apiBaseUrl,
      model: bot.model,
      hasApiKey: !!bot.apiKeyEncrypted,
      apiKeyHint: bot.apiKeyHint,
      createdAt: bot.createdAt,
      updatedAt: bot.updatedAt
    }
  }

  private normalizeBotInput(input: Partial<CreateBotInput>) {
    const name = input.name?.trim()
    if (input.name !== undefined && !name) {
      throw new BadRequestException('机器人名称不能为空')
    }
    return {
      name,
      description: input.description?.trim(),
      avatar: input.avatar?.trim() || undefined,
      visibility: input.visibility,
      triggerMode: input.triggerMode,
      autoReplyInGroup: input.autoReplyInGroup,
      responseMode: input.responseMode,
      systemPrompt: input.systemPrompt?.trim(),
      temperature: input.temperature,
      maxTokens: input.maxTokens,
      memoryLength: input.memoryLength,
      humanizeEnabled: input.humanizeEnabled,
      humanizeMinDelay: input.humanizeMinDelay,
      humanizeMaxDelay: input.humanizeMaxDelay,
      humanizeChunkSize: input.humanizeChunkSize,
      humanizeCharMinMs: input.humanizeCharMinMs,
      humanizeCharMaxMs: input.humanizeCharMaxMs,
      humanizeOverLimitThreshold: input.humanizeOverLimitThreshold,
      humanizeOverLimitDelayMs: input.humanizeOverLimitDelayMs,
      tools: this.normalizeJson(input.tools),
      knowledgeBase: this.normalizeJson(input.knowledgeBase),
      summaryEnabled: input.summaryEnabled,
      translationEnabled: input.translationEnabled,
      apiKey: input.apiKey,
      apiBaseUrl: input.apiBaseUrl?.trim(),
      model: input.model?.trim()
    }
  }

  private normalizeJson(value: any) {
    if (value === undefined) return undefined
    if (typeof value === 'string') {
      const trimmed = value.trim()
      if (!trimmed) return null
      try {
        return JSON.parse(trimmed)
      } catch {
        return trimmed
      }
    }
    return value
  }

  private resolveMcpConfig(bot: PrismaTypes.AiBot): McpConfig {
    const raw = bot.tools as any
    if (!raw || typeof raw !== 'object') return { enabled: true }
    const mcp = raw.mcp
    if (!mcp || typeof mcp !== 'object') return { enabled: true }
    return {
      enabled: mcp.enabled !== false,
      allow: Array.isArray(mcp.allow) ? mcp.allow.map((item: any) => String(item)) : [],
      deny: Array.isArray(mcp.deny) ? mcp.deny.map((item: any) => String(item)) : []
    }
  }

  private buildAiSdkTools(context: {
    bot: PrismaTypes.AiBot
    conversationId: string
    latestMessageText: string
    conversationType?: string | null
  }, config: McpConfig) {
    if (config?.enabled === false) return undefined
    const allow = new Set((config?.allow || []).map(item => String(item)))
    const deny = new Set((config?.deny || []).map(item => String(item)))
    const tools: ToolSet = {}

    const canUseTime = !deny.has('time.now') && (allow.size === 0 || allow.has('time.now'))
    if (canUseTime) {
      tools.time_now = tool({
        description: '获取当前系统时间与时区信息',
        inputSchema: jsonSchema({ type: 'object', properties: {} }),
        execute: async () => {
          const results = await this.mcpRuntime.invokeByIds(['time.now'], context, config)
          const result = results[0]?.result
          if (!result?.ok) throw new Error(result?.error || '获取时间失败')
          return result?.data ?? {}
        }
      })
    }

    const canUseSystemInfo = !deny.has('system.info') && (allow.size === 0 || allow.has('system.info'))
    if (canUseSystemInfo) {
      tools.system_info = tool({
        description: '获取服务器系统信息与资源概况',
        inputSchema: jsonSchema({ type: 'object', properties: {} }),
        execute: async () => {
          const results = await this.mcpRuntime.invokeByIds(['system.info'], context, config)
          const result = results[0]?.result
          if (!result?.ok) throw new Error(result?.error || '获取系统信息失败')
          return result?.data ?? {}
        }
      })
    }

    const canUseWeb = !deny.has('web.fetch') && (allow.size === 0 || allow.has('web.fetch'))
    if (canUseWeb) {
      tools.web_fetch = tool({
        description: '查看网页内容（仅允许白名单域名）',
        inputSchema: jsonSchema({
          type: 'object',
          properties: {
            url: { type: 'string' },
            maxChars: { type: 'number' }
          },
          required: ['url']
        }),
        execute: async (input: { url: string; maxChars?: number }) => {
          const registry = this.mcpRuntime.getRegistry()
          const toolImpl = registry.get('web.fetch')
          if (!toolImpl) throw new Error('网页工具未注册')
          const result = await toolImpl.invoke(input, context)
          if (!result?.ok) throw new Error(result?.error || '获取网页失败')
          return result?.data ?? {}
        }
      })
    }

    const canUseMessageSend = !deny.has('message.send') && (allow.size === 0 || allow.has('message.send'))
    if (canUseMessageSend) {
      tools.message_send = tool({
        description: '主动发送一条文本消息到当前会话（用于补充说明或后续更新）',
        inputSchema: jsonSchema({
          type: 'object',
          properties: {
            content: { type: 'string' },
            payload: { type: 'object' }
          },
          required: ['content']
        }),
        execute: async (input: { content: string; payload?: any }) => {
          const registry = this.mcpRuntime.getRegistry()
          const toolImpl = registry.get('message.send')
          if (!toolImpl) throw new Error('消息发送工具未注册')
          const result = await toolImpl.invoke(input, context)
          if (!result?.ok) throw new Error(result?.error || '消息发送失败')
          return result?.data ?? {}
        }
      })
    }

    return Object.keys(tools).length ? tools : undefined
  }

  private isBotMentioned(content: string, botName: string, botId: string) {
    if (!content) return false
    const normalized = content.toLowerCase()
    return normalized.includes(`@${botName.toLowerCase()}`) || normalized.includes(`@${botId.toLowerCase()}`)
  }

  private stripMention(content: string, botName: string, botId: string) {
    return content
      .replace(new RegExp(`@${this.escapeRegex(botName)}`, 'ig'), '')
      .replace(new RegExp(`@${this.escapeRegex(botId)}`, 'ig'), '')
      .trim()
  }

  private escapeRegex(input: string) {
    return input.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  }

  private extractPlainText(message: PrismaTypes.Message) {
    if (message.type === PrismaValues.MessageType.EMOJI) {
      const payloadText = this.extractPlainTextFromPayload(message.payload)
      return payloadText || message.content || ''
    }
    if (message.content && message.content !== '[富文本消息]') return message.content
    if (!message.payload || typeof message.payload !== 'object') return message.content || ''
    return this.extractPlainTextFromPayload(message.payload) || message.content || ''
  }

  private extractPlainTextFromPayload(payload: any) {
    if (!payload || typeof payload !== 'object') return ''
    const summary = (payload as any).aiSummary
    const tags = (payload as any).aiTags
    const text = (payload as any).aiText
    const emojiName = (payload as any).emojiName || (payload as any).name
    const emojiDescription = (payload as any).emojiDescription || (payload as any).description
    const emojiKeywords = (payload as any).emojiKeywords || (payload as any).keywords
    const emojiCategoryName = (payload as any).emojiCategoryName
    const emojiCategoryDescription = (payload as any).emojiCategoryDescription
    if (summary || tags || text || emojiName || emojiDescription || emojiKeywords || emojiCategoryName || emojiCategoryDescription) {
      return [emojiName, emojiDescription, emojiKeywords, emojiCategoryName, emojiCategoryDescription, summary, text, tags]
        .filter(item => typeof item === 'string' && item.trim())
        .join('，')
        .trim()
    }
    if (!payload?.content || !Array.isArray(payload.content)) return ''
    const texts: string[] = []
    const walk = (node: any) => {
      if (!node) return
      if (typeof node === 'string') {
        texts.push(node)
        return
      }
      if (node.text) texts.push(node.text)
      if (Array.isArray(node.content)) node.content.forEach(walk)
    }
    payload.content.forEach(walk)
    return texts.join('').trim()
  }

  private parseCommand(text: string) {
    const trimmed = text.trim()
    if (!trimmed.startsWith('/')) return null
    const [cmd, ...rest] = trimmed.split(' ')
    if (cmd === '/summary') return { type: 'summary' as const }
    if (cmd === '/translate' || cmd === '/翻译') {
      const target = rest[0]
      const content = rest.slice(1).join(' ').trim()
      return { type: 'translate' as const, target, text: content }
    }
    return null
  }

  /**
   * 生成总结提示词
   */
  private buildSummaryPrompt(
    messages: PrismaTypes.Message[],
    conversationType?: string | null,
    memberMap?: Map<string, { name: string; role?: string | null; accountType?: string | null }>
  ) {
    if (!messages.length) return '暂无可总结内容。'
    return messages
      .map(item => {
        const name = (item as any).sender?.name || '用户'
        const member = item.senderId ? memberMap?.get(item.senderId) : null
        const label = this.buildMemberLabel(name, member?.role, member?.accountType)
        const text = this.extractPlainText(item)
        return conversationType === 'GROUP' ? `[${label}] ${text}` : text
      })
      .join('\n')
  }

  private formatKnowledgeBase(knowledgeBase: any, query: string) {
    if (!knowledgeBase) return ''
    const textQuery = query?.toLowerCase() || ''
    if (typeof knowledgeBase === 'string') return knowledgeBase
    if (Array.isArray(knowledgeBase)) {
      const scored = knowledgeBase
        .map((item: any) => {
          const content = typeof item === 'string' ? item : JSON.stringify(item)
          const score = textQuery ? (content.toLowerCase().includes(textQuery) ? 10 : 0) : 1
          return { content, score }
        })
        .sort((a, b) => b.score - a.score)
        .slice(0, 5)
      return scored.map(item => item.content).join('\n')
    }
    return JSON.stringify(knowledgeBase)
  }

  private async getConversationMemberIds(conversationId: string) {
    const members = await this.prisma.conversationMember.findMany({
      where: { conversationId },
      select: { userId: true }
    })
    return members.map(m => m.userId)
  }

  /**
   * 获取会话成员映射
   */
  private async getConversationMemberMap(conversationId: string) {
    const members = await this.prisma.conversationMember.findMany({
      where: { conversationId },
      select: {
        userId: true,
        role: true,
        user: { select: { name: true, accountType: true } }
      }
    })
    return new Map(
      members.map(m => [
        m.userId,
        { name: m.user?.name || '用户', role: m.role, accountType: m.user?.accountType }
      ])
    )
  }

  /**
   * 生成成员标签
   */
  private buildMemberLabel(name: string, role?: string | null, accountType?: string | null) {
    const roleLabel = role ? role : 'MEMBER'
    const accountLabel = accountType ? accountType : 'USER'
    return `${name}|${roleLabel}|${accountLabel}`
  }

  private async getConversationType(conversationId: string) {
    const conv = await this.prisma.conversation.findUnique({
      where: { id: conversationId },
      select: { type: true }
    })
    return conv?.type
  }

  private isAdmin(user: { role?: string | null; accountType?: string | null }) {
    return user.role?.toLowerCase() === 'admin' || user.accountType === PrismaValues.UserAccountType.ADMIN
  }

  private canViewBot(user: { id: string; role?: string | null; accountType?: string | null; email?: string | null }, bot: PrismaTypes.AiBot) {
    if (this.isAdmin(user)) return true
    if (bot.creatorId === user.id) return true
    if (bot.visibility === PrismaValues.BotVisibility.PUBLIC) return true
    if (bot.visibility === PrismaValues.BotVisibility.ORG) {
      const domain = this.getEmailDomain(user.email || '')
      return domain && bot.orgDomain && domain === bot.orgDomain
    }
    return false
  }

  private getEmailDomain(email: string) {
    const parts = email.split('@')
    return parts.length === 2 ? parts[1].toLowerCase() : ''
  }

  private clampNumber(value: number, min: number, max: number) {
    if (Number.isNaN(value)) return min
    return Math.min(Math.max(value, min), max)
  }

  private async sendHumanizedMessages(
    bot: PrismaTypes.AiBot,
    conversationId: string,
    contentOrMessages: string | Array<{ text: string; delayMs?: number; thoughts?: string }>,
    guard?: { key: string; token: number }
  ) {
    const chunkSize = this.clampNumber(bot.humanizeChunkSize ?? 60, 30, 400)
    const minDelay = this.clampNumber(bot.humanizeMinDelay ?? 300, 0, 10000)
    const maxDelay = this.clampNumber(bot.humanizeMaxDelay ?? 900, minDelay, 15000)
    const charMinMs = this.clampNumber(bot.humanizeCharMinMs ?? 200, 50, 2000)
    const charMaxMs = this.clampNumber(bot.humanizeCharMaxMs ?? 800, charMinMs, 5000)
    const overLimitThreshold = this.clampNumber(bot.humanizeOverLimitThreshold ?? 10, 1, 200)
    const overLimitDelayMs = this.clampNumber(bot.humanizeOverLimitDelayMs ?? 5000, minDelay, 60000)
    const plannedMessages: Array<{ text: string; delayMs?: number; thoughts?: string }> = Array.isArray(contentOrMessages)
      ? contentOrMessages
      : this.splitHumanChunks(contentOrMessages, chunkSize).map(text => ({ text }))
    const finalMessages = plannedMessages.length ? plannedMessages : [{ text: String(contentOrMessages || '').trim() }]
    let sentCount = 0
    for (let i = 0; i < finalMessages.length; i += 1) {
      if (guard && !this.isGuardActive(guard)) {
        return
      }
      const item = finalMessages[i]
      const text = this.stripTrailingPunctuation(String(item.text || '')).trim()
      if (!text) continue
      const payload = item.thoughts ? { internal: { thoughts: item.thoughts } } : undefined
      await this.createMessageWithTimeout(bot.userId, {
        conversationId,
        type: PrismaValues.MessageType.TEXT,
        content: text,
        payload,
        clientMessageId: `bot_${bot.userId}_${Date.now()}_${i}`
      })
      sentCount += 1
      if (i < finalMessages.length - 1) {
        const delay = this.clampNumber(
          this.calculateTypingDelay(text, minDelay, maxDelay, charMinMs, charMaxMs, overLimitThreshold, overLimitDelayMs),
          minDelay,
          maxDelay
        )
        const interrupted = await this.sleepWithGuard(delay, guard)
        if (interrupted) return
      }
    }
    if (sentCount === 0) {
      this.logger.error(`机器人拟人化未发送任何消息: bot=${bot.id} conv=${conversationId}`)
      await this.sendBotErrorMessage(bot, conversationId)
    }
  }

  private splitHumanChunks(content: string, maxLen: number) {
    const normalized = (content || '').replace(/\r\n/g, '\n').trim()
    if (!normalized) return []
    const lines = normalized.split('\n').map(line => line.trim()).filter(Boolean)
    const separators = /([。！？!?；;，,、]+)\s*/g
    const chunks: string[] = []
    lines.forEach(line => {
      const parts = line.split(separators).filter(Boolean)
      let buffer = ''
      for (const part of parts) {
        const next = `${buffer}${part}`
        if (next.length >= maxLen && buffer) {
          chunks.push(buffer)
          buffer = part
        } else {
          buffer = next
        }
        if (buffer.length >= maxLen) {
          chunks.push(buffer)
          buffer = ''
        }
      }
      if (buffer) chunks.push(buffer)
    })
    return chunks.flatMap(chunk => this.splitByLength(chunk, maxLen))
  }

  private splitByLength(text: string, maxLen: number) {
    if (text.length <= maxLen) return [text]
    const result: string[] = []
    let cursor = 0
    while (cursor < text.length) {
      result.push(text.slice(cursor, cursor + maxLen))
      cursor += maxLen
    }
    return result
  }

  private stripTrailingPunctuation(text: string) {
    return text.replace(/[。！？!?；;，,、\s]+$/g, '')
  }

  private calculateTypingDelay(
    text: string,
    minDelay: number,
    maxDelay: number,
    charMinMs: number,
    charMaxMs: number,
    overLimitThreshold: number,
    overLimitDelayMs: number
  ) {
    const length = Math.max(1, text.trim().length)
    if (length > overLimitThreshold) return overLimitDelayMs
    const perChar = this.randomDelay(charMinMs, charMaxMs)
    const total = length * perChar
    return Math.max(minDelay, Math.min(maxDelay, total))
  }

  private buildHumanizeInstruction(bot: PrismaTypes.AiBot) {
    const minDelay = this.clampNumber(bot.humanizeMinDelay ?? 300, 0, 10000)
    const maxDelay = this.clampNumber(bot.humanizeMaxDelay ?? 900, minDelay, 15000)
    const chunkSize = this.clampNumber(bot.humanizeChunkSize ?? 60, 30, 400)
    return [
      '你需要输出严格 JSON（不要 markdown，不要解释）。',
      '格式如下：',
      '{"messages":[{"text":"...","delayMs":500,"thoughts":"..."}]}',
      '规则：',
      '1) messages 为数组，按发送顺序排列。',
      `2) text 为每条要发送的内容，尽量短句，单条长度控制在 ${chunkSize} 字以内。`,
      `3) delayMs 为下一条消息发送前的等待时间（毫秒），范围 ${minDelay}~${maxDelay}。`,
      '4) thoughts 为“内心独白”，仅用于记录，客户端不可显示，可为空。',
      '5) 不要在句末强制加标点，尽量像人类分段发送。',
      '只输出 JSON。'
    ].join('\n')
  }

  private parseHumanizeResponse(content: string) {
    const clean = content
      .replace(/```json/gi, '')
      .replace(/```/g, '')
      .trim()
    try {
      const data = JSON.parse(clean)
      const messages = Array.isArray(data?.messages) ? data.messages : []
      return {
        messages: messages
          .map((item: any) => ({
            text: String(item?.text ?? '').trim(),
            delayMs: typeof item?.delayMs === 'number' ? item.delayMs : undefined,
            thoughts: item?.thoughts ? String(item.thoughts) : undefined
          }))
          .filter((item: any) => item.text)
      }
    } catch {
      return { messages: [] as Array<{ text: string; delayMs?: number; thoughts?: string }> }
    }
  }

  private randomDelay(min: number, max: number) {
    if (max <= min) return min
    return Math.floor(min + Math.random() * (max - min))
  }

  private sleep(ms: number) {
    return new Promise(resolve => setTimeout(resolve, ms))
  }

  private sleepWithGuard(ms: number, guard?: { key: string; token: number }) {
    if (!guard) return this.sleep(ms).then(() => false)
    return new Promise<boolean>(resolve => {
      const startToken = guard.token
      const timeout = setTimeout(() => resolve(false), ms)
      const interval = setInterval(() => {
        if (!this.isGuardActive({ key: guard.key, token: startToken })) {
          clearTimeout(timeout)
          clearInterval(interval)
          resolve(true)
        }
      }, 50)
    })
  }

  private buildGuardKey(botId: string, conversationId: string) {
    return `${botId}:${conversationId}`
  }

  /**
   * 机器人异常时反馈提示
   */
  private async sendBotErrorMessage(bot: PrismaTypes.AiBot, conversationId: string) {
    try {
      await this.createMessageWithTimeout(bot.userId, {
        conversationId,
        type: PrismaValues.MessageType.TEXT,
        content: '机器人服务暂时不可用，请稍后再试。',
        clientMessageId: `bot_${bot.userId}_${Date.now()}_error`
      })
    } catch (error: any) {
      this.logger.error(`机器人错误提示发送失败: ${error?.message || error}`)
    }
  }

  /**
   * 发送消息并加超时保护，避免卡死无日志
   */
  private async createMessageWithTimeout(userId: string, payload: {
    conversationId: string
    type: PrismaValues.MessageType
    content: string
    clientMessageId: string
    payload?: any
  }) {
    const timeoutMs = 5000
    try {
      const result = await Promise.race([
        this.messageService.create(userId, payload),
        new Promise<null>((_, reject) => setTimeout(() => reject(new Error('写入消息超时')), timeoutMs))
      ])
      return result
    } catch (error: any) {
      this.logger.error(`机器人写入消息失败: ${error?.message || error}`)
      throw error
    }
  }

  private getReplyGuard(botId: string, conversationId: string) {
    const key = this.buildGuardKey(botId, conversationId)
    const existing = this.replyGuards.get(key)
    if (!existing) {
      const guard = { token: Date.now() }
      this.replyGuards.set(key, guard)
      return { key, token: guard.token }
    }
    return { key, token: existing.token }
  }

  private bumpReplyGuard(botId: string, conversationId: string) {
    const key = this.buildGuardKey(botId, conversationId)
    this.replyGuards.set(key, { token: Date.now() })
  }

  private isGuardActive(guard?: { key: string; token: number }) {
    if (!guard) return true
    const current = this.replyGuards.get(guard.key)
    return !!current && current.token === guard.token
  }
}
