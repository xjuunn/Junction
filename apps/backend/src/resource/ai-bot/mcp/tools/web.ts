import type { McpTool } from '../types'

interface WebFetchInput {
  url: string
  maxChars?: number
}

const isHttpUrl = (value: string) => {
  try {
    const parsed = new URL(value)
    return parsed.protocol === 'http:' || parsed.protocol === 'https:'
  } catch {
    return false
  }
}

const normalizeHost = (host: string) => host.toLowerCase().trim()

const matchDomain = (host: string, allowDomains: string[]) => {
  const target = normalizeHost(host)
  return allowDomains.some(domain => {
    const cleaned = normalizeHost(domain)
    if (!cleaned) return false
    if (target === cleaned) return true
    return target.endsWith(`.${cleaned}`)
  })
}

const stripHtml = (html: string) => {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<\/?[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

export const webFetchTool: McpTool = {
  id: 'web.fetch',
  name: '网页查看',
  description: '安全获取网页内容（仅允许白名单域名）。',
  inputSchema: {
    type: 'object',
    properties: {
      url: { type: 'string' },
      maxChars: { type: 'number' }
    },
    required: ['url']
  },
  async invoke(input, context) {
    const payload = (input || {}) as WebFetchInput
    const url = String(payload.url || '').trim()
    if (!url || !isHttpUrl(url)) {
      return { ok: false, error: '无效的 URL' }
    }
    const mcpConfig = (context?.bot as any)?.tools?.mcp || {}
    const webConfig = mcpConfig.web || {}
    const allowDomains: string[] = Array.isArray(webConfig.allowDomains)
      ? webConfig.allowDomains.map((item: any) => String(item))
      : []
    if (!allowDomains.length) {
      return { ok: false, error: '未配置允许访问的域名' }
    }
    const host = new URL(url).hostname
    if (!matchDomain(host, allowDomains)) {
      return { ok: false, error: '该域名未在允许列表中' }
    }

    const timeoutMs = Number(webConfig.timeoutMs) > 0 ? Number(webConfig.timeoutMs) : 8000
    const maxBytes = Number(webConfig.maxBytes) > 0 ? Number(webConfig.maxBytes) : 200_000
    const maxChars = payload.maxChars && payload.maxChars > 0 ? payload.maxChars : 8000

    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), timeoutMs)
    try {
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'User-Agent': 'JunctionBot/1.0'
        },
        signal: controller.signal
      })
      if (!response.ok) {
        return { ok: false, error: `请求失败: ${response.status}` }
      }
      const buffer = await response.arrayBuffer()
      const sliced = buffer.byteLength > maxBytes ? buffer.slice(0, maxBytes) : buffer
      const text = new TextDecoder('utf-8').decode(sliced)
      const titleMatch = text.match(/<title[^>]*>([\s\S]*?)<\/title>/i)
      const title = titleMatch ? stripHtml(titleMatch[1]) : ''
      const content = stripHtml(text).slice(0, maxChars)
      return {
        ok: true,
        data: {
          url,
          title,
          content,
          truncated: text.length > maxBytes || content.length >= maxChars,
          contentType: response.headers.get('content-type') || ''
        }
      }
    } catch (error: any) {
      return { ok: false, error: error?.name === 'AbortError' ? '请求超时' : (error?.message || String(error)) }
    } finally {
      clearTimeout(timeout)
    }
  },
  buildSystemPrompt(result) {
    if (!result.ok || !result.data) return ''
    const data: any = result.data
    const title = data.title ? `标题：${data.title}\n` : ''
    return `MCP 网页内容：\n${title}${data.content || ''}`
  }
}
