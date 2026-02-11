import type { McServerService } from '@junction/backend/src/resource/mc-server/mc-server.service'

const base = '/mc-server'

export function listMcServers() {
  return api.get<AwaitedReturnType<McServerService['listServers']>>(`${base}/servers`, {})
}

export function createMcServer(data: Parameters<McServerService['createServer']>[1]) {
  return api.post<AwaitedReturnType<McServerService['createServer']>>(`${base}/servers`, data, {})
}

export function updateMcServer(id: string, data: Parameters<McServerService['updateServer']>[2]) {
  return api.patch<AwaitedReturnType<McServerService['updateServer']>>(`${base}/servers/${id}`, data)
}

export function removeMcServer(id: string) {
  return api.delete<AwaitedReturnType<McServerService['removeServer']>>(`${base}/servers/${id}`)
}

export function reconnectMcServer(id: string) {
  return api.post<AwaitedReturnType<McServerService['reconnectServer']>>(`${base}/servers/${id}/reconnect`, {}, {})
}

export function getMcServerStatus(id: string, params?: { force?: boolean }) {
  return api.get<AwaitedReturnType<McServerService['getStatus']>>(`${base}/servers/${id}/status`, params || {})
}

export function listMcSelectablePlayers(id: string) {
  return api.get<AwaitedReturnType<McServerService['listSelectablePlayers']>>(`${base}/servers/${id}/players/options`, {})
}

export function saveMcServer(id: string, data?: { flush?: boolean }) {
  return api.post<AwaitedReturnType<McServerService['save']>>(`${base}/servers/${id}/save`, data || {}, {})
}

export function stopMcServer(id: string) {
  return api.post<AwaitedReturnType<McServerService['stop']>>(`${base}/servers/${id}/stop`, {}, {})
}

export function sendMcSystemMessage(id: string, data: Parameters<McServerService['sendSystemMessage']>[2]) {
  return api.post<AwaitedReturnType<McServerService['sendSystemMessage']>>(`${base}/servers/${id}/system-message`, data, {})
}

export function kickMcPlayers(id: string, data: Parameters<McServerService['kickPlayers']>[2]) {
  return api.post<AwaitedReturnType<McServerService['kickPlayers']>>(`${base}/servers/${id}/kick`, data, {})
}

export function getMcAllowList(id: string) {
  return api.get<AwaitedReturnType<McServerService['getAllowList']>>(`${base}/servers/${id}/allowlist`, {})
}

export function addMcAllowList(id: string, data: Parameters<McServerService['addAllowList']>[2]) {
  return api.post<AwaitedReturnType<McServerService['addAllowList']>>(`${base}/servers/${id}/allowlist`, data, {})
}

export function removeMcAllowList(id: string, data: Parameters<McServerService['removeAllowList']>[2]) {
  return api.delete<AwaitedReturnType<McServerService['removeAllowList']>>(`${base}/servers/${id}/allowlist`, data)
}

export function getMcOperators(id: string) {
  return api.get<AwaitedReturnType<McServerService['getOperators']>>(`${base}/servers/${id}/operators`, {})
}

export function addMcOperators(id: string, data: Parameters<McServerService['addOperators']>[2]) {
  return api.post<AwaitedReturnType<McServerService['addOperators']>>(`${base}/servers/${id}/operators`, data, {})
}

export function removeMcOperators(id: string, data: Parameters<McServerService['removeOperators']>[2]) {
  return api.delete<AwaitedReturnType<McServerService['removeOperators']>>(`${base}/servers/${id}/operators`, data)
}

export function getMcBans(id: string) {
  return api.get<AwaitedReturnType<McServerService['getBans']>>(`${base}/servers/${id}/bans`, {})
}

export function addMcBans(id: string, data: Parameters<McServerService['addBans']>[2]) {
  return api.post<AwaitedReturnType<McServerService['addBans']>>(`${base}/servers/${id}/bans`, data, {})
}

export function removeMcBans(id: string, data: Parameters<McServerService['removeBans']>[2]) {
  return api.delete<AwaitedReturnType<McServerService['removeBans']>>(`${base}/servers/${id}/bans`, data)
}

export function updateMcGameRule(id: string, data: Parameters<McServerService['updateGameRule']>[2]) {
  return api.post<AwaitedReturnType<McServerService['updateGameRule']>>(`${base}/servers/${id}/gamerules`, data, {})
}

export function setMcServerSetting(id: string, data: Parameters<McServerService['setServerSetting']>[2]) {
  return api.post<AwaitedReturnType<McServerService['setServerSetting']>>(`${base}/servers/${id}/settings`, data, {})
}

export function callMcRpc(id: string, data: Parameters<McServerService['rpc']>[2]) {
  return api.post<AwaitedReturnType<McServerService['rpc']>>(`${base}/servers/${id}/rpc`, data, {})
}

export function listMcAudits(params?: { serverId?: string; limit?: number }) {
  return api.get<AwaitedReturnType<McServerService['listAudits']>>(`${base}/audits`, params || {})
}
