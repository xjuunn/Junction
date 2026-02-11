<script setup lang="ts">
import type { McServerCreateInput, McServerPublicConfig, McServerUpdateInput } from '@junction/types'
import * as mcApi from '~/api/mc-server'

definePageMeta({ layout: 'main' })
useHead({ title: 'Minecraft 服务器管理' })

const toast = useToast()
const settings = useSettingsStore()
const router = useRouter()

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
const servers = ref<McServerPublicConfig[]>([])

const statusCache = reactive<Record<string, { text: string; cls: string }>>({})

const addModal = reactive({
  show: false,
  form: {
    id: '',
    name: '新服务器',
    url: MC_DEFAULT_URL,
    token: '',
    tags: 'prod',
    enabled: false,
  },
})

const editModal = reactive({
  show: false,
  serverId: '',
  form: {
    name: '',
    url: '',
    token: '',
    tags: '',
    enabled: false,
  },
})

const parseTags = (value: string) => {
  return value
    .split(',')
    .map(v => v.trim())
    .filter(Boolean)
}

const presetUpsert = async () => {
  if (!PRESET_SERVERS.length) return
  const currentIds = new Set(servers.value.map(s => s.id))
  for (const preset of PRESET_SERVERS) {
    if (currentIds.has(preset.id)) continue
    const token = settings.mcDefaultToken.trim()
    await mcApi.createMcServer({
      id: preset.id,
      name: preset.name,
      url: preset.url,
      token,
      enabled: !!token,
      tags: preset.tags as unknown as string[],
    })
  }
}

const loadServers = async () => {
  loading.value = true
  try {
    const res = await mcApi.listMcServers()
    servers.value = res.data || []
    await presetUpsert()
    const again = await mcApi.listMcServers()
    servers.value = again.data || []
  } finally {
    loading.value = false
  }
}

const refreshRowStatus = async (server: McServerPublicConfig) => {
  if (!server.enabled) {
    statusCache[server.id] = { text: '已禁用', cls: 'badge-ghost' }
    return
  }
  try {
    const status = await mcApi.getMcServerStatus(server.id, { force: false })
    const started = !!status.data?.started
    const count = status.data?.players?.length ?? 0
    statusCache[server.id] = started
      ? { text: `运行中 · ${count} 人`, cls: 'badge-success' }
      : { text: '未启动', cls: 'badge-warning' }
  } catch (e: any) {
    statusCache[server.id] = { text: '不可达', cls: 'badge-error' }
  }
}

const refreshAllStatuses = async () => {
  await Promise.all(servers.value.map(s => refreshRowStatus(s)))
}

const openAdd = () => {
  addModal.form = {
    id: '',
    name: '新服务器',
    url: MC_DEFAULT_URL,
    token: settings.mcDefaultToken.trim(),
    tags: 'prod',
    enabled: !!settings.mcDefaultToken.trim(),
  }
  addModal.show = true
}

const openEdit = (server: McServerPublicConfig) => {
  editModal.serverId = server.id
  editModal.form = {
    name: server.name,
    url: server.url,
    token: settings.mcDefaultToken.trim(),
    tags: (server.tags || []).join(','),
    enabled: server.enabled,
  }
  editModal.show = true
}

const createServer = async () => {
  const token = addModal.form.token.trim()
  const payload: McServerCreateInput = {
    id: addModal.form.id.trim() || undefined,
    name: addModal.form.name.trim(),
    protocol: 'mc-management',
    url: addModal.form.url.trim() || MC_DEFAULT_URL,
    token,
    enabled: addModal.form.enabled && !!token,
    tags: parseTags(addModal.form.tags),
  }

  working.value = true
  try {
    const res = await mcApi.createMcServer(payload)
    toast.success('服务器已添加')
    addModal.show = false
    await loadServers()
    await router.push(`/tools/minecraft/${res.data?.id}`)
  } finally {
    working.value = false
  }
}

const updateServer = async () => {
  const serverId = editModal.serverId
  if (!serverId) return
  const token = editModal.form.token.trim()
  const payload: McServerUpdateInput = {
    name: editModal.form.name.trim(),
    url: editModal.form.url.trim(),
    token,
    enabled: editModal.form.enabled && !!token,
    tags: parseTags(editModal.form.tags),
  }
  working.value = true
  try {
    await mcApi.updateMcServer(serverId, payload)
    toast.success('已保存')
    editModal.show = false
    await loadServers()
  } finally {
    working.value = false
  }
}

const removeServer = async (server: McServerPublicConfig) => {
  if (server.id === 'local-default') {
    toast.error('本地默认服务器不允许删除')
    return
  }
  working.value = true
  try {
    await mcApi.removeMcServer(server.id)
    toast.success('已删除')
    await loadServers()
  } finally {
    working.value = false
  }
}

onMounted(async () => {
  await loadServers()
  await refreshAllStatuses()
})
</script>

