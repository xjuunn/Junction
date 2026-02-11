<script setup lang="ts">
import type { McServerAuditRecord, McServerPublicConfig, McServerStatus } from '@junction/types'
import { SocketClient } from '~/core/socket/socket.client'
import * as mcApi from '~/api/mc-server'
import { useDialog } from '~/composables/useDialog'

definePageMeta({ layout: 'main' })

const toast = useToast()
const route = useRoute()
const router = useRouter()
const settings = useSettingsStore()
const dialog = useDialog()

const serverId = computed(() => String(route.params.id || '').trim())

const loading = ref(false)
const working = ref(false)

const config = ref<McServerPublicConfig | null>(null)
const status = ref<McServerStatus | null>(null)
const lastFetchedAt = ref<string>('')
const connectError = ref<string>('')

const events = ref<Array<{ serverId: string; receivedAt: string; event: string; data: any }>>([])
const maxEvents = 200

const selectablePlayers = ref<string[]>([])

const socket = SocketClient.getInstance('app')
let offStatus: null | (() => void) = null
let offEvent: null | (() => void) = null

const systemMessageModal = reactive({
  show: false,
  message: '',
  overlay: false,
  players: [] as string[],
})

const kickModal = reactive({
  show: false,
  message: '',
  players: [] as string[],
})

type McPanel = 'overview' | 'allowlist' | 'operators' | 'bans' | 'rules' | 'rpc' | 'audit'
type McNamedPlayer = { id?: string; name?: string }
type McOperator = { id?: string; name?: string; permissionLevel?: number; bypassesPlayerLimit?: boolean }
type McBan = { id?: string; name?: string; reason?: string | null; source?: string | null; expires?: string | null }
type McActionKey =
  | 'server.reconnect'
  | 'server.save'
  | 'server.stop'
  | 'server.enable'
  | 'status.refresh'
  | 'chat.system'
  | 'player.kick'
  | 'allowlist.get'
  | 'allowlist.add'
  | 'allowlist.remove'
  | 'operator.get'
  | 'operator.add'
  | 'operator.remove'
  | 'ban.get'
  | 'ban.add'
  | 'ban.remove'
  | 'gamerule.update'
  | 'setting.update'
  | 'rpc.call'
  | 'audit.list'

type McActionPayloadMap = {
  'server.reconnect': {}
  'server.save': { flush?: boolean }
  'server.stop': {}
  'server.enable': { token: string }
  'status.refresh': { force?: boolean }
  'chat.system': { message: string; players?: string[]; overlay?: boolean }
  'player.kick': { players: string[]; message?: string | null }
  'allowlist.get': {}
  'allowlist.add': { players: string[] }
  'allowlist.remove': { players: string[] }
  'operator.get': {}
  'operator.add': { players: string[]; permissionLevel?: number; bypassesPlayerLimit?: boolean }
  'operator.remove': { players: string[] }
  'ban.get': {}
  'ban.add': { players: string[]; reason?: string | null; source?: string | null; expiresAt?: string | null }
  'ban.remove': { players: string[] }
  'gamerule.update': { key: string; value: string | number | boolean }
  'setting.update': { key: string; value: string | number | boolean }
  'rpc.call': { method: string; params?: Record<string, any> | any[] }
  'audit.list': { limit?: number }
}

const activePanel = ref<McPanel>('overview')

const allowList = ref<McNamedPlayer[]>([])
const allowListSelection = ref<string[]>([])
const allowListAddSelection = ref<string[]>([])
const loadingAllowList = ref(false)

const operators = ref<McOperator[]>([])
const operatorSelection = ref<string[]>([])
const operatorAddSelection = ref<string[]>([])
const operatorPermissionLevel = ref(4)
const operatorBypassesLimit = ref(false)
const loadingOperators = ref(false)

const bans = ref<McBan[]>([])
const banSelection = ref<string[]>([])
const banAddSelection = ref<string[]>([])
const banReason = ref('')
const banSource = ref('')
const banExpiresAt = ref('')
const loadingBans = ref(false)

const gameRuleForm = reactive({
  key: '',
  valueType: 'string' as 'string' | 'number' | 'boolean',
  value: '',
})

const serverSettingForm = reactive({
  key: '',
  valueType: 'string' as 'string' | 'number' | 'boolean',
  value: '',
})

const rpcForm = reactive({
  method: '',
  paramsText: '',
})
const rpcResult = ref<unknown>(null)
const rpcError = ref('')
const rpcRunning = ref(false)

const audits = ref<McServerAuditRecord[]>([])
const auditLimit = ref(50)
const loadingAudits = ref(false)
const realtimePlayers = ref<string[]>([])
const chatMessages = ref<Array<{ id: string; receivedAt: string; sender: string; content: string; event: string }>>([])
const maxChatMessages = 300
const quickChat = reactive({
  message: '',
  overlay: false,
  players: [] as string[],
})
const eventKeyword = ref('')
const chatKeyword = ref('')

const mergedPlayerOptions = computed(() => {
  return uniqueNames([...selectablePlayers.value, ...realtimePlayers.value]).sort((a, b) => a.localeCompare(b, 'zh-CN'))
})

const filteredEvents = computed(() => {
  const keyword = eventKeyword.value.trim().toLowerCase()
  if (!keyword) return events.value
  return events.value.filter(item => {
    const eventText = String(item.event || '').toLowerCase()
    const dataText = JSON.stringify(item.data || {}).toLowerCase()
    return eventText.includes(keyword) || dataText.includes(keyword)
  })
})

const filteredChatMessages = computed(() => {
  const keyword = chatKeyword.value.trim().toLowerCase()
  if (!keyword) return chatMessages.value
  return chatMessages.value.filter(item => {
    const senderText = String(item.sender || '').toLowerCase()
    const contentText = String(item.content || '').toLowerCase()
    const eventText = String(item.event || '').toLowerCase()
    return senderText.includes(keyword) || contentText.includes(keyword) || eventText.includes(keyword)
  })
})

const canOperateServer = computed(() => !!config.value?.enabled && !working.value)

const togglePlayer = (list: string[], player: string) => {
  const set = new Set(list)
  if (set.has(player)) set.delete(player)
  else set.add(player)
  return Array.from(set)
}

const playerName = (item?: { id?: string; name?: string } | null) => {
  return String(item?.name || item?.id || '').trim()
}

const formatDateTime = (value?: string | null) => {
  const text = String(value || '').trim()
  if (!text) return '-'
  const date = new Date(text)
  if (Number.isNaN(date.getTime())) return text
  return `${date.toLocaleDateString('zh-CN')} ${date.toLocaleTimeString('zh-CN', { hour12: false })}`
}

const getErrorMessage = (error: any) => {
  return String(
    error?.data?.message ||
    error?.response?._data?.message ||
    error?.message ||
    '操作失败'
  ).trim()
}

const getNormalizedPlayerName = (input: any) => {
  if (!input) return ''
  if (typeof input === 'string') return input.trim()
  if (typeof input === 'object') return String(input.name || input.id || '').trim()
  return String(input).trim()
}

const uniqueNames = (list: string[]) => Array.from(new Set(list.map(item => item.trim()).filter(Boolean)))

const syncPlayersFromStatus = (value?: McServerStatus | null) => {
  const names = uniqueNames((value?.players || []).map(item => getNormalizedPlayerName(item)))
  realtimePlayers.value = names
}

