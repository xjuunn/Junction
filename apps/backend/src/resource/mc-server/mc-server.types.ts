export type McServerProtocol = 'mc-management'

export interface McServerConfig {
  id: string
  name: string
  protocol: McServerProtocol
  url: string
  token: string
  enabled: boolean
  tags: string[]
}

export interface McServerPublicConfig {
  id: string
  name: string
  protocol: McServerProtocol
  url: string
  enabled: boolean
  tags: string[]
}

export interface McServerPlayer {
  id?: string
  name?: string
}

export interface McServerStatus {
  started: boolean
  version: {
    name: string
    protocol: number
  }
  players: McServerPlayer[]
}

export interface McServerAuditRecord {
  id: string
  serverId: string
  action: string
  operatorId: string
  success: boolean
  input?: Record<string, any>
  output?: Record<string, any>
  error?: string
  createdAt: string
}

export interface McServerClientHandle {
  close: () => void
  getStatus: (force?: boolean) => Promise<McServerStatus>
  sendSystemMessage: (message: string, players?: string[], overlay?: boolean) => Promise<boolean>
  save: (flush?: boolean) => Promise<void>
  stop: () => Promise<boolean>
  kickPlayers: (players: string[], message?: string | null) => Promise<McServerPlayer[]>
  getAllowList: () => Promise<McServerPlayer[]>
  addAllowList: (players: string[]) => Promise<McServerPlayer[]>
  removeAllowList: (players: string[]) => Promise<McServerPlayer[]>
  getOperators: () => Promise<Array<{ id?: string; name?: string; permissionLevel?: number; bypassesPlayerLimit?: boolean }>>
  addOperators: (players: string[], permissionLevel?: number, bypassesPlayerLimit?: boolean) => Promise<Array<{ id?: string; name?: string; permissionLevel?: number; bypassesPlayerLimit?: boolean }>>
  removeOperators: (players: string[]) => Promise<Array<{ id?: string; name?: string; permissionLevel?: number; bypassesPlayerLimit?: boolean }>>
  getBans: () => Promise<Array<{ id?: string; name?: string; reason?: string | null; source?: string | null; expires?: string | null }>>
  addBans: (players: string[], reason?: string | null, source?: string | null, expiresAt?: string | null) => Promise<Array<{ id?: string; name?: string; reason?: string | null; source?: string | null; expires?: string | null }>>
  removeBans: (players: string[]) => Promise<Array<{ id?: string; name?: string; reason?: string | null; source?: string | null; expires?: string | null }>>
  updateGameRule: (key: string, value: string | number | boolean) => Promise<{ key: string; value: string | number | boolean; type: string }>
  setServerSetting: (key: string, value: string | number | boolean) => Promise<{ key: string; value: unknown }>
  rpc: (method: string, params?: Record<string, any> | any[]) => Promise<unknown>
}

