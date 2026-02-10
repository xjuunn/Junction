import type { McpTool } from '../types'

interface MessageSendInput {
  content: string
  payload?: any
}

const MAX_CONTENT_LENGTH = 2000

export const messageSendTool: McpTool = {
  id: 'message.send',
  name: '发送消息',
  description: '主动发送一条文本消息到当前会话（用于补充说明或后续更新）。',
  inputSchema: {
    type: 'object',
    properties: {
      content: { type: 'string' },
      payload: { type: 'object' }
    },
    required: ['content']
  },
  async invoke(input, context) {
    const payload = (input || {}) as MessageSendInput
    const content = String(payload.content || '').trim()
    if (!content) return { ok: false, error: '消息内容不能为空' }
    if (content.length > MAX_CONTENT_LENGTH) {
      return { ok: false, error: `消息内容过长（最大 ${MAX_CONTENT_LENGTH} 字）` }
    }
    if (!context.emitMessage) {
      return { ok: false, error: '消息发送能力未启用' }
    }
    const result = await context.emitMessage({ content, payload: payload.payload })
    return {
      ok: true,
      data: {
        messageId: result?.id || null
      }
    }
  }
}
