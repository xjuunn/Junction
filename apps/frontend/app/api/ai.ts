import type { ModelMessage } from 'ai'

const base = '/ai'

export interface AiTextRequest {
  system?: string
  prompt?: string
  messages?: ModelMessage[]
  temperature?: number
  maxTokens?: number
  conversationId?: string
  model?: string
}

/**
 * 生成文本（后端代理）
 */
export async function generateAiText(options: AiTextRequest) {
  if (options.prompt && options.messages) {
    throw new Error('AI 请求参数错误：prompt 与 messages 不能同时传入')
  }
  if (!options.prompt && (!options.messages || options.messages.length === 0)) {
    throw new Error('AI 请求参数错误：必须传入 prompt 或 messages')
  }
  return api.post<{ text: string; logId: string }>(`${base}/generate`, options)
}

/**
 * 流式生成文本（后端代理）
 */
export async function streamAiText(options: AiTextRequest) {
  if (options.prompt && options.messages) {
    throw new Error('AI 请求参数错误：prompt 与 messages 不能同时传入')
  }
  if (!options.prompt && (!options.messages || options.messages.length === 0)) {
    throw new Error('AI 请求参数错误：必须传入 prompt 或 messages')
  }

  const runtimeConfig = useRuntimeConfig()
  const apiUrl = runtimeConfig.public.apiUrl as string
  const token = useUserStore().authToken.value

  const response = await fetch(`${apiUrl}${base}/stream`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {})
    },
    body: JSON.stringify(options)
  })

  if (!response.ok || !response.body) {
    const errorText = await response.text()
    throw new Error(errorText || 'AI 流式请求失败')
  }

  const reader = response.body.getReader()
  const decoder = new TextDecoder('utf-8')

  async function* textStream() {
    let buffer = ''
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      buffer += decoder.decode(value, { stream: true })
      const lines = buffer.split('\n')
      buffer = lines.pop() || ''
      for (const line of lines) {
        const trimmed = line.trim()
        if (!trimmed.startsWith('data:')) continue
        const data = trimmed.replace(/^data:\s*/, '')
        if (data === '[DONE]') return
        try {
          const payload = JSON.parse(data)
          const delta = payload?.delta ?? ''
          if (delta) yield String(delta)
        } catch {
          continue
        }
      }
    }
  }

  return { textStream: textStream() }
}