const appendChatMessage = (payload: { receivedAt?: string; sender?: string; content: string; event: string }) => {
  const content = String(payload.content || '').trim()
  if (!content) return
  chatMessages.value.unshift({
    id: `${payload.receivedAt || new Date().toISOString()}-${Math.random().toString(36).slice(2, 8)}`,
    receivedAt: payload.receivedAt || new Date().toISOString(),
    sender: String(payload.sender || '系统'),
    content,
    event: payload.event,
  })
  if (chatMessages.value.length > maxChatMessages) chatMessages.value.splice(maxChatMessages)
}

const extractChatText = (event: string, data: any) => {
  const text = [
    data?.message,
    data?.text,
    data?.content,
    data?.literal,
    data?.detail,
    data?.chat?.message,
  ].find(item => typeof item === 'string' && item.trim())
  if (!text && !/activity|chat|message/i.test(event)) return null
  const content = String(text || '').trim()
  if (!content) return null
  const sender = String(data?.sender || data?.player?.name || data?.player?.id || '服务器').trim()
  return { sender, content }
}

const applyRealtimeNotification = (payload: { event: string; data: any; receivedAt: string }) => {
  const event = String(payload.event || '')
  const data = payload.data

  if (event.endsWith('/players/joined')) {
    const name = getNormalizedPlayerName(data)
    if (name) {
      realtimePlayers.value = uniqueNames([...realtimePlayers.value, name])
      selectablePlayers.value = uniqueNames([...selectablePlayers.value, name])
      appendChatMessage({
        receivedAt: payload.receivedAt,
        sender: '系统',
        content: `${name} 加入了游戏`,
        event,
      })
    }
  }

  if (event.endsWith('/players/left')) {
    const name = getNormalizedPlayerName(data)
    if (name) {
      realtimePlayers.value = realtimePlayers.value.filter(player => player !== name)
      selectablePlayers.value = selectablePlayers.value.filter(player => player !== name)
      appendChatMessage({
        receivedAt: payload.receivedAt,
        sender: '系统',
        content: `${name} 离开了游戏`,
        event,
      })
    }
  }

  if (event.endsWith('/server/status') && data && typeof data === 'object') {
    const nextPlayers = Array.isArray(data.players) ? data.players : (status.value?.players || [])
    const nextStarted = typeof data.started === 'boolean' ? data.started : !!status.value?.started
    const nextVersion = data.version || status.value?.version || { name: '-', protocol: 0 }
    status.value = {
      started: nextStarted,
      players: nextPlayers,
      version: nextVersion,
    }
    syncPlayersFromStatus(status.value)
  }

  if (event.endsWith('/server/started')) {
    status.value = {
      started: true,
      players: status.value?.players || [],
      version: status.value?.version || { name: '-', protocol: 0 },
    }
    appendChatMessage({
      receivedAt: payload.receivedAt,
      sender: '系统',
      content: '服务器已启动',
      event,
    })
  }

  if (event.endsWith('/server/stopping')) {
    status.value = {
      started: false,
      players: [],
      version: status.value?.version || { name: '-', protocol: 0 },
    }
    realtimePlayers.value = []
    appendChatMessage({
      receivedAt: payload.receivedAt,
      sender: '系统',
      content: '服务器正在停止',
      event,
    })
  }

  const chat = extractChatText(event, data)
  if (chat) {
    appendChatMessage({
      receivedAt: payload.receivedAt,
      sender: chat.sender,
      content: chat.content,
      event,
    })
  }
}

const selectAllQuickChatPlayers = () => {
  quickChat.players = [...mergedPlayerOptions.value]
}

const selectOnlineQuickChatPlayers = () => {
  quickChat.players = [...realtimePlayers.value]
}

const clearQuickChatTargets = () => {
  quickChat.players = []
}

const clearRealtimeMessages = () => {
  chatMessages.value = []
}

const clearRealtimeEvents = () => {
  events.value = []
}

const parseTypedValue = (raw: string, valueType: 'string' | 'number' | 'boolean') => {
  if (valueType === 'string') return raw
  if (valueType === 'number') {
    const value = Number(raw)
    if (Number.isNaN(value)) throw new Error('数字格式不正确')
    return value
  }

  const normalized = raw.trim().toLowerCase()
  if (['1', 'true', 'yes', 'on'].includes(normalized)) return true
  if (['0', 'false', 'no', 'off'].includes(normalized)) return false
  throw new Error('布尔值仅支持 true/false 或 1/0')
}

const normalizeExpiresAt = (raw: string) => {
  const text = raw.trim()
  if (!text) return null
  const date = new Date(text)
  if (Number.isNaN(date.getTime())) throw new Error('过期时间格式不正确')
  return date.toISOString()
}

const refreshAllManagementData = async () => {
  await Promise.all([
    refreshSelectablePlayers(),
    loadAllowList(),
    loadOperators(),
    loadBans(),
    loadAudits(),
  ])
}

const withWorking = async <T>(runner: () => Promise<T>): Promise<T> => {
  working.value = true
  try {
    return await runner()
  } finally {
    working.value = false
  }
}

const getRequiredServerId = () => {
  const id = serverId.value
  if (!id) throw new Error('serverId 不能为空')
  return id
}

const runAction = async <K extends McActionKey>(action: K, payload: McActionPayloadMap[K]) => {
  const id = getRequiredServerId()
  switch (action) {
    case 'server.reconnect':
      return mcApi.reconnectMcServer(id)
    case 'server.save':
      return mcApi.saveMcServer(id, payload as McActionPayloadMap['server.save'])
    case 'server.stop':
      return mcApi.stopMcServer(id)
    case 'server.enable':
      return mcApi.updateMcServer(id, { enabled: true, token: (payload as McActionPayloadMap['server.enable']).token })
    case 'status.refresh':
      return mcApi.getMcServerStatus(id, payload as McActionPayloadMap['status.refresh'])
    case 'chat.system':
      return mcApi.sendMcSystemMessage(id, payload as McActionPayloadMap['chat.system'])
    case 'player.kick':
      return mcApi.kickMcPlayers(id, payload as McActionPayloadMap['player.kick'])
    case 'allowlist.get':
      return mcApi.getMcAllowList(id)
    case 'allowlist.add':
      return mcApi.addMcAllowList(id, payload as McActionPayloadMap['allowlist.add'])
    case 'allowlist.remove':
      return mcApi.removeMcAllowList(id, payload as McActionPayloadMap['allowlist.remove'])
    case 'operator.get':
      return mcApi.getMcOperators(id)
    case 'operator.add':
      return mcApi.addMcOperators(id, payload as McActionPayloadMap['operator.add'])
    case 'operator.remove':
      return mcApi.removeMcOperators(id, payload as McActionPayloadMap['operator.remove'])
    case 'ban.get':
      return mcApi.getMcBans(id)
    case 'ban.add':
      return mcApi.addMcBans(id, payload as McActionPayloadMap['ban.add'])
    case 'ban.remove':
      return mcApi.removeMcBans(id, payload as McActionPayloadMap['ban.remove'])
    case 'gamerule.update':
      return mcApi.updateMcGameRule(id, payload as McActionPayloadMap['gamerule.update'])
    case 'setting.update':
      return mcApi.setMcServerSetting(id, payload as McActionPayloadMap['setting.update'])
    case 'rpc.call':
      return mcApi.callMcRpc(id, payload as McActionPayloadMap['rpc.call'])
    case 'audit.list':
      return mcApi.listMcAudits({
        serverId: id,
        limit: (payload as McActionPayloadMap['audit.list']).limit,
      })
    default:
      throw new Error(`不支持的动作: ${action as string}`)
  }
}

