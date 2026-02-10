import type { McpTool } from '../types'

export const timeTool: McpTool = {
  id: 'time.now',
  name: '当前时间',
  description: '获取当前系统时间与时区信息。',
  inputSchema: {
    type: 'object',
    properties: {}
  },
  canAutoInvoke(text) {
    if (!text) return false
    return /(现在|当前).*(时间|日期)|几点|几号|星期|周[一二三四五六日天]|今天|明天|昨天|日期|时间|time|date/i.test(text)
  },
  async invoke(_input, context) {
    const now = new Date()
    const preferredZone = (context?.bot as any)?.tools?.mcp?.timezone || (context?.bot as any)?.tools?.mcp?.timeZone
    const timeZone = preferredZone || Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC'
    const offsetMinutes = preferredZone ? null : -now.getTimezoneOffset()
    const localeTime = new Intl.DateTimeFormat('zh-CN', {
      dateStyle: 'full',
      timeStyle: 'medium',
      hour12: false,
      timeZone
    }).format(now)
    return {
      ok: true,
      data: {
        iso: now.toISOString(),
        timestamp: now.getTime(),
        timezone: timeZone,
        offsetMinutes,
        localeTime
      }
    }
  },
  buildSystemPrompt(result) {
    if (!result.ok || !result.data) return ''
    const data: any = result.data
    return `MCP 时间工具结果：${data.localeTime}（时区：${data.timezone}，ISO：${data.iso}）`
  }
}
