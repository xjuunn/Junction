import {
  ConnectedSocket,
  MessageBody,
  OnGatewayDisconnect,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer
} from '@nestjs/websockets'
import { Logger } from '@nestjs/common'
import { Server, Socket } from 'socket.io'
import { Notifications } from 'mc-server-management'
import { WsUser } from '~/decorators/ws-user.decorator'
import type { McServerPublicConfig, McServerStatus } from './mc-server.types'
import { McServerService } from './mc-server.service'

type McRealtimeStatusPayload =
  | { serverId: string; fetchedAt: string; config: McServerPublicConfig; status: McServerStatus | null; error?: string }

type McRealtimeNotificationPayload = { serverId: string; receivedAt: string; event: string; data: any }

@WebSocketGateway({ namespace: 'app', cors: true })
export class McServerGateway implements OnGatewayDisconnect {
  @WebSocketServer()
  private readonly server!: Server

  private readonly logger = new Logger(McServerGateway.name)

  private readonly subscribers = new Map<string, Map<string, string>>() // serverId -> socketId -> userId
  private readonly statusTimers = new Map<string, NodeJS.Timeout>()
  private readonly boundRawConnections = new Map<string, any>() // serverId -> rawConnection
  private readonly unbinders = new Map<string, () => void>() // serverId -> unbind

  private readonly eventBuffers = new Map<string, McRealtimeNotificationPayload[]>()
  private readonly maxBufferedEvents = 200

  constructor(private readonly mcServerService: McServerService) { }

  async handleDisconnect(client: Socket) {
    for (const [serverId, members] of this.subscribers.entries()) {
      if (!members.has(client.id)) continue
      members.delete(client.id)
      if (members.size === 0) {
        this.subscribers.delete(serverId)
        this.stopRealtime(serverId)
      }
    }
  }

  @SubscribeMessage('mc-server:subscribe')
  async subscribe(
    @WsUser('id') userId: string,
    @ConnectedSocket() client: Socket,
    @MessageBody() body: { serverId?: string }
  ) {
    try {
      await this.mcServerService.assertAdminAccess(userId)
    } catch (error: any) {
      return { ok: false, error: error?.message || '无权限访问' }
    }

    const serverId = String(body?.serverId || '').trim()
    if (!serverId) return { ok: false, error: 'serverId 不能为空' }

    let config: McServerPublicConfig
    try {
      config = this.mcServerService.getServerPublicConfig(serverId)
    } catch (error: any) {
      return { ok: false, error: error?.message || '服务器不存在' }
    }

    client.join(this.room(serverId))
    this.addSubscriber(serverId, client.id, userId)

    // 立即推一次状态（不强求成功），避免前端首屏空白。
    const initial = await this.fetchStatusSnapshot(serverId, config)
    this.server.to(this.room(serverId)).emit('mc-server:status', initial)

    await this.ensureBindings(serverId, config)
    this.ensureStatusTimer(serverId)

    return {
      ok: true,
      serverId,
      config,
      status: initial.status,
      error: initial.error,
      events: this.eventBuffers.get(serverId) || []
    }
  }

  @SubscribeMessage('mc-server:unsubscribe')
  async unsubscribe(
    @WsUser('id') userId: string,
    @ConnectedSocket() client: Socket,
    @MessageBody() body: { serverId?: string }
  ) {
    try {
      await this.mcServerService.assertAdminAccess(userId)
    } catch (error: any) {
      return { ok: false, error: error?.message || '无权限访问' }
    }

    const serverId = String(body?.serverId || '').trim()
    if (!serverId) return { ok: false, error: 'serverId 不能为空' }

    client.leave(this.room(serverId))
    const members = this.subscribers.get(serverId)
    members?.delete(client.id)

    if (members && members.size === 0) {
      this.subscribers.delete(serverId)
      this.stopRealtime(serverId)
    }

    return { ok: true, serverId }
  }