const runUiAction = async <K extends McActionKey>(options: {
  action: K
  payload: McActionPayloadMap[K]
  successText?: string
  after?: () => Promise<void>
  useWorking?: boolean
}) => {
  const { action, payload, successText, after, useWorking = true } = options
  const runner = async () => {
    try {
      const res = await runAction(action, payload)
      if (after) await after()
      if (successText) toast.success(successText)
      return res
    } catch (error: any) {
      toast.error(getErrorMessage(error))
      throw error
    }
  }
  if (useWorking) return withWorking(runner)
  return runner()
}

// 供后续会话机器人对接：统一动作入口（action + payload）。
const executeManagementCommand = async <K extends McActionKey>(command: { action: K; payload: McActionPayloadMap[K] }) => {
  return runAction(command.action, command.payload)
}
defineExpose({ executeManagementCommand })

const loadConfig = async () => {
  loading.value = true
  try {
    const res = await mcApi.listMcServers()
    const list = res.data || []
    config.value = list.find(item => item.id === serverId.value) || null
    if (!config.value) return
  } finally {
    loading.value = false
  }
}

const subscribeRealtime = async () => {
  if (!serverId.value) return

  offStatus?.()
  offEvent?.()

  offStatus = socket.on('mc-server:status', payload => {
    if (payload.serverId !== serverId.value) return
    config.value = payload.config
    status.value = payload.status
    syncPlayersFromStatus(payload.status)
    lastFetchedAt.value = payload.fetchedAt
    connectError.value = payload.error || ''
  })

  offEvent = socket.on('mc-server:notification', payload => {
    if (payload.serverId !== serverId.value) return
    events.value.unshift(payload)
    if (events.value.length > maxEvents) events.value.splice(maxEvents)
    applyRealtimeNotification(payload)
  })

  socket.emit('mc-server:subscribe', { serverId: serverId.value }, ack => {
    if (!ack?.ok) {
      connectError.value = ack?.error || '订阅失败'
      return
    }
    config.value = ack.config || config.value
    status.value = ack.status || null
    syncPlayersFromStatus(ack.status || null)
    connectError.value = ack.error || ''
    events.value = (ack.events || []).slice(0, maxEvents)
    chatMessages.value = []
    const buffered = [...events.value].reverse()
    buffered.forEach(item => applyRealtimeNotification(item))
  })
}

const unsubscribeRealtime = async () => {
  if (!serverId.value) return
  offStatus?.()
  offEvent?.()
  offStatus = null
  offEvent = null
  socket.emit('mc-server:unsubscribe', { serverId: serverId.value })
}

const refreshSelectablePlayers = async () => {
  if (!serverId.value) return
  try {
    const res = await mcApi.listMcSelectablePlayers(serverId.value)
    selectablePlayers.value = res.data?.players || []
  } catch {
    selectablePlayers.value = []
  }
}

const refreshServerStatus = async () => {
  if (!serverId.value) return
  const res = await runUiAction({
    action: 'status.refresh',
    payload: { force: true },
    successText: '状态已刷新',
  }) as Awaited<ReturnType<typeof mcApi.getMcServerStatus>>
  status.value = res.data || null
  syncPlayersFromStatus(status.value)
  lastFetchedAt.value = new Date().toISOString()
}

const loadAllowList = async () => {
  if (!serverId.value) return
  loadingAllowList.value = true
  try {
    const res = await runAction('allowlist.get', {}) as Awaited<ReturnType<typeof mcApi.getMcAllowList>>
    allowList.value = res.data?.players || []
    const names = new Set(allowList.value.map(item => playerName(item)).filter(Boolean))
    allowListSelection.value = allowListSelection.value.filter(name => names.has(name))
  } finally {
    loadingAllowList.value = false
  }
}

const addAllowListPlayers = async () => {
  if (!serverId.value) return
  if (!allowListAddSelection.value.length) {
    toast.error('请选择要加入白名单的玩家')
    return
  }
  await runUiAction({
    action: 'allowlist.add',
    payload: { players: allowListAddSelection.value },
    successText: '白名单已更新',
    after: async () => {
      allowListAddSelection.value = []
      await Promise.all([loadAllowList(), refreshSelectablePlayers(), loadAudits()])
    },
  })
}

const removeAllowListPlayers = async () => {
  if (!serverId.value) return
  if (!allowListSelection.value.length) {
    toast.error('请选择要移除的白名单玩家')
    return
  }
  await runUiAction({
    action: 'allowlist.remove',
    payload: { players: allowListSelection.value },
    successText: '已移除白名单玩家',
    after: async () => {
      allowListSelection.value = []
      await Promise.all([loadAllowList(), refreshSelectablePlayers(), loadAudits()])
    },
  })
}

const loadOperators = async () => {
  if (!serverId.value) return
  loadingOperators.value = true
  try {
    const res = await runAction('operator.get', {}) as Awaited<ReturnType<typeof mcApi.getMcOperators>>
    operators.value = res.data?.operators || []
    const names = new Set(operators.value.map(item => playerName(item)).filter(Boolean))
    operatorSelection.value = operatorSelection.value.filter(name => names.has(name))
  } finally {
    loadingOperators.value = false
  }
}

const addOperators = async () => {
  if (!serverId.value) return
  if (!operatorAddSelection.value.length) {
    toast.error('请选择要授予 OP 的玩家')
    return
  }
  await runUiAction({
    action: 'operator.add',
    payload: {
      players: operatorAddSelection.value,
      permissionLevel: operatorPermissionLevel.value,
      bypassesPlayerLimit: operatorBypassesLimit.value,
    },
    successText: 'OP 已更新',
    after: async () => {
      operatorAddSelection.value = []
      await Promise.all([loadOperators(), refreshSelectablePlayers(), loadAudits()])
    },
  })
}

const removeOperators = async () => {
  if (!serverId.value) return
  if (!operatorSelection.value.length) {
    toast.error('请选择要移除 OP 的玩家')
    return
  }
  await runUiAction({
    action: 'operator.remove',
    payload: { players: operatorSelection.value },
    successText: '已移除 OP',
    after: async () => {
      operatorSelection.value = []
      await Promise.all([loadOperators(), refreshSelectablePlayers(), loadAudits()])
    },
  })
}

const loadBans = async () => {
  if (!serverId.value) return
  loadingBans.value = true
  try {
    const res = await runAction('ban.get', {}) as Awaited<ReturnType<typeof mcApi.getMcBans>>
    bans.value = res.data?.bans || []
    const names = new Set(bans.value.map(item => playerName(item)).filter(Boolean))
    banSelection.value = banSelection.value.filter(name => names.has(name))
  } finally {
    loadingBans.value = false
  }
}

const addBans = async () => {
  if (!serverId.value) return
  if (!banAddSelection.value.length) {
    toast.error('请选择要封禁的玩家')
    return
  }
  await runUiAction({
    action: 'ban.add',
    payload: {
      players: banAddSelection.value,
      reason: banReason.value.trim() || null,
      source: banSource.value.trim() || null,
      expiresAt: normalizeExpiresAt(banExpiresAt.value),
    },
    successText: '封禁列表已更新',
    after: async () => {
      banAddSelection.value = []
      banReason.value = ''
      banSource.value = ''
      banExpiresAt.value = ''
      await Promise.all([loadBans(), refreshSelectablePlayers(), loadAudits()])
    },
  })
}

