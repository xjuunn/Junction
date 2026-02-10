import * as os from 'os'
import type { McpTool } from '../types'

export const systemInfoTool: McpTool = {
  id: 'system.info',
  name: '系统信息',
  description: '获取当前服务端系统信息与资源概况。',
  inputSchema: {
    type: 'object',
    properties: {}
  },
  canAutoInvoke(text) {
    if (!text) return false
    return /(系统|服务器).*(信息|状态|资源)|CPU|内存|负载|磁盘|system info|system status/i.test(text)
  },
  async invoke() {
    const cpus = os.cpus()
    return {
      ok: true,
      data: {
        platform: os.platform(),
        arch: os.arch(),
        release: os.release(),
        uptimeSeconds: os.uptime(),
        cpuCount: cpus.length,
        cpuModel: cpus[0]?.model || '',
        loadAvg: os.loadavg(),
        totalMemory: os.totalmem(),
        freeMemory: os.freemem()
      }
    }
  },
  buildSystemPrompt(result) {
    if (!result.ok || !result.data) return ''
    const data: any = result.data
    return `MCP 系统信息：平台 ${data.platform}/${data.arch}，CPU ${data.cpuCount} 核，负载 ${data.loadAvg?.join(', ') || '-'}，内存剩余 ${(data.freeMemory / 1024 / 1024).toFixed(0)}MB`
  }
}
