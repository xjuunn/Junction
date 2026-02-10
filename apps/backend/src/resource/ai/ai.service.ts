import { BadRequestException, Injectable } from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service'
import { MessageService } from '../message/message.service'
import { PrismaValues } from '@junction/types'
import { generateAiText, streamAiText } from '~/utils/ai'

export interface AiRequestPayload {
  system?: string
  prompt?: string
  messages?: Array<{ role: 'system' | 'user' | 'assistant'; content: string }>
  temperature?: number
  maxTokens?: number
  conversationId?: string
  model?: string
}

type AiChatRole = 'system' | 'user' | 'assistant'
type AiChatMessage = { role: AiChatRole; content: string }

@Injectable()
export class AiService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly messageService: MessageService
  ) { }

  async generate(userId: string, payload: AiRequestPayload) {
    const request = this.normalizeRequest(payload)
    const provider = this.resolveProvider(payload)
    const log = await this.prisma.aiLog.create({
      data: {
        userId,
        provider: provider.provider,
        model: provider.model,
        request: {
          system: request.system,
          prompt: request.prompt,
          messages: request.messages,
          temperature: request.temperature,
          maxTokens: request.maxTokens
        }
      }
    })

    const content = await this.createChatCompletion({
      ...provider,
      messages: this.buildMessages(request),
      temperature: request.temperature,
      maxTokens: request.maxTokens
    })

    await this.prisma.aiLog.update({
      where: { id: log.id },
      data: { response: { text: content } }
    })

    if (request.conversationId) {
      await this.messageService.create(userId, {
        conversationId: request.conversationId,
        type: PrismaValues.MessageType.TEXT,
        content,
        clientMessageId: `ai_${userId}_${Date.now()}`
      })
    }

    return { text: content, logId: log.id }
  }

  async *stream(userId: string, payload: AiRequestPayload) {
    const request = this.normalizeRequest(payload)
    const provider = this.resolveProvider(payload)
    const log = await this.prisma.aiLog.create({
      data: {
        userId,
        provider: provider.provider,
        model: provider.model,
        request: {
          system: request.system,
          prompt: request.prompt,
          messages: request.messages,
          temperature: request.temperature,
          maxTokens: request.maxTokens
        }
      }
    })

    let fullContent = ''
    for await (const chunk of this.streamChatCompletion({
      ...provider,
      messages: this.buildMessages(request),
      temperature: request.temperature,
      maxTokens: request.maxTokens
    })) {
      fullContent += chunk
      yield chunk
    }

    await this.prisma.aiLog.update({
      where: { id: log.id },
      data: { response: { text: fullContent } }
    })

    if (request.conversationId) {
      await this.messageService.create(userId, {
        conversationId: request.conversationId,
        type: PrismaValues.MessageType.TEXT,
        content: fullContent,
        clientMessageId: `ai_${userId}_${Date.now()}`
      })
    }
  }

  private normalizeRequest(payload: AiRequestPayload) {
    if (payload.prompt && payload.messages) {
      throw new BadRequestException('prompt 与 messages 不能同时传入')
    }
    if (!payload.prompt && (!payload.messages || payload.messages.length === 0)) {
      throw new BadRequestException('必须传入 prompt 或 messages')
    }
    const messages: AiChatMessage[] = payload.messages || []
    return {
      system: payload.system?.trim(),
      prompt: payload.prompt?.trim(),
      messages,
      temperature: payload.temperature ?? 0.7,
      maxTokens: payload.maxTokens ?? 1024,
      conversationId: payload.conversationId,
      model: payload.model
    }
  }

  private buildMessages(request: ReturnType<AiService['normalizeRequest']>): AiChatMessage[] {
    if (request.prompt) {
      const messages: AiChatMessage[] = []
      if (request.system) messages.push({ role: 'system', content: request.system })
      messages.push({ role: 'user', content: request.prompt })
      return messages
    }

    const messages = (request.messages || []).reduce<AiChatMessage[]>((acc, item) => {
      if (!item || typeof item !== 'object') return acc
      const role = (item as AiChatMessage).role
      if (role === 'system' || role === 'user' || role === 'assistant') {
        acc.push({ role, content: String((item as AiChatMessage).content ?? '') })
      }
      return acc
    }, [])

    if (request.system) {
      return [{ role: 'system', content: request.system }, ...messages]
    }
    return messages
  }

  private resolveProvider(payload: AiRequestPayload) {
    const provider = process.env.NUXT_PUBLIC_AI_DEFAULT_PROVIDER || 'deepseek'
    const apiKey = process.env.DEEPSEEK_API_KEY || ''
    const baseUrl = process.env.DEEPSEEK_API_BASE_URL || 'https://api.deepseek.com/v1'
    const model = payload.model || process.env.DEEPSEEK_DEFAULT_MODEL || 'deepseek-chat'
    if (!apiKey) {
      throw new BadRequestException('AI 服务未配置 API Key')
    }
    return { provider, apiKey, baseUrl, model }
  }


  private async createChatCompletion(options: {
    apiKey: string
    baseUrl: string
    model: string
    messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }>
    temperature: number
    maxTokens: number
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
        timeoutMs: options.timeoutMs
      })) {
        yield chunk
      }
    } catch (error: any) {
      throw new BadRequestException(`AI 流式请求失败: ${error?.message || error}`)
    }
  }

}
