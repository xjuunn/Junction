<script setup lang="ts">
import * as mcApi from '~/api/mc-server'

definePageMeta({ layout: 'main' })
useHead({ title: 'Minecraft服务器管理' })

const toast = useToast()
const settings = useSettingsStore()

const MC_DEFAULT_URL = 'wss://localhost:25566'
const PRESET_SERVERS = [
  {
    id: 'local-default',
    name: '本地默认服务器',
    url: MC_DEFAULT_URL,
    tags: ['default', 'local'],
  },
] as const

const loading = ref(false)
const working = ref(false)

const servers = ref<Awaited<ReturnType<typeof mcApi.listMcServers>>['data']>([])
const selectedServerId = ref('')
const selectedServerStatus = ref<Awaited<ReturnType<typeof mcApi.getMcServerStatus>>['data'] | null>(null)
const allowList = ref<Awaited<ReturnType<typeof mcApi.getMcAllowList>>['data'] | null>(null)
const selectablePlayers = ref<string[]>([])
const audits = ref<Awaited<ReturnType<typeof mcApi.listMcAudits>>['data']>([])

const createForm = reactive({
  id: '',
  name: '',
  url: MC_DEFAULT_URL,
  token: '',
  tags: '',
  enabled: false
})

const messageForm = reactive({
  message: '',
  overlay: false
})

const kickForm = reactive({
  message: ''
})

const selectedBroadcastPlayers = ref<string[]>([])
const selectedKickPlayers = ref<string[]>([])
const selectedAllowListPlayers = ref<string[]>([])

const rpcForm = reactive({
  method: '',
  params: '{}'
})
const rpcResult = ref('')

const selectedServer = computed(() => servers.value?.find(item => item.id === selectedServerId.value) || null)
const isSelectedServerEnabled = computed(() => !!selectedServer.value?.enabled)

const parseNameList = (value: string) => {
  return value
    .split(',')
    .map(item => item.trim())
    .filter(Boolean)
}

const parseJsonSafe = (value: string) => {
  const trimmed = value.trim()
  if (!trimmed) return {}
  try {
    return JSON.parse(trimmed)
  } catch {
    throw new Error('JSON 参数格式无效')
  }
}

const togglePlayer = (list: Ref<string[]>, player: string) => {
  const current = new Set(list.value)
  if (current.has(player)) current.delete(player)
  else current.add(player)
  list.value = Array.from(current)
}

const loadServers = async () => {
  loading.value = true
  try {
    const res = await mcApi.listMcServers()
    servers.value = res.data || []
    if (!selectedServerId.value && servers.value?.length) {
      selectedServerId.value = servers.value[0].id
    } else if (selectedServerId.value && !servers.value?.some(item => item.id === selectedServerId.value)) {
      selectedServerId.value = servers.value?.[0]?.id || ''
    }
  } finally {
    loading.value = false
  }
}

const loadStatus = async (force = false) => {
  if (!selectedServerId.value) return
  if (!isSelectedServerEnabled.value) return
  const res = await mcApi.getMcServerStatus(selectedServerId.value, { force })
  selectedServerStatus.value = res.data || null
}

const loadAllowList = async () => {
  if (!selectedServerId.value) return
  if (!isSelectedServerEnabled.value) return
  const res = await mcApi.getMcAllowList(selectedServerId.value)
  allowList.value = res.data || null
}

const loadSelectablePlayers = async () => {
  if (!selectedServerId.value) return
  if (!isSelectedServerEnabled.value) return
  const res = await mcApi.listMcSelectablePlayers(selectedServerId.value)
  selectablePlayers.value = res.data?.players || []
}

const loadAudits = async () => {
  const res = await mcApi.listMcAudits({
    serverId: selectedServerId.value || undefined,
    limit: 20
  })
  audits.value = res.data || []
}

const refreshAll = async (force = false) => {
  if (!selectedServerId.value) return
  await Promise.all([loadStatus(force), loadAllowList(), loadSelectablePlayers(), loadAudits()])
}

