import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  OnModuleDestroy
} from '@nestjs/common'
import { randomUUID } from 'crypto'
import { PrismaValues } from '@junction/types'
import { PrismaService } from '../prisma/prisma.service'
import { McManagementAdapter } from './adapters/mc-management.adapter'
import type {
  McServerAuditRecord,
  McServerClientHandle,
  McServerConfig,
  McServerPublicConfig
} from './mc-server.types'

interface McServerRuntimeConnection {
  handle: McServerClientHandle
  updatedAt: number
}

@Injectable()
export class McServerService implements OnModuleDestroy {
  private readonly serverConfigs = new Map<string, McServerConfig>()
  private readonly connectionPool = new Map<string, McServerRuntimeConnection>()
  private readonly audits: McServerAuditRecord[] = []
  private readonly maxAuditRecords = 1000

  constructor(
    private readonly prisma: PrismaService,
    private readonly mcManagementAdapter: McManagementAdapter
  ) {
  }

  async onModuleDestroy() {
    this.connectionPool.forEach(connection => connection.handle.close())
    this.connectionPool.clear()
  }

  private getAdapter(protocol: McServerConfig['protocol']) {
    if (protocol === 'mc-management') return this.mcManagementAdapter
    throw new BadRequestException(`不支持的协议: ${protocol}`)
  }

  private sanitizeConfig(config: McServerConfig): McServerPublicConfig {
    return {
      id: config.id,
      name: config.name,
      protocol: config.protocol,
      url: config.url,
      enabled: config.enabled,
      tags: config.tags
    }
  }

  private assertValidServerUrl(urlRaw: string) {
    let url: URL
    try {
      url = new URL(urlRaw)
    } catch {
      throw new BadRequestException('服务器地址格式无效')
    }
    if (!['ws:', 'wss:'].includes(url.protocol)) {
      throw new BadRequestException('服务器地址必须使用 ws:// 或 wss://')
    }
  }

  private validateConfigInput(payload: Partial<McServerConfig>) {
    if (payload.name !== undefined && !String(payload.name).trim()) {
      throw new BadRequestException('服务器名称不能为空')
    }
    if (payload.url !== undefined) {
      const url = String(payload.url).trim()
      if (!url) throw new BadRequestException('服务器地址不能为空')
      this.assertValidServerUrl(url)
    }
    if (payload.token !== undefined && !String(payload.token).trim()) {
      throw new BadRequestException('服务器令牌不能为空')
    }
  }

