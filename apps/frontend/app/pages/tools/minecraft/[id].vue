<script setup lang="ts">
import type { McServerPublicConfig, McServerStatus } from '@junction/types'
import { SocketClient } from '~/core/socket/socket.client'
import * as mcApi from '~/api/mc-server'

definePageMeta({ layout: 'main' })

const toast = useToast()
const route = useRoute()
const router = useRouter()
const settings = useSettingsStore()

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

const togglePlayer = (list: string[], player: string) => {
  const set = new Set(list)
  if (set.has(player)) set.delete(player)
  else set.add(player)
  return Array.from(set)
}

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
    lastFetchedAt.value = payload.fetchedAt
    connectError.value = payload.error || ''
  })

  offEvent = socket.on('mc-server:notification', payload => {
    if (payload.serverId !== serverId.value) return
    events.value.unshift(payload)
    if (events.value.length > maxEvents) events.value.splice(maxEvents)
  })

  socket.emit('mc-server:subscribe', { serverId: serverId.value }, ack => {
    if (!ack?.ok) {
      connectError.value = ack?.error || '订阅失败'
      return
    }
    config.value = ack.config || config.value
    status.value = ack.status || null
    connectError.value = ack.error || ''
    events.value = (ack.events || []).slice(0, maxEvents)
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

const handleReconnect = async () => {
  if (!serverId.value) return
  working.value = true
  try {
    await mcApi.reconnectMcServer(serverId.value)
    toast.success('已重连')
  } finally {
    working.value = false
  }
}

const handleSave = async () => {
  if (!serverId.value) return
  working.value = true
  try {
    await mcApi.saveMcServer(serverId.value, { flush: false })
    toast.success('已触发保存')
  } finally {
    working.value = false
  }
}

const handleStop = async () => {
  if (!serverId.value) return
  working.value = true
  try {
    await mcApi.stopMcServer(serverId.value)
    toast.success('已发送停止命令')
  } finally {
    working.value = false
  }
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
  working.value = true
  try {
    await mcApi.sendMcSystemMessage(serverId.value, {
      message,
      overlay: systemMessageModal.overlay,
      players: systemMessageModal.players.length ? systemMessageModal.players : undefined,
    })
    toast.success('已发送')
    systemMessageModal.show = false
  } finally {
    working.value = false
  }
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
  working.value = true
  try {
    await mcApi.kickMcPlayers(serverId.value, { players: kickModal.players, message: kickModal.message.trim() || null })
    toast.success('已踢出')
    kickModal.show = false
  } finally {
    working.value = false
  }
}

const enableServer = async () => {
  if (!serverId.value) return
  if (!config.value) return
  const token = settings.mcDefaultToken.trim()
  if (!token) {
    toast.error('请先在设置中填写管理令牌')
    return
  }
  working.value = true
  try {
    await mcApi.updateMcServer(serverId.value, { enabled: true, token })
    toast.success('已启用')
  } finally {
    working.value = false
  }
}

onMounted(async () => {
  await loadConfig()
  await subscribeRealtime()
})

onBeforeUnmount(async () => {
  await unsubscribeRealtime()
})

watch(serverId, async () => {
  await unsubscribeRealtime()
  events.value = []
  status.value = null
  lastFetchedAt.value = ''
  connectError.value = ''
  await loadConfig()
  await subscribeRealtime()
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

      <div v-if="loading" class="mt-6 text-sm opacity-60">加载中…</div>

      <div v-else-if="!config" class="mt-6 border border-base-content/5 rounded-2xl p-6">
        <div class="font-bold">服务器不存在</div>
        <div class="text-sm opacity-60 mt-2">请返回列表检查 ID 是否正确。</div>
      </div>

      <template v-else>
        <div class="mt-6 grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div class="lg:col-span-2 border border-base-content/5 bg-base-200/40 rounded-2xl p-4">
            <div class="flex items-center justify-between">
              <div class="font-bold">实时状态</div>
              <div class="text-xs opacity-60">更新时间：{{ lastFetchedAt || '—' }}</div>
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
                <div class="mt-1 font-bold truncate">{{ status?.version?.name || '—' }}</div>
              </div>
              <div class="border border-base-content/5 bg-base-100/60 rounded-xl p-3">
                <div class="text-xs opacity-60">在线玩家</div>
                <div class="mt-1 font-bold">{{ status?.players?.length ?? 0 }}</div>
              </div>
            </div>

            <div class="mt-4">
              <div class="text-sm font-bold mb-2">在线玩家</div>
              <div v-if="status?.players?.length" class="flex flex-wrap gap-2">
                <span v-for="p in status.players" :key="p.id || p.name" class="badge badge-ghost">
                  {{ p.name || p.id }}
                </span>
              </div>
              <div v-else class="text-sm opacity-60">暂无</div>
            </div>
          </div>

          <div class="border border-base-content/5 bg-base-200/40 rounded-2xl p-4">
            <div class="font-bold">常用操作</div>
            <div class="text-sm opacity-60 mt-1">玩家名单不允许手动输入，只能从可选列表中勾选。</div>

            <div class="mt-4 grid gap-2">
              <button class="btn btn-ghost justify-start" :disabled="working || !config.enabled" @click="openSystemMessage">
                <Icon name="mingcute:announcement-line" class="text-lg" />
                发送系统消息
              </button>
              <button class="btn btn-ghost justify-start text-warning" :disabled="working || !config.enabled" @click="openKick">
                <Icon name="mingcute:user-remove-2-line" class="text-lg" />
                踢出玩家
              </button>
            </div>
          </div>
        </div>

        <div class="mt-6 border border-base-content/5 bg-base-200/40 rounded-2xl p-4">
          <div class="flex items-center justify-between">
            <div class="font-bold">服务器消息</div>
            <div class="text-xs opacity-60">实时推送（包含连接事件与管理端通知）</div>
          </div>

          <div v-if="!events.length" class="text-sm opacity-60 mt-3">暂无消息</div>

          <div v-else class="mt-3 grid gap-2">
            <div
              v-for="(ev, idx) in events"
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