watch(selectedServerId, async () => {
  selectedServerStatus.value = null
  allowList.value = null
  selectablePlayers.value = []
  selectedBroadcastPlayers.value = []
  selectedKickPlayers.value = []
  selectedAllowListPlayers.value = []
  await loadAudits()
  if (isSelectedServerEnabled.value) {
    await Promise.all([loadStatus(true), loadAllowList(), loadSelectablePlayers()])
  }
})

const assertEnabled = () => {
  if (!selectedServerId.value) return false
  if (isSelectedServerEnabled.value) return true
  toast.warning('该服务器已禁用，请先配置令牌并启用')
  return false
}

const withAction = async (action: () => Promise<any>, successText: string) => {
  if (!selectedServerId.value) {
    toast.warning('请先选择服务器')
    return
  }
  if (!assertEnabled()) return
  working.value = true
  try {
    await action()
    toast.success(successText)
    await refreshAll()
  } finally {
    working.value = false
  }
}

const handleCreateServer = async () => {
  if (!createForm.name.trim()) {
    toast.warning('请填写服务器名称')
    return
  }
  if (!createForm.url.trim()) {
    toast.warning('请填写服务器地址')
    return
  }
  const token = createForm.token.trim() || settings.mcDefaultToken.trim()
  if (createForm.enabled && !token) {
    toast.warning('启用服务器前必须配置令牌')
    return
  }

  working.value = true
  try {
    const res = await mcApi.createMcServer({
      id: createForm.id.trim() || undefined,
      name: createForm.name.trim(),
      url: createForm.url.trim() || undefined,
      token: token || undefined,
      protocol: 'mc-management',
      enabled: createForm.enabled,
      tags: parseNameList(createForm.tags)
    })
    toast.success('服务器已添加')
    await loadServers()
    selectedServerId.value = res.data?.id || selectedServerId.value
    createForm.id = ''
    createForm.name = ''
    createForm.url = MC_DEFAULT_URL
    createForm.token = ''
    createForm.tags = ''
    createForm.enabled = false
    await refreshAll(true)
  } finally {
    working.value = false
  }
}

const handleRemoveServer = async () => {
  if (!selectedServerId.value) return
  working.value = true
  try {
    await mcApi.removeMcServer(selectedServerId.value)
    await loadServers()
    toast.success('服务器已删除')
    if (selectedServerId.value) await refreshAll(true)
  } finally {
    working.value = false
  }
}

const handleReconnect = async () => {
  await withAction(async () => {
    await mcApi.reconnectMcServer(selectedServerId.value)
  }, '连接已重建')
}

const handleSave = async () => {
  await withAction(async () => {
    await mcApi.saveMcServer(selectedServerId.value, { flush: true })
  }, '保存成功')
}

const handleStop = async () => {
  await withAction(async () => {
    await mcApi.stopMcServer(selectedServerId.value)
  }, '停止指令已发送')
}

const handleSendMessage = async () => {
  if (!messageForm.message.trim()) {
    toast.warning('请输入广播消息')
    return
  }
  await withAction(async () => {
    await mcApi.sendMcSystemMessage(selectedServerId.value, {
      message: messageForm.message.trim(),
      players: selectedBroadcastPlayers.value,
      overlay: messageForm.overlay
    })
    messageForm.message = ''
    messageForm.overlay = false
    selectedBroadcastPlayers.value = []
  }, '消息发送成功')
}

const handleKick = async () => {
  if (!selectedKickPlayers.value.length) {
    toast.warning('请选择要踢出的玩家')
    return
  }
  await withAction(async () => {
    await mcApi.kickMcPlayers(selectedServerId.value, {
      players: selectedKickPlayers.value,
      message: kickForm.message.trim() || undefined
    })
    kickForm.message = ''
    selectedKickPlayers.value = []
  }, '踢人指令已发送')
}