  private async assertAdmin(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { role: true, accountType: true }
    })
    const isAdmin = user?.role?.toLowerCase() === 'admin' || user?.accountType === PrismaValues.UserAccountType.ADMIN
    if (!isAdmin) throw new ForbiddenException('仅管理员可访问 Minecraft 服务器管理')
  }

  async assertAdminAccess(userId: string) {
    await this.assertAdmin(userId)
  }

  private getServerConfigOrThrow(serverId: string) {
    const config = this.serverConfigs.get(serverId)
    if (!config) throw new NotFoundException('服务器不存在')
    return config
  }

  getServerPublicConfig(serverId: string) {
    const config = this.getServerConfigOrThrow(serverId)
    return this.sanitizeConfig(config)
  }

  private async getConnection(serverId: string, forceReconnect = false): Promise<McServerRuntimeConnection> {
    const config = this.getServerConfigOrThrow(serverId)
    if (!config.enabled) throw new BadRequestException('该服务器已禁用')
    if (!forceReconnect) {
      const current = this.connectionPool.get(serverId)
      if (current) {
        current.updatedAt = Date.now()
        return current
      }
    }
    this.connectionPool.get(serverId)?.handle.close()
    const adapter = this.getAdapter(config.protocol)
    let handle: McServerClientHandle
    try {
      handle = await adapter.connect(config)
    } catch (error: any) {
      throw new BadRequestException(this.formatConnectError(config.url, error))
    }
    const connection = { handle, updatedAt: Date.now() }
    this.connectionPool.set(serverId, connection)
    return connection
  }

  async getStatusForRealtime(serverId: string) {
    const connection = await this.getConnection(serverId)
    return connection.handle.getStatus(false)
  }

  async getRawConnectionForRealtime(serverId: string) {
    const connection = await this.getConnection(serverId)
    return (connection.handle as any).__rawConnection as unknown
  }

  private formatConnectError(url: string, error: any) {
    const message = error?.message ? String(error.message) : '未知错误'
    const code = error?.code ? String(error.code) : ''

    let protocol = ''
    try {
      protocol = new URL(url).protocol
    } catch {
      protocol = ''
    }

    const hints: string[] = []
    if (code === 'ECONNREFUSED') {
      hints.push('端口未监听或被防火墙拦截')
    }
    if (code === 'ECONNRESET' || /socket hang up/i.test(message)) {
      hints.push('连接被对端断开，常见原因是 ws/wss 协议不匹配或令牌错误')
    }
    if (protocol === 'ws:') {
      hints.push('如果 Minecraft 管理端启用了 TLS，请改用 wss://')
    }
    if (
      protocol === 'wss:' &&
      /(self signed|unable to verify|certificate|CERT_|tls)/i.test(message) &&
      !hints.includes('TLS 证书可能未被信任')
    ) {
      hints.push('TLS 证书可能未被信任（本地 localhost 已自动跳过校验）')
    }

    const hintText = hints.length ? `。建议：${hints.join('；')}` : ''
    return `连接管理服务器失败：${message}${code ? ` (code: ${code})` : ''}${hintText}`
  }

  private appendAudit(record: McServerAuditRecord) {
    this.audits.unshift(record)
    if (this.audits.length > this.maxAuditRecords) {
      this.audits.splice(this.maxAuditRecords)
    }
  }

  private async runWithAudit<T>(
    operatorId: string,
    serverId: string,
    action: string,
    input: Record<string, any> | undefined,
    runner: () => Promise<T>
  ): Promise<T> {
    const auditBase = {
      id: randomUUID(),
      operatorId,
      serverId,
      action,
      input,
      createdAt: new Date().toISOString()
    }
    try {
      const result = await runner()
      this.appendAudit({
        ...auditBase,
        success: true,
        output: this.pickAuditOutput(result)
      })
      return result
    } catch (error: any) {
      this.appendAudit({
        ...auditBase,
        success: false,
        error: error?.message || '操作失败'
      })
      throw error
    }
  }

  private pickAuditOutput(result: unknown): Record<string, any> | undefined {
    if (result === null || result === undefined) return undefined
    if (typeof result === 'object') return { result: JSON.parse(JSON.stringify(result)) }
    return { result }
  }

  private normalizeNameList(players: unknown): string[] {
    if (!Array.isArray(players)) return []
    return players.map(item => String(item || '').trim()).filter(Boolean)
  }

  private async getSelectablePlayerNames(serverId: string): Promise<string[]> {
    const connection = await this.getConnection(serverId)
    const [status, allowList, operators, bans] = await Promise.all([
      connection.handle.getStatus(),
      connection.handle.getAllowList(),
      connection.handle.getOperators(),
      connection.handle.getBans()
    ])
    const names = new Set<string>()
    status.players.forEach(item => item.name && names.add(item.name))
    allowList.forEach(item => item.name && names.add(item.name))
    operators.forEach(item => item.name && names.add(item.name))
    bans.forEach(item => item.name && names.add(item.name))
    return Array.from(names).sort((a, b) => a.localeCompare(b))
  }

  private async assertPlayersSelectable(serverId: string, players: string[]) {
    const selectable = await this.getSelectablePlayerNames(serverId)
    const selectableSet = new Set(selectable)
    const invalid = players.filter(player => !selectableSet.has(player))
    if (invalid.length > 0) {
      throw new BadRequestException(`存在未授权玩家选择: ${invalid.join(', ')}`)
    }
  }

  async listServers(userId: string) {
    await this.assertAdmin(userId)
    return Array.from(this.serverConfigs.values()).map(config => this.sanitizeConfig(config))
  }

  async createServer(userId: string, payload: {
    id?: string
    name: string
    protocol?: 'mc-management'
    url?: string
    token?: string
    enabled?: boolean
    tags?: string[]
  }) {
    await this.assertAdmin(userId)
    this.validateConfigInput(payload)
    const id = String(payload.id || randomUUID()).trim()
    if (this.serverConfigs.has(id)) throw new BadRequestException('服务器 ID 已存在')

    const url = String(payload.url || 'wss://localhost:25566').trim()
    const token = String(payload.token || '').trim()
    const enabled = payload.enabled !== false
    this.assertValidServerUrl(url)
    if (enabled && !token) throw new BadRequestException('启用服务器前必须配置令牌')

    const config: McServerConfig = {
      id,
      name: payload.name.trim(),
      protocol: payload.protocol || 'mc-management',
      url,
      token,
      enabled,
      tags: Array.isArray(payload.tags) ? payload.tags.map(tag => String(tag).trim()).filter(Boolean) : []
    }
    this.serverConfigs.set(id, config)
    return this.sanitizeConfig(config)
  }

  async updateServer(userId: string, serverId: string, payload: Partial<{
    name: string
    protocol: 'mc-management'
    url: string
    token: string
    enabled: boolean
    tags: string[]
  }>) {
    await this.assertAdmin(userId)
    this.validateConfigInput(payload)
    const current = this.getServerConfigOrThrow(serverId)
    const nextConfig: McServerConfig = {
      ...current,
      ...(payload.name !== undefined ? { name: payload.name.trim() } : {}),
      ...(payload.protocol !== undefined ? { protocol: payload.protocol } : {}),
      ...(payload.url !== undefined ? { url: payload.url.trim() } : {}),
      ...(payload.token !== undefined ? { token: payload.token.trim() } : {}),
      ...(payload.enabled !== undefined ? { enabled: payload.enabled } : {}),
      ...(payload.tags !== undefined ? { tags: payload.tags.map(tag => String(tag).trim()).filter(Boolean) } : {})
    }
    this.assertValidServerUrl(nextConfig.url)
    if (nextConfig.enabled && !nextConfig.token) {
      throw new BadRequestException('启用服务器前必须配置令牌')
    }

    this.serverConfigs.set(serverId, nextConfig)
    this.connectionPool.get(serverId)?.handle.close()
    this.connectionPool.delete(serverId)
    return this.sanitizeConfig(nextConfig)
  }

  async removeServer(userId: string, serverId: string) {
    await this.assertAdmin(userId)
    this.getServerConfigOrThrow(serverId)
    this.connectionPool.get(serverId)?.handle.close()
    this.connectionPool.delete(serverId)
    this.serverConfigs.delete(serverId)
    return { id: serverId, deleted: true }
  }

  async reconnectServer(userId: string, serverId: string) {
    await this.assertAdmin(userId)
    return this.runWithAudit(userId, serverId, 'server.reconnect', undefined, async () => {
      await this.getConnection(serverId, true)
      return { reconnected: true }
    })
  }

  async getStatus(userId: string, serverId: string, force = false) {
    await this.assertAdmin(userId)
    return this.runWithAudit(userId, serverId, 'server.status', { force }, async () => {
      const connection = await this.getConnection(serverId)
      return connection.handle.getStatus(force)
    })
  }

  async save(userId: string, serverId: string, flush = false) {
    await this.assertAdmin(userId)
    return this.runWithAudit(userId, serverId, 'server.save', { flush }, async () => {
      const connection = await this.getConnection(serverId)
      await connection.handle.save(flush)
      return { saved: true }
    })
  }

  async stop(userId: string, serverId: string) {
    await this.assertAdmin(userId)
    return this.runWithAudit(userId, serverId, 'server.stop', undefined, async () => {
      const connection = await this.getConnection(serverId)
      const stopped = await connection.handle.stop()
      return { stopped }
    })
  }

  async sendSystemMessage(userId: string, serverId: string, payload: {
    message: string
    players?: string[]
    overlay?: boolean
  }) {
    await this.assertAdmin(userId)
    if (!payload.message?.trim()) throw new BadRequestException('消息内容不能为空')
    const players = this.normalizeNameList(payload.players)
    if (players.length) await this.assertPlayersSelectable(serverId, players)
    return this.runWithAudit(userId, serverId, 'chat.system_message', { ...payload, players }, async () => {
      const connection = await this.getConnection(serverId)
      const sent = await connection.handle.sendSystemMessage(payload.message.trim(), players, payload.overlay)
      return { sent }
    })
  }

  async kickPlayers(userId: string, serverId: string, payload: { players: string[]; message?: string | null }) {
    await this.assertAdmin(userId)
    const players = this.normalizeNameList(payload.players)
    if (!players.length) throw new BadRequestException('至少需要一个玩家')
    await this.assertPlayersSelectable(serverId, players)
    return this.runWithAudit(userId, serverId, 'player.kick', { players }, async () => {
      const connection = await this.getConnection(serverId)
      const kicked = await connection.handle.kickPlayers(players, payload.message || null)
      return { kicked }
    })
  }

  async getAllowList(userId: string, serverId: string) {
    await this.assertAdmin(userId)
    return this.runWithAudit(userId, serverId, 'allowlist.get', undefined, async () => {
      const connection = await this.getConnection(serverId)
      const players = await connection.handle.getAllowList()
      return { players }
    })
  }

  async addAllowList(userId: string, serverId: string, payload: { players: string[] }) {
    await this.assertAdmin(userId)
    const players = this.normalizeNameList(payload.players)
    if (!players.length) throw new BadRequestException('至少需要一个玩家')
    await this.assertPlayersSelectable(serverId, players)
    return this.runWithAudit(userId, serverId, 'allowlist.add', { players }, async () => {
      const connection = await this.getConnection(serverId)
      const list = await connection.handle.addAllowList(players)
      return { players: list }
    })
  }

  async removeAllowList(userId: string, serverId: string, payload: { players: string[] }) {
    await this.assertAdmin(userId)
    const players = this.normalizeNameList(payload.players)
    if (!players.length) throw new BadRequestException('至少需要一个玩家')
    await this.assertPlayersSelectable(serverId, players)
    return this.runWithAudit(userId, serverId, 'allowlist.remove', { players }, async () => {
      const connection = await this.getConnection(serverId)
      const list = await connection.handle.removeAllowList(players)
      return { players: list }
    })
  }

  async getOperators(userId: string, serverId: string) {
    await this.assertAdmin(userId)
    return this.runWithAudit(userId, serverId, 'operator.get', undefined, async () => {
      const connection = await this.getConnection(serverId)
      const operators = await connection.handle.getOperators()
      return { operators }
    })
  }

  async addOperators(userId: string, serverId: string, payload: {
    players: string[]
    permissionLevel?: number
    bypassesPlayerLimit?: boolean
  }) {
    await this.assertAdmin(userId)
    const players = this.normalizeNameList(payload.players)
    if (!players.length) throw new BadRequestException('至少需要一个玩家')
    await this.assertPlayersSelectable(serverId, players)
    return this.runWithAudit(
      userId,
      serverId,
      'operator.add',
      { players, permissionLevel: payload.permissionLevel, bypassesPlayerLimit: payload.bypassesPlayerLimit },
      async () => {
        const connection = await this.getConnection(serverId)
        const operators = await connection.handle.addOperators(players, payload.permissionLevel, payload.bypassesPlayerLimit)
        return { operators }
      }
    )
  }

  async removeOperators(userId: string, serverId: string, payload: { players: string[] }) {
    await this.assertAdmin(userId)
    const players = this.normalizeNameList(payload.players)
    if (!players.length) throw new BadRequestException('至少需要一个玩家')
    await this.assertPlayersSelectable(serverId, players)
    return this.runWithAudit(userId, serverId, 'operator.remove', { players }, async () => {
      const connection = await this.getConnection(serverId)
      const operators = await connection.handle.removeOperators(players)
      return { operators }
    })
  }

  async getBans(userId: string, serverId: string) {
    await this.assertAdmin(userId)
    return this.runWithAudit(userId, serverId, 'ban.get', undefined, async () => {
      const connection = await this.getConnection(serverId)
      const bans = await connection.handle.getBans()
      return { bans }
    })
  }

  async addBans(userId: string, serverId: string, payload: {
    players: string[]
    reason?: string | null
    source?: string | null
    expiresAt?: string | null
  }) {
    await this.assertAdmin(userId)
    const players = this.normalizeNameList(payload.players)
    if (!players.length) throw new BadRequestException('至少需要一个玩家')
    await this.assertPlayersSelectable(serverId, players)
    return this.runWithAudit(userId, serverId, 'ban.add', { ...payload, players }, async () => {
      const connection = await this.getConnection(serverId)
      const bans = await connection.handle.addBans(players, payload.reason, payload.source, payload.expiresAt)
      return { bans }
    })
  }

  async removeBans(userId: string, serverId: string, payload: { players: string[] }) {
    await this.assertAdmin(userId)
    const players = this.normalizeNameList(payload.players)
    if (!players.length) throw new BadRequestException('至少需要一个玩家')
    await this.assertPlayersSelectable(serverId, players)
    return this.runWithAudit(userId, serverId, 'ban.remove', { players }, async () => {
      const connection = await this.getConnection(serverId)
      const bans = await connection.handle.removeBans(players)
      return { bans }
    })
  }

  async updateGameRule(userId: string, serverId: string, payload: { key: string; value: string | number | boolean }) {
    await this.assertAdmin(userId)
    if (!payload.key?.trim()) throw new BadRequestException('游戏规则 key 不能为空')
    return this.runWithAudit(userId, serverId, 'gamerule.update', payload, async () => {
      const connection = await this.getConnection(serverId)
      const gameRule = await connection.handle.updateGameRule(payload.key.trim(), payload.value)
      return { gameRule }
    })
  }

  async setServerSetting(userId: string, serverId: string, payload: { key: string; value: string | number | boolean }) {
    await this.assertAdmin(userId)
    if (!payload.key?.trim()) throw new BadRequestException('设置项 key 不能为空')
    return this.runWithAudit(userId, serverId, 'setting.update', payload, async () => {
      const connection = await this.getConnection(serverId)
      const setting = await connection.handle.setServerSetting(payload.key.trim(), payload.value)
      return { setting }
    })
  }

  async rpc(userId: string, serverId: string, payload: { method: string; params?: Record<string, any> | any[] }) {
    await this.assertAdmin(userId)
    if (!payload.method?.trim()) throw new BadRequestException('RPC 方法名不能为空')
    return this.runWithAudit(userId, serverId, 'rpc.call', { method: payload.method, params: payload.params }, async () => {
      const connection = await this.getConnection(serverId)
      const result = await connection.handle.rpc(payload.method.trim(), payload.params)
      return { result }
    })
  }

  async listAudits(userId: string, params?: { serverId?: string; limit?: number }) {
    await this.assertAdmin(userId)
    const limit = Math.max(1, Math.min(200, Number(params?.limit || 50)))
    const serverId = params?.serverId?.trim()
    const filtered = serverId ? this.audits.filter(item => item.serverId === serverId) : this.audits
    return filtered.slice(0, limit)
  }

  async listSelectablePlayers(userId: string, serverId: string) {
    await this.assertAdmin(userId)
    const players = await this.getSelectablePlayerNames(serverId)
    return { players }
  }
}