  private room(serverId: string) {
    return `mc-server:${serverId}`
  }

  private addSubscriber(serverId: string, socketId: string, userId: string) {
    if (!this.subscribers.has(serverId)) this.subscribers.set(serverId, new Map())
    this.subscribers.get(serverId)!.set(socketId, userId)
  }

  private hasSubscribers(serverId: string) {
    return (this.subscribers.get(serverId)?.size || 0) > 0
  }

  private ensureStatusTimer(serverId: string) {
    if (this.statusTimers.has(serverId)) return
    const timer = setInterval(async () => {
      if (!this.hasSubscribers(serverId)) {
        this.stopRealtime(serverId)
        return
      }

      let config: McServerPublicConfig
      try {
        config = this.mcServerService.getServerPublicConfig(serverId)
      } catch {
        this.stopRealtime(serverId)
        return
      }

      const snapshot = await this.fetchStatusSnapshot(serverId, config)
      this.server.to(this.room(serverId)).emit('mc-server:status', snapshot)

      await this.ensureBindings(serverId, config)
    }, 2000)

    this.statusTimers.set(serverId, timer)
  }

  private async fetchStatusSnapshot(serverId: string, config: McServerPublicConfig): Promise<McRealtimeStatusPayload> {
    const fetchedAt = new Date().toISOString()

    if (!config.enabled) {
      return { serverId, fetchedAt, config, status: null, error: '该服务器已禁用' }
    }

    try {
      const status = (await this.mcServerService.getStatusForRealtime(serverId)) as McServerStatus
      return { serverId, fetchedAt, config, status }
    } catch (error: any) {
      return { serverId, fetchedAt, config, status: null, error: error?.message || '获取状态失败' }
    }
  }

  private async ensureBindings(serverId: string, config: McServerPublicConfig) {
    if (!this.hasSubscribers(serverId)) return
    if (!config.enabled) {
      this.unbind(serverId)
      return
    }

    let raw: any
    try {
      raw = await this.mcServerService.getRawConnectionForRealtime(serverId)
    } catch {
      return
    }

    const current = this.boundRawConnections.get(serverId)
    if (current === raw) return

    this.unbind(serverId)
    this.boundRawConnections.set(serverId, raw)

    const off: Array<() => void> = []
    const bind = (event: string, handler: (...args: any[]) => void) => {
      raw.on(event, handler)
      off.push(() => raw.off?.(event, handler) || raw.removeListener?.(event, handler))
    }

    const pushEvent = (event: string, data: any) => {
      const payload: McRealtimeNotificationPayload = {
        serverId,
        receivedAt: new Date().toISOString(),
        event,
        data
      }
      const buf = this.eventBuffers.get(serverId) || []
      buf.unshift(payload)
      if (buf.length > this.maxBufferedEvents) buf.splice(this.maxBufferedEvents)
      this.eventBuffers.set(serverId, buf)
      this.server.to(this.room(serverId)).emit('mc-server:notification', payload)
    }

    for (const evt of Object.values(Notifications)) {
      bind(String(evt), (data: any) => pushEvent(String(evt), data))
    }

    bind('close', (code: any, reason: any) => pushEvent('connection.close', { code, reason }))
    bind('error', (err: any) => pushEvent('connection.error', { message: err?.message || String(err || '') }))

    this.unbinders.set(serverId, () => off.forEach(fn => fn()))
    this.logger.log(`Minecraft 实时监听已绑定: ${serverId}`)
  }

  private unbind(serverId: string) {
    this.unbinders.get(serverId)?.()
    this.unbinders.delete(serverId)
    this.boundRawConnections.delete(serverId)
  }

  private stopRealtime(serverId: string) {
    this.statusTimers.get(serverId) && clearInterval(this.statusTimers.get(serverId)!)
    this.statusTimers.delete(serverId)
    this.unbind(serverId)
    this.eventBuffers.delete(serverId)
  }
}