const handleAllowListAdd = async () => {
  if (!selectedAllowListPlayers.value.length) {
    toast.warning('请选择要加入白名单的玩家')
    return
  }
  await withAction(async () => {
    await mcApi.addMcAllowList(selectedServerId.value, {
      players: selectedAllowListPlayers.value
    })
    selectedAllowListPlayers.value = []
  }, '白名单已更新')
}

const handleAllowListRemove = async (playerName: string) => {
  await withAction(async () => {
    await mcApi.removeMcAllowList(selectedServerId.value, { players: [playerName] })
  }, '白名单已移除')
}

const handleRpc = async () => {
  if (!rpcForm.method.trim()) {
    toast.warning('请输入 RPC 方法名')
    return
  }
  if (!assertEnabled()) return
  working.value = true
  try {
    const params = parseJsonSafe(rpcForm.params)
    const res = await mcApi.callMcRpc(selectedServerId.value, {
      method: rpcForm.method.trim(),
      params
    })
    rpcResult.value = JSON.stringify(res.data || {}, null, 2)
    toast.success('RPC 调用成功')
    await loadAudits()
  } finally {
    working.value = false
  }
}

onMounted(async () => {
  const syncPresetServers = async () => {
    if (!PRESET_SERVERS.length) return
    try {
      const existing = new Map((servers.value || []).map(item => [item.id, item]))
      for (const preset of PRESET_SERVERS) {
        const token = settings.mcDefaultToken.trim()
        const enabled = !!token
        const found = existing.get(preset.id)
        if (!found) {
          await mcApi.createMcServer({
            id: preset.id,
            name: preset.name,
            url: preset.url,
            token: token || undefined,
            protocol: 'mc-management',
            enabled,
            tags: [...preset.tags],
          })
          continue
        }
        await mcApi.updateMcServer(preset.id, {
          name: preset.name,
          url: preset.url,
          enabled,
          ...(token ? { token } : {}),
          tags: [...preset.tags],
        })
      }
    } catch {
      // 预置同步失败时不阻塞页面加载
    }
  }

  // 预置服务器列表与默认令牌由前端页面定义与持久化。
  // 后端不再从环境变量读取任何 mc-server 配置。
  await loadServers()
  await syncPresetServers()
  await loadServers()

  const firstEnabled = (servers.value || []).find(item => item.enabled)
  if (firstEnabled) selectedServerId.value = firstEnabled.id

  if (selectedServerId.value) {
    await loadAudits()
    if (isSelectedServerEnabled.value) {
      await Promise.all([loadStatus(true), loadAllowList(), loadSelectablePlayers()])
    }
  }

  watch(() => settings.mcDefaultToken, async () => {
    await loadServers()
    await syncPresetServers()
    await loadServers()
    if (selectedServerId.value) {
      await loadAudits()
      if (isSelectedServerEnabled.value) {
        await Promise.all([loadStatus(true), loadAllowList(), loadSelectablePlayers()])
      }
    }
  })
})
</script>