const removeBans = async () => {
  if (!serverId.value) return
  if (!banSelection.value.length) {
    toast.error('请选择要解除封禁的玩家')
    return
  }
  await runUiAction({
    action: 'ban.remove',
    payload: { players: banSelection.value },
    successText: '已解除封禁',
    after: async () => {
      banSelection.value = []
      await Promise.all([loadBans(), refreshSelectablePlayers(), loadAudits()])
    },
  })
}

const updateGameRule = async () => {
  if (!serverId.value) return
  const key = gameRuleForm.key.trim()
  if (!key) {
    toast.error('请输入游戏规则 key')
    return
  }
  const value = parseTypedValue(gameRuleForm.value, gameRuleForm.valueType)
  await runUiAction({
    action: 'gamerule.update',
    payload: { key, value },
    successText: '游戏规则已更新',
    after: loadAudits,
  })
}

const updateServerSetting = async () => {
  if (!serverId.value) return
  const key = serverSettingForm.key.trim()
  if (!key) {
    toast.error('请输入服务端设置 key')
    return
  }
  const value = parseTypedValue(serverSettingForm.value, serverSettingForm.valueType)
  await runUiAction({
    action: 'setting.update',
    payload: { key, value },
    successText: '服务端设置已更新',
    after: loadAudits,
  })
}

const callRpc = async () => {
  if (!serverId.value) return
  const method = rpcForm.method.trim()
  if (!method) {
    toast.error('请输入 RPC 方法名')
    return
  }

  rpcRunning.value = true
  rpcError.value = ''
  try {
    let params: Record<string, any> | any[] | undefined
    const raw = rpcForm.paramsText.trim()
    if (raw) {
      const parsed = JSON.parse(raw)
      if (!(Array.isArray(parsed) || (parsed && typeof parsed === 'object'))) {
        throw new Error('RPC 参数仅支持对象或数组')
      }
      params = parsed
    }
    const res = await runAction('rpc.call', { method, params }) as Awaited<ReturnType<typeof mcApi.callMcRpc>>
    rpcResult.value = res.data?.result
    await loadAudits()
    toast.success('RPC 调用成功')
  } catch (error: any) {
    rpcError.value = error?.message || 'RPC 调用失败'
    toast.error(rpcError.value)
  } finally {
    rpcRunning.value = false
  }
}

const loadAudits = async () => {
  if (!serverId.value) return
  loadingAudits.value = true
  try {
    const res = await runAction('audit.list', {
      limit: Math.max(1, Math.min(200, Number(auditLimit.value || 50))),
    }) as Awaited<ReturnType<typeof mcApi.listMcAudits>>
    audits.value = res.data || []
  } finally {
    loadingAudits.value = false
  }
}

const handleReconnect = async () => {
  if (!serverId.value) return
  await runUiAction({
    action: 'server.reconnect',
    payload: {},
    successText: '已重连',
  })
}

const handleSave = async () => {
  if (!serverId.value) return
  await runUiAction({
    action: 'server.save',
    payload: { flush: false },
    successText: '已触发保存',
    after: loadAudits,
  })
}

const handleStop = async () => {
  if (!serverId.value) return
  const confirmed = await dialog.confirm({
    title: '确定要关闭服务器？',
    content: '关闭后会断开全部连接，确认继续？',
    confirmText: '确认关闭',
    cancelText: '取消'
  })
  if (!confirmed) return
  await runUiAction({
    action: 'server.stop',
    payload: {},
    successText: '已发送停止命令',
    after: loadAudits,
  })
}

const openSystemMessage = async () => {
  systemMessageModal.message = ''
  systemMessageModal.overlay = false
  systemMessageModal.players = []
  await refreshSelectablePlayers()
  systemMessageModal.show = true
}

const sendSystemMessage = async () => {
  if (!serverId.value) return
  const message = systemMessageModal.message.trim()
  if (!message) {
    toast.error('消息不能为空')
    return
  }
  await runUiAction({
    action: 'chat.system',
    payload: {
      message,
      overlay: systemMessageModal.overlay,
      players: systemMessageModal.players.length ? systemMessageModal.players : undefined,
    },
    successText: '已发送',
    after: async () => {
      systemMessageModal.show = false
      await loadAudits()
    },
  })
}

const sendQuickChatMessage = async () => {
  if (!serverId.value) return
  const message = quickChat.message.trim()
  if (!message) {
    toast.error('消息不能为空')
    return
  }
  await runUiAction({
    action: 'chat.system',
    payload: {
      message,
      overlay: quickChat.overlay,
      players: quickChat.players.length ? quickChat.players : undefined,
    },
    successText: '已发送',
    after: async () => {
      appendChatMessage({
        sender: '你',
        content: message,
        event: 'client:chat.system',
      })
      quickChat.message = ''
      quickChat.players = []
      await loadAudits()
    },
  })
}

const handleQuickChatKeydown = async (event: KeyboardEvent) => {
  if (!(event.ctrlKey || event.metaKey) || event.key !== 'Enter') return
  event.preventDefault()
  if (!canOperateServer.value) return
  await sendQuickChatMessage()
}

const openKick = async () => {
  kickModal.message = ''
  kickModal.players = []
  await refreshSelectablePlayers()
  kickModal.show = true
}

const kickPlayers = async () => {
  if (!serverId.value) return
  if (!kickModal.players.length) {
    toast.error('请选择玩家')
    return
  }
  await runUiAction({
    action: 'player.kick',
    payload: { players: kickModal.players, message: kickModal.message.trim() || null },
    successText: '已踢出',
    after: async () => {
      kickModal.show = false
      await Promise.all([refreshSelectablePlayers(), loadAudits()])
    },
  })
}

const enableServer = async () => {
  if (!serverId.value) return
  if (!config.value) return
  const token = settings.mcDefaultToken.trim()
  if (!token) {
    toast.error('请先在设置中填写管理令牌')
    return
  }
  await runUiAction({
    action: 'server.enable',
    payload: { token },
    successText: '已启用',
    after: loadConfig,
  })
}

watch(mergedPlayerOptions, (list) => {
  const valid = new Set(list)
  quickChat.players = quickChat.players.filter(name => valid.has(name))
  systemMessageModal.players = systemMessageModal.players.filter(name => valid.has(name))
  kickModal.players = kickModal.players.filter(name => valid.has(name))
})

onMounted(async () => {
  await loadConfig()
  await subscribeRealtime()
  await refreshAllManagementData()
})

onBeforeUnmount(async () => {
  await unsubscribeRealtime()
})

watch(serverId, async () => {
  await unsubscribeRealtime()
  events.value = []
  chatMessages.value = []
  realtimePlayers.value = []
  status.value = null
  lastFetchedAt.value = ''
  connectError.value = ''
  await loadConfig()
  await subscribeRealtime()
  await refreshAllManagementData()
})
</script>

