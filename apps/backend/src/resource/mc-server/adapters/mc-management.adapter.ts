import { Injectable } from '@nestjs/common'
import {
  MinecraftServer,
  Player,
  WebSocketConnection,
  type NodeWebSocketConnection
} from 'mc-server-management'
import type { McServerAdapter } from './mc-server.adapter'
import type { McServerClientHandle, McServerConfig } from '../mc-server.types'

@Injectable()
export class McManagementAdapter implements McServerAdapter {
  readonly protocol = 'mc-management' as const

  async connect(config: McServerConfig): Promise<McServerClientHandle> {
    const url = new URL(config.url)

    // Minecraft 管理端常见为本地自签证书；仅对 localhost 放行证书校验，避免误伤远端安全性。
    const wsOptions =
      url.protocol === 'wss:' && (url.hostname === 'localhost' || url.hostname === '127.0.0.1')
        ? { rejectUnauthorized: false }
        : undefined

    const connection = await WebSocketConnection.connect(config.url, config.token, {
      // 后端接口是“按需连接”，默认不做自动重连，避免后台无限重试刷屏。
      reconnect: false,
      max_reconnects: 0,
      ...(wsOptions || {})
    })

    // mc-server-management 会在没有 error 监听器时打印 “Unhandled connection error”。
    // 这里吞掉连接层错误，业务错误由上层 service/controller 返回给前端。
    ;(connection as any).on?.('error', () => { })
    const server = new MinecraftServer(connection)

    return this.buildHandle(connection as NodeWebSocketConnection, server)
  }

  private buildHandle(connection: NodeWebSocketConnection, server: MinecraftServer): McServerClientHandle {
    return {
      close: () => connection.close(),
      getStatus: async (force?: boolean) => {
        const status = await server.getStatus(force)
        return {
          started: status.started,
          version: {
            name: status.version.name,
            protocol: status.version.protocol
          },
          players: status.players.map(player => ({ id: player.id, name: player.name }))
        }
      },
      sendSystemMessage: (message: string, players?: string[], overlay?: boolean) => {
        const targets = players?.length ? players.map(name => Player.withName(name)) : undefined
        return server.sendSystemMessage(message, targets, overlay)
      },
      save: async (flush?: boolean) => {
        await server.save(flush)
      },
      stop: () => server.stop(),
      kickPlayers: async (players: string[], message?: string | null) => {
        const kicked = await server.kickPlayers(players.map(name => Player.withName(name)), message || null)
        return kicked.map(player => ({ id: player.id, name: player.name }))
      },
      getAllowList: async () => {
        const players = await server.allowlist().get()
        return players.map(player => ({ id: player.id, name: player.name }))
      },
      addAllowList: async (players: string[]) => {
        const allowList = await server.allowlist().add(players.map(name => Player.withName(name)))
        const list = await allowList.get()
        return list.map(player => ({ id: player.id, name: player.name }))
      },
      removeAllowList: async (players: string[]) => {
        const allowList = await server.allowlist().remove(players.map(name => Player.withName(name)))
        const list = await allowList.get()
        return list.map(player => ({ id: player.id, name: player.name }))
      },
      getOperators: async () => {
        const operators = await server.operatorList().get()
        return operators.map(operator => ({
          id: operator.player.id,
          name: operator.player.name,
          permissionLevel: operator.permissionLevel,
          bypassesPlayerLimit: operator.bypassesPlayerLimit
        }))
      },
      addOperators: async (players: string[], permissionLevel?: number, bypassesPlayerLimit?: boolean) => {
        const operatorList = await server.operatorList().add(
          players.map(name => Player.withName(name)),
          permissionLevel,
          bypassesPlayerLimit
        )
        const operators = await operatorList.get()
        return operators.map(operator => ({
          id: operator.player.id,
          name: operator.player.name,
          permissionLevel: operator.permissionLevel,
          bypassesPlayerLimit: operator.bypassesPlayerLimit
        }))
      },
      removeOperators: async (players: string[]) => {
        const operatorList = await server.operatorList().remove(players.map(name => Player.withName(name)))
        const operators = await operatorList.get()
        return operators.map(operator => ({
          id: operator.player.id,
          name: operator.player.name,
          permissionLevel: operator.permissionLevel,
          bypassesPlayerLimit: operator.bypassesPlayerLimit
        }))
      },
      getBans: async () => {
        const bans = await server.banList().get()
        return bans.map(ban => ({
          id: ban.player.id,
          name: ban.player.name,
          reason: ban.reason,
          source: ban.source,
          expires: ban.expires
        }))
      },
      addBans: async (players: string[], reason?: string | null, source?: string | null, expiresAt?: string | null) => {
        const expires = expiresAt ? new Date(expiresAt) : null
        const banList = await server.banList().add(players.map(name => Player.withName(name)), reason, source, expires)
        const bans = await banList.get()
        return bans.map(ban => ({
          id: ban.player.id,
          name: ban.player.name,
          reason: ban.reason,
          source: ban.source,
          expires: ban.expires
        }))
      },
      removeBans: async (players: string[]) => {
        const banList = await server.banList().remove(players.map(name => Player.withName(name)))
        const bans = await banList.get()
        return bans.map(ban => ({
          id: ban.player.id,
          name: ban.player.name,
          reason: ban.reason,
          source: ban.source,
          expires: ban.expires
        }))
      },
      updateGameRule: async (key: string, value: string | number | boolean) => {
        const gameRule = await server.updateGameRule(key, value)
        return {
          key: gameRule.key,
          value: gameRule.value,
          type: gameRule.type
        }
      },
      setServerSetting: async (key: string, value: string | number | boolean) => {
        const settings = server.settings() as Record<string, any>
        const normalized = key.trim()
        const setterName = `set${normalized.charAt(0).toUpperCase()}${normalized.slice(1)}`
        const getterName = `get${normalized.charAt(0).toUpperCase()}${normalized.slice(1)}`
        const setter = settings[setterName]
        if (typeof setter !== 'function') {
          throw new Error(`未知设置项：${normalized}`)
        }
        await setter.call(settings, value)
        const getter = settings[getterName]
        const result = typeof getter === 'function' ? await getter.call(settings) : value
        return { key: normalized, value: result }
      },
      rpc: (method: string, params?: Record<string, any> | any[]) => {
        return connection.call(method, params || {})
      }
    }
  }
}