<template>
  <div class="h-full w-full overflow-hidden bg-base-100">
    <div class="h-full w-full overflow-y-auto p-6">
      <div class="flex items-start justify-between gap-4">
        <div>
          <div class="text-2xl font-black tracking-tight">Minecraft 服务器管理</div>
          <div class="text-sm opacity-60 mt-1">
            统一管理多个服务器。默认地址为 <code>{{ MC_DEFAULT_URL }}</code>，管理令牌可在“设置”中持久化。
          </div>
        </div>
        <div class="flex items-center gap-2">
          <button class="btn btn-ghost btn-sm" :disabled="loading || working" @click="refreshAllStatuses">
            <Icon name="mingcute:refresh-2-line" class="text-lg" />
            刷新状态
          </button>
          <button class="btn btn-primary btn-sm" :disabled="loading || working" @click="openAdd">
            <Icon name="mingcute:add-line" class="text-lg" />
            添加服务器
          </button>
        </div>
      </div>

      <div class="mt-6 grid gap-3">
        <div
          v-for="s in servers"
          :key="s.id"
          class="group border border-base-content/5 bg-base-200/40 hover:bg-base-200/60 rounded-2xl p-4 transition cursor-pointer"
          @click="$router.push(`/tools/minecraft/${s.id}`)"
        >
          <div class="flex items-center justify-between gap-3">
            <div class="min-w-0">
              <div class="flex items-center gap-2 min-w-0">
                <div class="font-bold truncate">{{ s.name }}</div>
                <span class="badge badge-sm badge-ghost">{{ s.protocol }}</span>
                <span v-if="statusCache[s.id]" class="badge badge-sm" :class="statusCache[s.id].cls">
                  {{ statusCache[s.id].text }}
                </span>
                <span v-else class="badge badge-sm badge-ghost">未知</span>
              </div>
              <div class="text-xs opacity-60 mt-1 flex flex-wrap gap-2">
                <span class="truncate">ID: <code>{{ s.id }}</code></span>
                <span class="truncate">URL: <code>{{ s.url }}</code></span>
                <span v-if="s.tags?.length" class="truncate">标签: <code>{{ s.tags.join(', ') }}</code></span>
              </div>
            </div>

            <div class="flex items-center gap-2 shrink-0" @click.stop>
              <button class="btn btn-ghost btn-sm" :disabled="working" @click="openEdit(s)">
                <Icon name="mingcute:edit-2-line" class="text-lg" />
                编辑
              </button>
              <button class="btn btn-ghost btn-sm text-error" :disabled="working" @click="removeServer(s)">
                <Icon name="mingcute:delete-2-line" class="text-lg" />
                删除
              </button>
              <button class="btn btn-ghost btn-sm" :disabled="working" @click="refreshRowStatus(s)">
                <Icon name="mingcute:refresh-2-line" class="text-lg" />
              </button>
            </div>
          </div>
        </div>

        <div v-if="!servers.length && !loading" class="text-sm opacity-60 border border-base-content/5 rounded-2xl p-6">
          暂无服务器。点击“添加服务器”创建一个，或配置设置中的默认令牌以启用本地默认服务器。
        </div>
      </div>
    </div>

    <BaseModal v-model="addModal.show" title="添加服务器" box-class="max-w-lg w-full">
      <div class="grid gap-3">
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <label class="form-control">
            <div class="label"><span class="label-text">服务器 ID（可选）</span></div>
            <input v-model="addModal.form.id" class="input input-sm input-bordered bg-base-100" placeholder="例如：local-mc" />
          </label>
          <label class="form-control">
            <div class="label"><span class="label-text">服务器名称</span></div>
            <input v-model="addModal.form.name" class="input input-sm input-bordered bg-base-100" placeholder="新服务器" />
          </label>
        </div>

        <label class="form-control">
          <div class="label"><span class="label-text">管理 URL</span></div>
          <input v-model="addModal.form.url" class="input input-sm input-bordered bg-base-100" placeholder="wss://localhost:25566" />
        </label>

        <label class="form-control">
          <div class="label">
            <span class="label-text">管理令牌</span>
            <span class="label-text-alt opacity-60">留空则创建为禁用</span>
          </div>
          <input v-model="addModal.form.token" type="password" class="input input-sm input-bordered bg-base-100" placeholder="management-server-secret" />
        </label>

        <label class="form-control">
          <div class="label"><span class="label-text">标签（逗号分隔）</span></div>
          <input v-model="addModal.form.tags" class="input input-sm input-bordered bg-base-100" placeholder="default,prod" />
        </label>

        <label class="label cursor-pointer justify-start gap-3">
          <input v-model="addModal.form.enabled" type="checkbox" class="toggle toggle-sm" />
          <span class="label-text">启用此服务器</span>
        </label>
      </div>

      <template #actions="{ close }">
        <button class="btn btn-ghost" :disabled="working" @click="close()">取消</button>
        <button class="btn btn-primary" :disabled="working" @click="createServer">创建并进入</button>
      </template>
    </BaseModal>

    <BaseModal v-model="editModal.show" title="编辑服务器" box-class="max-w-lg w-full">
      <div class="grid gap-3">
        <label class="form-control">
          <div class="label"><span class="label-text">服务器名称</span></div>
          <input v-model="editModal.form.name" class="input input-sm input-bordered bg-base-100" />
        </label>

        <label class="form-control">
          <div class="label"><span class="label-text">管理 URL</span></div>
          <input v-model="editModal.form.url" class="input input-sm input-bordered bg-base-100" />
        </label>

        <label class="form-control">
          <div class="label">
            <span class="label-text">管理令牌</span>
            <span class="label-text-alt opacity-60">不保存到列表，仅用于更新后端连接</span>
          </div>
          <input v-model="editModal.form.token" type="password" class="input input-sm input-bordered bg-base-100" placeholder="留空将禁用" />
        </label>

        <label class="form-control">
          <div class="label"><span class="label-text">标签（逗号分隔）</span></div>
          <input v-model="editModal.form.tags" class="input input-sm input-bordered bg-base-100" />
        </label>

        <label class="label cursor-pointer justify-start gap-3">
          <input v-model="editModal.form.enabled" type="checkbox" class="toggle toggle-sm" />
          <span class="label-text">启用此服务器</span>
        </label>
      </div>

      <template #actions="{ close }">
        <button class="btn btn-ghost" :disabled="working" @click="close()">取消</button>
        <button class="btn btn-primary" :disabled="working" @click="updateServer">保存</button>
      </template>
    </BaseModal>
  </div>
</template>

