import type {
  McServerAuditRecord,
  McServerCreateInput,
  McServerPublicConfig,
  McServerStatus,
  McServerUpdateInput
} from '@junction/types'

const base = '/mc-server'

export function listMcServers() {
  return api.get<McServerPublicConfig[]>(`${base}/servers`, {})
}

export function createMcServer(data: McServerCreateInput) {
  return api.post<McServerPublicConfig>(`${base}/servers`, data, {})
}

export function updateMcServer(id: string, data: McServerUpdateInput) {
  return api.patch<McServerPublicConfig>(`${base}/servers/${id}`, data)
}

export function removeMcServer(id: string) {
  return api.delete<{ id: string; deleted: true }>(`${base}/servers/${id}`)
}

export function reconnectMcServer(id: string) {
  return api.post<{ reconnected: true }>(`${base}/servers/${id}/reconnect`, {}, {})
}

export function getMcServerStatus(id: string, params?: { force?: boolean }) {
  return api.get<McServerStatus>(`${base}/servers/${id}/status`, params || {})
}

export function listMcSelectablePlayers(id: string) {
  return api.get<{ players: string[] }>(`${base}/servers/${id}/players/options`, {})
}

export function saveMcServer(id: string, data?: { flush?: boolean }) {
  return api.post<{ saved: true }>(`${base}/servers/${id}/save`, data || {}, {})
}

export function stopMcServer(id: string) {
  return api.post<{ stopped: boolean }>(`${base}/servers/${id}/stop`, {}, {})
}

export function sendMcSystemMessage(id: string, data: { message: string; players?: string[]; overlay?: boolean }) {
  return api.post<{ sent: boolean }>(`${base}/servers/${id}/system-message`, data, {})
}

export function kickMcPlayers(id: string, data: { players: string[]; message?: string | null }) {
  return api.post<{ kicked: Array<{ id?: string; name?: string }> }>(`${base}/servers/${id}/kick`, data, {})
}

export function getMcAllowList(id: string) {
  return api.get<{ players: Array<{ id?: string; name?: string }> }>(`${base}/servers/${id}/allowlist`, {})
}

export function addMcAllowList(id: string, data: { players: string[] }) {
  return api.post<{ players: Array<{ id?: string; name?: string }> }>(`${base}/servers/${id}/allowlist`, data, {})
}

export function removeMcAllowList(id: string, data: { players: string[] }) {
  return api.delete<{ players: Array<{ id?: string; name?: string }> }>(`${base}/servers/${id}/allowlist`, data)
}

export function getMcOperators(id: string) {
  return api.get<{ operators: Array<{ id?: string; name?: string; permissionLevel?: number; bypassesPlayerLimit?: boolean }> }>(`${base}/servers/${id}/operators`, {})
}

export function addMcOperators(id: string, data: { players: string[]; permissionLevel?: number; bypassesPlayerLimit?: boolean }) {
  return api.post<{ operators: Array<{ id?: string; name?: string; permissionLevel?: number; bypassesPlayerLimit?: boolean }> }>(`${base}/servers/${id}/operators`, data, {})
}

export function removeMcOperators(id: string, data: { players: string[] }) {
  return api.delete<{ operators: Array<{ id?: string; name?: string; permissionLevel?: number; bypassesPlayerLimit?: boolean }> }>(`${base}/servers/${id}/operators`, data)
}

export function getMcBans(id: string) {
  return api.get<{ bans: Array<{ id?: string; name?: string; reason?: string | null; source?: string | null; expires?: string | null }> }>(`${base}/servers/${id}/bans`, {})
}

export function addMcBans(id: string, data: { players: string[]; reason?: string | null; source?: string | null; expiresAt?: string | null }) {
  return api.post<{ bans: Array<{ id?: string; name?: string; reason?: string | null; source?: string | null; expires?: string | null }> }>(`${base}/servers/${id}/bans`, data, {})
}

export function removeMcBans(id: string, data: { players: string[] }) {
  return api.delete<{ bans: Array<{ id?: string; name?: string; reason?: string | null; source?: string | null; expires?: string | null }> }>(`${base}/servers/${id}/bans`, data)
}

export function updateMcGameRule(id: string, data: { key: string; value: string | number | boolean }) {
  return api.post<{ gameRule: { key: string; value: string | number | boolean; type: string } }>(`${base}/servers/${id}/gamerules`, data, {})
}

export function setMcServerSetting(id: string, data: { key: string; value: string | number | boolean }) {
  return api.post<{ setting: { key: string; value: unknown } }>(`${base}/servers/${id}/settings`, data, {})
}

export function callMcRpc(id: string, data: { method: string; params?: Record<string, any> | any[] }) {
  return api.post<{ result: unknown }>(`${base}/servers/${id}/rpc`, data, {})
}

export function listMcAudits(params?: { serverId?: string; limit?: number }) {
  return api.get<McServerAuditRecord[]>(`${base}/audits`, params || {})
}