<template>
  <div class="h-full w-full overflow-hidden bg-base-100">
    <div class="h-full w-full overflow-y-auto p-6">
      <div class="flex items-start justify-between gap-4">
        <div class="min-w-0">
          <button class="btn btn-ghost btn-sm -ml-2" @click="router.push('/tools/minecraft')">
            <Icon name="mingcute:arrow-left-line" class="text-lg" />
            返回列表
          </button>
          <div class="text-2xl font-black tracking-tight mt-2 truncate">
            {{ config?.name || serverId }}
          </div>
          <div class="text-xs opacity-60 mt-1 flex flex-wrap gap-2">
            <span>ID: <code>{{ serverId }}</code></span>
            <span v-if="config">URL: <code>{{ config.url }}</code></span>
            <span v-if="config?.tags?.length">标签: <code>{{ config.tags.join(', ') }}</code></span>
          </div>
        </div>

        <div class="flex items-center gap-2 shrink-0">
          <button class="btn btn-ghost btn-sm" :disabled="working" @click="handleReconnect">
            <Icon name="mingcute:refresh-2-line" class="text-lg" />
            重连
          </button>
          <button class="btn btn-ghost btn-sm" :disabled="working" @click="handleSave">
            <Icon name="mingcute:save-2-line" class="text-lg" />
            保存
          </button>
          <button class="btn btn-ghost btn-sm text-error" :disabled="working" @click="handleStop">
            <Icon name="mingcute:power-line" class="text-lg" />
            停止
          </button>
        </div>
      </div>

      <div v-if="loading" class="mt-6 text-sm opacity-60">加载中...</div>

      <div v-else-if="!config" class="mt-6 border border-base-content/5 rounded-2xl p-6">
        <div class="font-bold">服务器不存在</div>
        <div class="text-sm opacity-60 mt-2">请返回列表检查 ID 是否正确。</div>
      </div>

      <template v-else>
        <div class="mt-6 grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div class="lg:col-span-2 border border-base-content/5 bg-base-200/40 rounded-2xl p-4">
            <div class="flex items-center justify-between">
              <div class="font-bold">实时状态</div>
              <div class="text-xs opacity-60">更新时间：{{ lastFetchedAt || '-' }}</div>
            </div>

            <div v-if="!config.enabled" class="mt-3">
              <div class="alert bg-base-100/80 backdrop-blur-md border border-base-content/5">
                <Icon name="mingcute:warning-line" class="text-xl" />
                <div>
                  <div class="font-bold">该服务器已禁用</div>
                  <div class="text-sm opacity-70 mt-1">
                    填写管理令牌后再启用。令牌建议存放在设置中（本地持久化）。
                  </div>
                </div>
                <button class="btn btn-primary btn-sm" :disabled="working" @click="enableServer">启用</button>
              </div>
            </div>

            <div v-else-if="connectError" class="mt-3">
              <div class="alert alert-error bg-base-100/80 backdrop-blur-md border border-base-content/5">
                <Icon name="mingcute:close-circle-line" class="text-xl" />
                <div>
                  <div class="font-bold">连接异常</div>
                  <div class="text-sm opacity-80 mt-1 break-all">{{ connectError }}</div>
                </div>
              </div>
            </div>

            <div class="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div class="border border-base-content/5 bg-base-100/60 rounded-xl p-3">
                <div class="text-xs opacity-60">运行状态</div>
                <div class="mt-1 font-bold">
                  <span v-if="status?.started" class="text-success">运行中</span>
                  <span v-else class="opacity-70">未启动</span>
                </div>
              </div>
              <div class="border border-base-content/5 bg-base-100/60 rounded-xl p-3">
                <div class="text-xs opacity-60">版本</div>
                <div class="mt-1 font-bold truncate">{{ status?.version?.name || '-' }}</div>
              </div>
              <div class="border border-base-content/5 bg-base-100/60 rounded-xl p-3">
                <div class="text-xs opacity-60">在线玩家</div>
                <div class="mt-1 font-bold">{{ realtimePlayers.length }}</div>
              </div>
            </div>

            <div class="mt-4">
              <div class="text-sm font-bold mb-2">在线玩家</div>
              <div v-if="realtimePlayers.length" class="flex flex-wrap gap-2">
                <span v-for="name in realtimePlayers" :key="name" class="badge badge-ghost">
                  {{ name }}
                </span>
              </div>
              <div v-else class="text-sm opacity-60">暂无</div>
            </div>
          </div>

          <div class="border border-base-content/5 bg-base-200/40 rounded-2xl p-4">
            <div class="font-bold">常用操作</div>
            <div class="text-sm opacity-60 mt-1">玩家名单不允许手动输入，只能从可选列表中勾选。</div>

            <div class="mt-4 grid gap-2">
              <button class="btn btn-ghost justify-start" :disabled="!canOperateServer" @click="openSystemMessage">
                <Icon name="mingcute:announcement-line" class="text-lg" />
                发送系统消息
              </button>
              <button class="btn btn-ghost justify-start text-warning" :disabled="!canOperateServer" @click="openKick">
                <Icon name="mingcute:user-remove-2-line" class="text-lg" />
                踢出玩家
              </button>
            </div>

            <div class="mt-4 pt-4 border-t border-base-content/5">
              <div class="text-sm font-bold">实时用户列表</div>
              <div class="text-xs opacity-60 mt-1">当前在线 {{ realtimePlayers.length }} 人</div>
              <div class="mt-2 max-h-40 overflow-y-auto rounded-lg border border-base-content/5 bg-base-100/70 p-2">
                <div v-if="realtimePlayers.length" class="flex flex-wrap gap-2">
                  <span v-for="name in realtimePlayers" :key="`rt-${name}`" class="badge badge-ghost">
                    {{ name }}
                  </span>
                </div>
                <div v-else class="text-sm opacity-60">暂无在线玩家</div>
              </div>
            </div>
          </div>
        </div>

        <div class="mt-6 border border-base-content/5 bg-base-200/40 rounded-2xl p-4">
          <div class="flex flex-wrap items-center justify-between gap-2">
            <div class="font-bold">服务器通知</div>
            <div class="text-xs opacity-60">实时推送（{{ filteredEvents.length }} / {{ events.length }}）</div>
          </div>
          <div class="mt-3 flex flex-col sm:flex-row gap-2">
            <input
              v-model="eventKeyword"
              class="input input-sm input-bordered bg-base-100 flex-1"
              placeholder="过滤通知（事件名/数据）"
            />
            <button class="btn btn-ghost btn-sm sm:w-24" :disabled="!eventKeyword" @click="eventKeyword = ''">清空过滤</button>
            <button class="btn btn-ghost btn-sm sm:w-24" :disabled="!events.length" @click="clearRealtimeEvents">清空通知</button>
          </div>

          <div v-if="!filteredEvents.length" class="text-sm opacity-60 mt-3">暂无消息</div>

          <div v-else class="mt-3 grid gap-2">
            <div
              v-for="(ev, idx) in filteredEvents"
              :key="`${ev.receivedAt}-${idx}`"
              class="border border-base-content/5 bg-base-100/60 rounded-xl p-3"
            >
              <div class="flex items-center justify-between gap-3">
                <div class="font-mono text-xs opacity-80 truncate">{{ ev.event }}</div>
                <div class="text-xs opacity-60 shrink-0">{{ ev.receivedAt }}</div>
              </div>
              <pre class="mt-2 text-xs overflow-x-auto whitespace-pre-wrap break-words opacity-90">{{ JSON.stringify(ev.data, null, 2) }}</pre>
            </div>
          </div>
        </div>

        <div class="mt-6 border border-base-content/5 bg-base-200/40 rounded-2xl p-4">
          <div class="flex flex-wrap items-center justify-between gap-2">
            <div class="font-bold">游戏消息面板</div>
            <div class="text-xs opacity-60">实时查看消息并发送系统消息到游戏内</div>
          </div>

          <div class="mt-3 rounded-xl border border-base-content/5 bg-base-100/70 p-3">
            <div class="flex items-center justify-between gap-2 mb-2">
              <div class="text-xs opacity-60">发送消息（Ctrl/Cmd + Enter 快捷发送）</div>
              <div class="text-xs opacity-50">{{ quickChat.message.trim().length }} 字</div>
            </div>
            <div class="grid gap-2">
              <textarea
                v-model="quickChat.message"
                class="textarea textarea-bordered bg-base-100 min-h-24"
                placeholder="输入要发送到服务器的消息"
                @keydown="handleQuickChatKeydown"
              />
              <div class="grid grid-cols-1 md:grid-cols-[1fr,auto] gap-2">
                <div class="flex flex-wrap gap-2">
                  <button class="btn btn-ghost btn-xs" :disabled="!realtimePlayers.length" @click="selectOnlineQuickChatPlayers">全选在线</button>
                  <button class="btn btn-ghost btn-xs" :disabled="!mergedPlayerOptions.length" @click="selectAllQuickChatPlayers">全选可选</button>
                  <button class="btn btn-ghost btn-xs" :disabled="!quickChat.players.length" @click="clearQuickChatTargets">清空接收人</button>
                </div>
                <div class="flex flex-wrap gap-2">
                  <button
                    v-for="p in mergedPlayerOptions"
                    :key="`quick-chat-${p}`"
                    class="btn btn-xs"
                    :class="quickChat.players.includes(p) ? 'btn-primary' : 'btn-ghost'"
                    @click="quickChat.players = togglePlayer(quickChat.players, p)"
                  >
                    {{ p }}
                  </button>
                  <span v-if="!mergedPlayerOptions.length" class="text-xs opacity-60">暂无可选玩家（默认全服广播）</span>
                </div>
                <div class="flex items-center gap-2">
                  <label class="label cursor-pointer justify-start gap-2 px-0">
                    <input v-model="quickChat.overlay" type="checkbox" class="toggle toggle-xs" />
                    <span class="text-xs">Overlay</span>
                  </label>
                  <button class="btn btn-primary btn-sm" :disabled="!canOperateServer || !quickChat.message.trim()" @click="sendQuickChatMessage">
                    发送消息
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div class="mt-3 rounded-xl border border-base-content/5 bg-base-100/70 p-3">
            <div class="flex flex-wrap items-center justify-between gap-2 mb-2">
              <div class="text-xs opacity-60">实时消息（{{ filteredChatMessages.length }} / {{ chatMessages.length }}，最多 {{ maxChatMessages }} 条）</div>
              <div class="flex items-center gap-2">
                <input
                  v-model="chatKeyword"
                  class="input input-xs input-bordered bg-base-100 w-40 sm:w-52"
                  placeholder="过滤消息"
                />
                <button class="btn btn-ghost btn-xs" :disabled="!chatKeyword" @click="chatKeyword = ''">清空过滤</button>
                <button class="btn btn-ghost btn-xs" :disabled="!chatMessages.length" @click="clearRealtimeMessages">清空消息</button>
              </div>
            </div>
            <div class="max-h-80 overflow-y-auto space-y-2 pr-1">
              <div v-if="!filteredChatMessages.length" class="text-sm opacity-60">暂无可展示的聊天/系统消息</div>
              <div
                v-for="item in filteredChatMessages"
                :key="item.id"
                class="rounded-lg border border-base-content/5 bg-base-200/60 p-2"
              >
                <div class="flex flex-wrap items-center justify-between gap-2 text-xs">
                  <span class="badge badge-ghost">{{ item.sender }}</span>
                  <span class="font-mono opacity-60">{{ item.event }}</span>
                  <span class="opacity-60">{{ formatDateTime(item.receivedAt) }}</span>
                </div>
                <div class="mt-1 text-sm whitespace-pre-wrap break-words">{{ item.content }}</div>
              </div>
            </div>
          </div>
        </div>

        <div class="mt-6 border border-base-content/5 bg-base-200/40 rounded-2xl p-4">
          <div class="overflow-x-auto">
            <div class="tabs tabs-boxed w-max min-w-full bg-base-100/70 p-1">
              <button class="tab text-xs sm:text-sm" :class="activePanel === 'overview' ? 'tab-active' : ''" @click="activePanel = 'overview'">常用</button>
              <button class="tab text-xs sm:text-sm" :class="activePanel === 'allowlist' ? 'tab-active' : ''" @click="activePanel = 'allowlist'">白名单</button>
              <button class="tab text-xs sm:text-sm" :class="activePanel === 'operators' ? 'tab-active' : ''" @click="activePanel = 'operators'">OP</button>
              <button class="tab text-xs sm:text-sm" :class="activePanel === 'bans' ? 'tab-active' : ''" @click="activePanel = 'bans'">封禁</button>
              <button class="tab text-xs sm:text-sm" :class="activePanel === 'rules' ? 'tab-active' : ''" @click="activePanel = 'rules'">规则/设置</button>
              <button class="tab text-xs sm:text-sm" :class="activePanel === 'rpc' ? 'tab-active' : ''" @click="activePanel = 'rpc'">RPC</button>
              <button class="tab text-xs sm:text-sm" :class="activePanel === 'audit' ? 'tab-active' : ''" @click="activePanel = 'audit'">审计</button>
            </div>
          </div>

          <div v-if="activePanel === 'overview'" class="mt-4 grid grid-cols-1 gap-3 md:grid-cols-3">
            <div class="rounded-xl border border-base-content/5 bg-base-100/70 p-3">
              <div class="text-xs opacity-60">可选玩家</div>
              <div class="mt-1 text-xl font-bold">{{ selectablePlayers.length }}</div>
              <div class="flex flex-wrap gap-2 mt-2">
                <button class="btn btn-ghost btn-xs" :disabled="working" @click="refreshSelectablePlayers">刷新玩家池</button>
                <button class="btn btn-ghost btn-xs" :disabled="working" @click="refreshServerStatus">刷新状态</button>
              </div>
            </div>
            <div class="rounded-xl border border-base-content/5 bg-base-100/70 p-3">
              <div class="text-xs opacity-60">白名单人数</div>
              <div class="mt-1 text-xl font-bold">{{ allowList.length }}</div>
              <button class="btn btn-ghost btn-xs mt-2" :disabled="loadingAllowList" @click="loadAllowList">刷新白名单</button>
            </div>
            <div class="rounded-xl border border-base-content/5 bg-base-100/70 p-3">
              <div class="text-xs opacity-60">OP / 封禁</div>
              <div class="mt-1 text-xl font-bold">{{ operators.length }} / {{ bans.length }}</div>
              <button class="btn btn-ghost btn-xs mt-2" :disabled="working" @click="refreshAllManagementData">刷新全部管理数据</button>
            </div>
          </div>

          <div v-else-if="activePanel === 'allowlist'" class="mt-4 grid grid-cols-1 gap-4 xl:grid-cols-[20rem,1fr]">
            <div class="rounded-xl border border-base-content/5 bg-base-100/70 p-3">
              <div class="font-bold text-sm">添加白名单</div>
              <div class="text-xs opacity-60 mt-1">仅可从可选玩家中选择</div>
              <div class="mt-2 flex flex-wrap gap-2">
                <button
                  v-for="p in selectablePlayers"
                  :key="`allow-add-${p}`"
                  class="btn btn-xs"
                  :class="allowListAddSelection.includes(p) ? 'btn-primary' : 'btn-ghost'"
                  @click="allowListAddSelection = togglePlayer(allowListAddSelection, p)"
                >
                  {{ p }}
                </button>
                <div v-if="!selectablePlayers.length" class="text-sm opacity-60">暂无可选玩家</div>
              </div>
              <button class="btn btn-primary btn-sm w-full mt-3" :disabled="working || !config.enabled" @click="addAllowListPlayers">添加到白名单</button>

              <div class="font-bold text-sm mt-4">移除白名单</div>
              <div class="mt-2 flex flex-wrap gap-2">
                <button
                  v-for="item in allowList"
                  :key="`allow-remove-${playerName(item)}`"
                  class="btn btn-xs"
                  :class="allowListSelection.includes(playerName(item)) ? 'btn-warning' : 'btn-ghost'"
                  @click="allowListSelection = togglePlayer(allowListSelection, playerName(item))"
                >
                  {{ playerName(item) }}
                </button>
                <div v-if="!allowList.length" class="text-sm opacity-60">暂无白名单玩家</div>
              </div>
              <button class="btn btn-warning btn-sm w-full mt-3" :disabled="working || !config.enabled" @click="removeAllowListPlayers">移除白名单</button>
            </div>

            <div class="rounded-xl border border-base-content/5 bg-base-100/70 p-3 overflow-x-auto">
              <table class="table table-sm">
                <thead>
                  <tr>
                    <th>玩家</th>
                    <th>ID</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-if="loadingAllowList"><td colspan="2">加载中...</td></tr>
                  <tr v-else-if="!allowList.length"><td colspan="2">暂无数据</td></tr>
                  <tr v-for="item in allowList" :key="`allow-row-${playerName(item)}`">
                    <td>{{ item.name || '-' }}</td>
                    <td><code>{{ item.id || '-' }}</code></td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          <div v-else-if="activePanel === 'operators'" class="mt-4 grid grid-cols-1 gap-4 xl:grid-cols-[21rem,1fr]">
            <div class="rounded-xl border border-base-content/5 bg-base-100/70 p-3">
              <div class="font-bold text-sm">添加 OP</div>
              <div class="mt-2 flex flex-wrap gap-2">
                <button
                  v-for="p in selectablePlayers"
                  :key="`op-add-${p}`"
                  class="btn btn-xs"
                  :class="operatorAddSelection.includes(p) ? 'btn-primary' : 'btn-ghost'"
                  @click="operatorAddSelection = togglePlayer(operatorAddSelection, p)"
                >
                  {{ p }}
                </button>
              </div>
              <div class="grid grid-cols-2 gap-2 mt-3">
                <input v-model.number="operatorPermissionLevel" type="number" min="1" max="4" class="input input-sm input-bordered bg-base-100" placeholder="等级" />
                <label class="label cursor-pointer justify-start gap-2 border border-base-content/5 rounded-lg px-2">
                  <input v-model="operatorBypassesLimit" type="checkbox" class="toggle toggle-xs" />
                  <span class="text-xs">绕过上限</span>
                </label>
              </div>
              <button class="btn btn-primary btn-sm w-full mt-3" :disabled="working || !config.enabled" @click="addOperators">添加 OP</button>

              <div class="font-bold text-sm mt-4">移除 OP</div>
              <div class="mt-2 flex flex-wrap gap-2">
                <button
                  v-for="item in operators"
                  :key="`op-remove-${playerName(item)}`"
                  class="btn btn-xs"
                  :class="operatorSelection.includes(playerName(item)) ? 'btn-warning' : 'btn-ghost'"
                  @click="operatorSelection = togglePlayer(operatorSelection, playerName(item))"
                >
                  {{ playerName(item) }}
                </button>
                <div v-if="!operators.length" class="text-sm opacity-60">暂无 OP</div>
              </div>
              <button class="btn btn-warning btn-sm w-full mt-3" :disabled="working || !config.enabled" @click="removeOperators">移除 OP</button>
            </div>

            <div class="rounded-xl border border-base-content/5 bg-base-100/70 p-3 overflow-x-auto">
              <table class="table table-sm">
                <thead>
                  <tr>
                    <th>玩家</th>
                    <th>ID</th>
                    <th>等级</th>
                    <th>绕过上限</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-if="loadingOperators"><td colspan="4">加载中...</td></tr>
                  <tr v-else-if="!operators.length"><td colspan="4">暂无数据</td></tr>
                  <tr v-for="item in operators" :key="`op-row-${playerName(item)}`">
                    <td>{{ item.name || '-' }}</td>
                    <td><code>{{ item.id || '-' }}</code></td>
                    <td>{{ item.permissionLevel ?? '-' }}</td>
                    <td>{{ item.bypassesPlayerLimit ? '是' : '否' }}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          <div v-else-if="activePanel === 'bans'" class="mt-4 grid grid-cols-1 gap-4 xl:grid-cols-[22rem,1fr]">
            <div class="rounded-xl border border-base-content/5 bg-base-100/70 p-3">
              <div class="font-bold text-sm">添加封禁</div>
              <div class="mt-2 flex flex-wrap gap-2">
                <button
                  v-for="p in selectablePlayers"
                  :key="`ban-add-${p}`"
                  class="btn btn-xs"
                  :class="banAddSelection.includes(p) ? 'btn-primary' : 'btn-ghost'"
                  @click="banAddSelection = togglePlayer(banAddSelection, p)"
                >
                  {{ p }}
                </button>
              </div>
              <div class="grid gap-2 mt-3">
                <input v-model="banReason" class="input input-sm input-bordered bg-base-100" placeholder="原因（可选）" />
                <input v-model="banSource" class="input input-sm input-bordered bg-base-100" placeholder="来源（可选）" />
                <input v-model="banExpiresAt" type="datetime-local" class="input input-sm input-bordered bg-base-100" />
              </div>
              <button class="btn btn-primary btn-sm w-full mt-3" :disabled="working || !config.enabled" @click="addBans">添加封禁</button>

              <div class="font-bold text-sm mt-4">解除封禁</div>
              <div class="mt-2 flex flex-wrap gap-2">
                <button
                  v-for="item in bans"
                  :key="`ban-remove-${playerName(item)}`"
                  class="btn btn-xs"
                  :class="banSelection.includes(playerName(item)) ? 'btn-warning' : 'btn-ghost'"
                  @click="banSelection = togglePlayer(banSelection, playerName(item))"
                >
                  {{ playerName(item) }}
                </button>
                <div v-if="!bans.length" class="text-sm opacity-60">暂无封禁</div>
              </div>
              <button class="btn btn-warning btn-sm w-full mt-3" :disabled="working || !config.enabled" @click="removeBans">解除封禁</button>
            </div>

            <div class="rounded-xl border border-base-content/5 bg-base-100/70 p-3 overflow-x-auto">
              <table class="table table-sm">
                <thead>
                  <tr>
                    <th>玩家</th>
                    <th>原因</th>
                    <th>来源</th>
                    <th>到期</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-if="loadingBans"><td colspan="4">加载中...</td></tr>
                  <tr v-else-if="!bans.length"><td colspan="4">暂无数据</td></tr>
                  <tr v-for="item in bans" :key="`ban-row-${playerName(item)}`">
                    <td>{{ playerName(item) }}</td>
                    <td>{{ item.reason || '-' }}</td>
                    <td>{{ item.source || '-' }}</td>
                    <td>{{ formatDateTime(item.expires) }}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          <div v-else-if="activePanel === 'rules'" class="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
            <div class="rounded-xl border border-base-content/5 bg-base-100/70 p-3">
              <div class="font-bold text-sm">更新游戏规则</div>
              <div class="grid gap-2 mt-3">
                <input v-model="gameRuleForm.key" class="input input-sm input-bordered bg-base-100" placeholder="规则 key，例如 doDaylightCycle" />
                <div class="grid grid-cols-[7rem,1fr] gap-2">
                  <select v-model="gameRuleForm.valueType" class="select select-sm select-bordered bg-base-100">
                    <option value="string">字符串</option>
                    <option value="number">数字</option>
                    <option value="boolean">布尔</option>
                  </select>
                  <input v-model="gameRuleForm.value" class="input input-sm input-bordered bg-base-100" placeholder="值" />
                </div>
              </div>
              <button class="btn btn-primary btn-sm w-full mt-3" :disabled="working || !config.enabled" @click="updateGameRule">更新规则</button>
            </div>

            <div class="rounded-xl border border-base-content/5 bg-base-100/70 p-3">
              <div class="font-bold text-sm">更新服务端设置</div>
              <div class="grid gap-2 mt-3">
                <input v-model="serverSettingForm.key" class="input input-sm input-bordered bg-base-100" placeholder="设置 key，例如 maxPlayers" />
                <div class="grid grid-cols-[7rem,1fr] gap-2">
                  <select v-model="serverSettingForm.valueType" class="select select-sm select-bordered bg-base-100">
                    <option value="string">字符串</option>
                    <option value="number">数字</option>
                    <option value="boolean">布尔</option>
                  </select>
                  <input v-model="serverSettingForm.value" class="input input-sm input-bordered bg-base-100" placeholder="值" />
                </div>
              </div>
              <button class="btn btn-primary btn-sm w-full mt-3" :disabled="working || !config.enabled" @click="updateServerSetting">更新设置</button>
            </div>
          </div>

          <div v-else-if="activePanel === 'rpc'" class="mt-4 rounded-xl border border-base-content/5 bg-base-100/70 p-3">
            <div class="font-bold text-sm">RPC 透传调用</div>
            <div class="grid gap-2 mt-3">
              <input v-model="rpcForm.method" class="input input-sm input-bordered bg-base-100" placeholder="方法名，例如 world.getTime" />
              <textarea
                v-model="rpcForm.paramsText"
                class="textarea textarea-bordered bg-base-100 min-h-28 font-mono text-xs"
                placeholder='参数 JSON（可选），例如 {"force":true}'
              />
            </div>
            <div class="flex flex-col sm:flex-row gap-2 mt-3">
              <button class="btn btn-primary btn-sm sm:w-36" :disabled="rpcRunning || !config.enabled" @click="callRpc">调用 RPC</button>
              <button class="btn btn-ghost btn-sm sm:w-36" @click="rpcResult = null; rpcError = ''">清空结果</button>
            </div>
            <div v-if="rpcError" class="mt-3 text-error text-sm">{{ rpcError }}</div>
            <pre v-if="rpcResult !== null" class="mt-3 rounded-lg border border-base-content/5 bg-base-200/60 p-3 text-xs overflow-x-auto">{{ JSON.stringify(rpcResult, null, 2) }}</pre>
          </div>

          <div v-else-if="activePanel === 'audit'" class="mt-4 rounded-xl border border-base-content/5 bg-base-100/70 p-3">
              <div class="flex flex-wrap items-center justify-between gap-2">
              <div class="font-bold text-sm">操作审计</div>
              <div class="flex items-center gap-2">
                <input v-model.number="auditLimit" type="number" min="1" max="200" class="input input-sm input-bordered bg-base-100 w-24" />
                <button class="btn btn-ghost btn-sm" :disabled="loadingAudits" @click="loadAudits">刷新</button>
              </div>
            </div>
            <div class="mt-3 space-y-2">
              <div v-if="loadingAudits" class="text-sm opacity-60">加载中...</div>
              <div v-else-if="!audits.length" class="text-sm opacity-60">暂无审计记录</div>
              <div v-for="item in audits" :key="item.id" class="rounded-lg border border-base-content/5 bg-base-200/60 p-3">
                <div class="flex flex-wrap items-center gap-2 text-xs">
                  <span class="badge badge-ghost">{{ item.action }}</span>
                  <span class="badge" :class="item.success ? 'badge-success' : 'badge-error'">{{ item.success ? '成功' : '失败' }}</span>
                  <span class="opacity-70">{{ formatDateTime(item.createdAt) }}</span>
                </div>
                <div class="mt-2 text-xs opacity-70">操作者：<code>{{ item.operatorId }}</code></div>
                <div class="mt-2 grid grid-cols-1 xl:grid-cols-2 gap-2">
                  <pre class="text-xs rounded border border-base-content/5 bg-base-100/70 p-2 overflow-x-auto">input: {{ JSON.stringify(item.input || {}, null, 2) }}</pre>
                  <pre class="text-xs rounded border border-base-content/5 bg-base-100/70 p-2 overflow-x-auto">{{ item.success ? `output: ${JSON.stringify(item.output || {}, null, 2)}` : `error: ${item.error || '-'}` }}</pre>
                </div>
              </div>
            </div>
          </div>
        </div>
      </template>
    </div>

    <BaseModal v-model="systemMessageModal.show" title="发送系统消息" box-class="max-w-xl w-full">
      <div class="grid gap-3">
        <label class="form-control">
          <div class="label"><span class="label-text">消息内容</span></div>
          <textarea v-model="systemMessageModal.message" class="textarea textarea-bordered bg-base-100 min-h-28" placeholder="请输入消息"></textarea>
        </label>

        <label class="label cursor-pointer justify-start gap-3">
          <input v-model="systemMessageModal.overlay" type="checkbox" class="toggle toggle-sm" />
          <span class="label-text">覆盖显示（overlay）</span>
        </label>

        <div>
          <div class="text-sm font-bold">发送给（可选）</div>
          <div class="text-xs opacity-60 mt-1">不选择则广播全体。</div>
          <div class="mt-2 flex flex-wrap gap-2">
            <button
              v-for="p in selectablePlayers"
              :key="p"
              class="btn btn-xs"
              :class="systemMessageModal.players.includes(p) ? 'btn-primary' : 'btn-ghost'"
              @click="systemMessageModal.players = togglePlayer(systemMessageModal.players, p)"
            >
              {{ p }}
            </button>
            <div v-if="!selectablePlayers.length" class="text-sm opacity-60">暂无可选玩家</div>
          </div>
        </div>
      </div>

      <template #actions="{ close }">
        <button class="btn btn-ghost" :disabled="working" @click="close()">取消</button>
        <button class="btn btn-primary" :disabled="working" @click="sendSystemMessage">发送</button>
      </template>
    </BaseModal>

    <BaseModal v-model="kickModal.show" title="踢出玩家" box-class="max-w-xl w-full">
      <div class="grid gap-3">
        <div>
          <div class="text-sm font-bold">选择玩家</div>
          <div class="mt-2 flex flex-wrap gap-2">
            <button
              v-for="p in selectablePlayers"
              :key="p"
              class="btn btn-xs"
              :class="kickModal.players.includes(p) ? 'btn-warning' : 'btn-ghost'"
              @click="kickModal.players = togglePlayer(kickModal.players, p)"
            >
              {{ p }}
            </button>
            <div v-if="!selectablePlayers.length" class="text-sm opacity-60">暂无可选玩家</div>
          </div>
        </div>

        <label class="form-control">
          <div class="label"><span class="label-text">踢出原因（可选）</span></div>
          <input v-model="kickModal.message" class="input input-sm input-bordered bg-base-100" placeholder="例如：违规行为" />
        </label>
      </div>

      <template #actions="{ close }">
        <button class="btn btn-ghost" :disabled="working" @click="close()">取消</button>
        <button class="btn btn-warning" :disabled="working" @click="kickPlayers">踢出</button>
      </template>
    </BaseModal>
  </div>
</template>
