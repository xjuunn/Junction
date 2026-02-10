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
    const networks = os.networkInterfaces()
    const totalMemory = os.totalmem()
    const freeMemory = os.freemem()
    const memoryUsage = process.memoryUsage()
    const resourceUsage = process.resourceUsage?.()
    const userInfo = os.userInfo?.()
    const cpuUtilization = cpus.map(cpu => {
      const times = cpu.times || { user: 0, nice: 0, sys: 0, idle: 0, irq: 0 }
      const total = Object.values(times).reduce((sum, val) => sum + val, 0)
      const idle = times.idle || 0
      const usage = total > 0 ? Math.max(0, Math.min(100, ((total - idle) / total) * 100)) : 0
      return {
        model: cpu.model,
        speed: cpu.speed,
        usagePercent: Number(usage.toFixed(2))
      }
    })
    const avgCpuUsage = cpuUtilization.length
      ? Number((cpuUtilization.reduce((sum, item) => sum + item.usagePercent, 0) / cpuUtilization.length).toFixed(2))
      : 0
    return {
      ok: true,
      data: {
        platform: os.platform(),
        arch: os.arch(),
        release: os.release(),
        hostname: os.hostname(),
        type: os.type(),
        version: os.version?.(),
        endianness: os.endianness(),
        tmpdir: os.tmpdir(),
        homedir: os.homedir(),
        userInfo,
        uptimeSeconds: os.uptime(),
        bootTime: Date.now() - Math.floor(os.uptime() * 1000),
        cpuCount: cpus.length,
        cpuParallelism: os.availableParallelism ? os.availableParallelism() : cpus.length,
        cpuModel: cpus[0]?.model || '',
        cpuDetails: cpus.map(cpu => ({
          model: cpu.model,
          speed: cpu.speed,
          times: cpu.times
        })),
        cpuUtilization,
        avgCpuUsage,
        totalMemory,
        freeMemory,
        memoryUsage,
        resourceUsage,
        networkInterfaces: networks,
        processInfo: {
          pid: process.pid,
          node: process.version,
          execPath: process.execPath,
          platform: process.platform,
          arch: process.arch,
          uptimeSeconds: process.uptime(),
          cwd: process.cwd(),
          argv: process.argv,
          execArgv: process.execArgv,
          uid: typeof process.getuid === 'function' ? process.getuid() : null,
          gid: typeof process.getgid === 'function' ? process.getgid() : null
        }
      }
    }
  },
  buildSystemPrompt(result) {
    if (!result.ok || !result.data) return ''
    const data: any = result.data
    return `MCP 系统信息：平台 ${data.platform}/${data.arch}，CPU ${data.cpuCount} 核，内存剩余 ${(data.freeMemory / 1024 / 1024).toFixed(0)}MB`
  }
}