<template>
  <div class="h-full overflow-y-auto bg-base-100">
    <div class="mx-auto max-w-7xl px-6 py-8 space-y-6">
      <div class="flex items-start justify-between gap-4">
        <div>
          <h1 class="text-3xl font-black tracking-tight">Minecraft服务器管理</h1>
          <p class="text-sm text-base-content/60 mt-1">
            支持多服务器管理。默认地址为 <code>{{ MC_DEFAULT_URL }}</code>，管理令牌在本地持久化；玩家操作仅允许从服务器返回的可选列表中勾选。
          </p>
        </div>
        <button class="btn btn-ghost btn-sm" :disabled="loading || working" @click="loadServers">
          <Icon name="heroicons:arrow-path-20-solid" class="mr-1" />
          刷新列表
        </button>
      </div>

      <div class="grid grid-cols-1 lg:grid-cols-12 gap-5">
        <aside class="lg:col-span-4 space-y-4">
          <div class="rounded-2xl border border-base-content/5 bg-base-200/40 p-4 space-y-3">
            <div class="text-xs uppercase tracking-widest text-base-content/40">默认管理令牌（本地持久化）</div>
            <input v-model="settings.mcDefaultToken" class="input input-sm input-bordered w-full bg-base-100" placeholder="管理令牌（会持久化在本地）">
            <div class="text-xs text-base-content/50">
              注意：该令牌会保存在本地设置中，并在创建/同步预置服务器时发送到后端。
            </div>
          </div>

          <div class="rounded-2xl border border-base-content/5 bg-base-200/40 p-4">
            <div class="text-xs uppercase tracking-widest text-base-content/40 mb-3">服务器列表</div>
            <div class="space-y-2 max-h-80 overflow-y-auto">
              <button
                v-for="item in servers"
                :key="item.id"
                class="w-full text-left rounded-xl px-3 py-2 border transition-all"
                :class="selectedServerId === item.id
                  ? 'border-primary/40 bg-base-100 text-base-content'
                  : 'border-base-content/5 bg-base-200/60 text-base-content/70 hover:bg-base-100'"
                @click="selectedServerId = item.id"
              >
                <div class="flex items-center justify-between gap-2">
                  <div class="font-semibold truncate">{{ item.name }}</div>
                  <span class="badge badge-ghost badge-xs">{{ item.protocol }}</span>
                </div>
                <div class="text-[11px] opacity-50 truncate mt-1">{{ item.url }}</div>
              </button>
              <div v-if="!servers?.length" class="text-xs text-base-content/50 py-6 text-center">
                暂无服务器，请先添加。
              </div>
            </div>
          </div>

          <div class="rounded-2xl border border-base-content/5 bg-base-200/40 p-4 space-y-3">
            <div class="text-xs uppercase tracking-widest text-base-content/40">新增服务器</div>
            <input v-model="createForm.id" class="input input-sm input-bordered w-full bg-base-100" placeholder="ID（可选）">
            <input v-model="createForm.name" class="input input-sm input-bordered w-full bg-base-100" placeholder="名称">
            <input v-model="createForm.url" class="input input-sm input-bordered w-full bg-base-100" placeholder="wss://localhost:25566">
            <input v-model="createForm.token" class="input input-sm input-bordered w-full bg-base-100" placeholder="管理令牌（可选，默认使用上方令牌）">
            <input v-model="createForm.tags" class="input input-sm input-bordered w-full bg-base-100" placeholder="标签，逗号分隔">
            <label class="label cursor-pointer justify-start gap-2">
              <input v-model="createForm.enabled" type="checkbox" class="checkbox checkbox-sm">
              <span class="label-text">启用</span>
            </label>
            <button class="btn btn-sm btn-primary w-full" :disabled="working" @click="handleCreateServer">
              保存服务器
            </button>
          </div>
        </aside>

        <main class="lg:col-span-8 space-y-4">
          <div class="rounded-2xl border border-base-content/5 bg-base-200/40 p-5">
            <div class="flex flex-wrap items-center justify-between gap-3">
              <div>
                <div class="text-lg font-bold">{{ selectedServer?.name || '未选择服务器' }}</div>
                <div class="text-xs text-base-content/50">{{ selectedServer?.url || '请在左侧选择或创建服务器' }}</div>
              </div>
              <div class="flex items-center gap-2">
                <button class="btn btn-ghost btn-sm" :disabled="working || !selectedServerId" @click="handleReconnect">重连</button>
                <button class="btn btn-ghost btn-sm" :disabled="working || !selectedServerId" @click="handleSave">保存</button>
                <button class="btn btn-error btn-soft btn-sm" :disabled="working || !selectedServerId" @click="handleStop">停止</button>
                <button class="btn btn-error btn-ghost btn-sm" :disabled="working || !selectedServerId" @click="handleRemoveServer">删除</button>
              </div>
            </div>
            <div v-if="selectedServer && !selectedServer.enabled" class="mt-3 rounded-xl border border-warning/20 bg-warning/10 p-3 text-sm">
              <div class="font-semibold">该服务器已禁用</div>
              <div class="text-xs text-base-content/60 mt-1">请先在左侧配置“默认管理令牌”，再启用服务器（预置服务器会自动同步启用）。</div>
            </div>
            <div class="grid grid-cols-1 md:grid-cols-3 gap-3 mt-4">
              <div class="rounded-xl bg-base-100 border border-base-content/5 p-3">
                <div class="text-[11px] text-base-content/50">运行状态</div>
                <div class="text-sm font-semibold mt-1">{{ selectedServerStatus?.started ? '运行中' : '未运行/启动中' }}</div>
              </div>
              <div class="rounded-xl bg-base-100 border border-base-content/5 p-3">
                <div class="text-[11px] text-base-content/50">版本</div>
                <div class="text-sm font-semibold mt-1">{{ selectedServerStatus?.version?.name || '-' }}</div>
              </div>
              <div class="rounded-xl bg-base-100 border border-base-content/5 p-3">
                <div class="text-[11px] text-base-content/50">在线玩家</div>
                <div class="text-sm font-semibold mt-1">{{ selectedServerStatus?.players?.length || 0 }}</div>
              </div>
            </div>
          </div>

          <div class="rounded-2xl border border-base-content/5 bg-base-200/40 p-4 space-y-3">
            <div class="text-sm font-semibold">可选玩家池（来自在线/白名单/OP/封禁）</div>
            <div class="flex flex-wrap gap-2">
              <span v-for="player in selectablePlayers" :key="player" class="badge badge-ghost">{{ player }}</span>
              <span v-if="!selectablePlayers.length" class="text-xs text-base-content/50">当前无可选玩家</span>
            </div>
          </div>

          <div class="grid grid-cols-1 xl:grid-cols-2 gap-4">
            <div class="rounded-2xl border border-base-content/5 bg-base-200/40 p-4 space-y-3">
              <div class="text-sm font-semibold">广播消息</div>
              <input v-model="messageForm.message" class="input input-sm input-bordered w-full bg-base-100" placeholder="发送给全服或已勾选玩家">
              <label class="label cursor-pointer justify-start gap-2">
                <input v-model="messageForm.overlay" type="checkbox" class="checkbox checkbox-sm">
                <span class="label-text">作为 Overlay 显示</span>
              </label>
              <div class="max-h-32 overflow-y-auto rounded-xl border border-base-content/5 bg-base-100 p-2 space-y-1">
                <label v-for="player in selectablePlayers" :key="`msg-${player}`" class="flex items-center gap-2 text-xs">
                  <input
                    type="checkbox"
                    class="checkbox checkbox-xs"
                    :checked="selectedBroadcastPlayers.includes(player)"
                    @change="togglePlayer(selectedBroadcastPlayers, player)"
                  >
                  <span>{{ player }}</span>
                </label>
                <div v-if="!selectablePlayers.length" class="text-xs text-base-content/50">未发现可选玩家</div>
              </div>
              <button class="btn btn-sm btn-ghost w-full" :disabled="working || !selectedServerId" @click="handleSendMessage">
                发送消息（不勾选则全服）
              </button>
            </div>

            <div class="rounded-2xl border border-base-content/5 bg-base-200/40 p-4 space-y-3">
              <div class="text-sm font-semibold">踢出玩家</div>
              <input v-model="kickForm.message" class="input input-sm input-bordered w-full bg-base-100" placeholder="踢出提示（可选）">
              <div class="max-h-32 overflow-y-auto rounded-xl border border-base-content/5 bg-base-100 p-2 space-y-1">
                <label v-for="player in selectablePlayers" :key="`kick-${player}`" class="flex items-center gap-2 text-xs">
                  <input
                    type="checkbox"
                    class="checkbox checkbox-xs"
                    :checked="selectedKickPlayers.includes(player)"
                    @change="togglePlayer(selectedKickPlayers, player)"
                  >
                  <span>{{ player }}</span>
                </label>
                <div v-if="!selectablePlayers.length" class="text-xs text-base-content/50">未发现可选玩家</div>
              </div>
              <button class="btn btn-sm btn-ghost w-full" :disabled="working || !selectedServerId" @click="handleKick">
                执行踢出
              </button>
            </div>
          </div>

          <div class="rounded-2xl border border-base-content/5 bg-base-200/40 p-4 space-y-3">
            <div class="flex items-center justify-between gap-2">
              <div class="text-sm font-semibold">白名单</div>
              <span class="text-xs text-base-content/50">共 {{ allowList?.players?.length || 0 }} 人</span>
            </div>
            <div class="max-h-32 overflow-y-auto rounded-xl border border-base-content/5 bg-base-100 p-2 space-y-1">
              <label v-for="player in selectablePlayers" :key="`allow-add-${player}`" class="flex items-center gap-2 text-xs">
                <input
                  type="checkbox"
                  class="checkbox checkbox-xs"
                  :checked="selectedAllowListPlayers.includes(player)"
                  @change="togglePlayer(selectedAllowListPlayers, player)"
                >
                <span>{{ player }}</span>
              </label>
              <div v-if="!selectablePlayers.length" class="text-xs text-base-content/50">未发现可选玩家</div>
            </div>
            <button class="btn btn-sm btn-ghost" :disabled="working || !selectedServerId" @click="handleAllowListAdd">
              将勾选玩家加入白名单
            </button>
            <div class="flex flex-wrap gap-2">
              <div
                v-for="player in allowList?.players || []"
                :key="player.id || player.name"
                class="badge badge-ghost gap-2 py-3 pl-3 pr-2"
              >
                <span>{{ player.name || player.id }}</span>
                <button class="btn btn-xs btn-ghost" @click="handleAllowListRemove(player.name || player.id || '')">
                  <Icon name="heroicons:x-mark-20-solid" />
                </button>
              </div>
              <div v-if="!(allowList?.players || []).length" class="text-xs text-base-content/50">暂无白名单玩家</div>
            </div>
          </div>

          <div class="rounded-2xl border border-base-content/5 bg-base-200/40 p-4 space-y-3">
            <div class="text-sm font-semibold">原生 RPC 透传</div>
            <input v-model="rpcForm.method" class="input input-sm input-bordered w-full bg-base-100" placeholder="minecraft:server/status">
            <textarea v-model="rpcForm.params" class="textarea textarea-bordered w-full h-24 bg-base-100 font-mono text-xs" />
            <button class="btn btn-sm btn-ghost" :disabled="working || !selectedServerId" @click="handleRpc">执行 RPC</button>
            <pre v-if="rpcResult" class="rounded-xl bg-base-100 border border-base-content/5 p-3 text-xs overflow-auto max-h-52">{{ rpcResult }}</pre>
          </div>

          <div class="rounded-2xl border border-base-content/5 bg-base-200/40 p-4">
            <div class="flex items-center justify-between">
              <div class="text-sm font-semibold">审计日志</div>
              <button class="btn btn-ghost btn-xs" :disabled="working" @click="loadAudits">刷新</button>
            </div>
            <div class="mt-3 space-y-2 max-h-72 overflow-y-auto">
              <div
                v-for="item in audits || []"
                :key="item.id"
                class="rounded-xl border border-base-content/5 bg-base-100 px-3 py-2"
              >
                <div class="flex items-center justify-between gap-2">
                  <div class="text-xs font-semibold">{{ item.action }}</div>
                  <span class="badge badge-xs" :class="item.success ? 'badge-success badge-soft' : 'badge-error badge-soft'">
                    {{ item.success ? '成功' : '失败' }}
                  </span>
                </div>
                <div class="text-[11px] text-base-content/55 mt-1">{{ item.createdAt }} / {{ item.operatorId }}</div>
              </div>
              <div v-if="!(audits || []).length" class="text-xs text-base-content/50">暂无操作记录</div>
            </div>
          </div>
        </main>
      </div>
    </div>
  </div>
</template>
