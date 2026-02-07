<script setup lang="ts">
import type { AdminTableSchema } from '@junction/types'
import * as adminApi from '~/api/admin'

definePageMeta({
  layout: 'admin',
  middleware: ['admin']
})

const loading = ref(true)
const tables = ref<AdminTableSchema[]>([])
const stats = ref<Awaited<ReturnType<typeof adminApi.getDatabaseStats>>['data'] | null>(null)

const tableMeta = {
  user: { label: '用户', icon: 'mingcute:user-3-line', tone: 'bg-primary/10 text-primary', path: '/admin/tables/user' },
  aiBot: { label: '机器人', icon: 'mingcute:ai-line', tone: 'bg-info/10 text-info', path: '/admin/tables/aiBot' },
  conversation: { label: '会话', icon: 'mingcute:chat-4-line', tone: 'bg-warning/10 text-warning', path: '/admin/tables/conversation' },
  message: { label: '消息', icon: 'mingcute:message-4-line', tone: 'bg-secondary/10 text-secondary', path: '/admin/tables/message' },
  friendship: { label: '好友关系', icon: 'mingcute:link-line', tone: 'bg-success/10 text-success', path: '/admin/tables/friendship' },
  notification: { label: '通知', icon: 'mingcute:notification-line', tone: 'bg-accent/10 text-accent', path: '/admin/tables/notification' },
  aiLog: { label: 'AI 日志', icon: 'mingcute:document-line', tone: 'bg-base-200 text-base-content', path: '/admin/tables/aiLog' }
} as const

const tableCards = computed(() => {
  return tables.value.map((table) => {
    const meta = (tableMeta as any)[table.name] || { label: table.label, icon: 'mingcute:classify-2-line', tone: 'bg-base-200 text-base-content', path: `/admin/tables/${table.name}` }
    const countMap: Record<string, number | undefined> = {
      user: stats.value?.users,
      aiBot: stats.value?.bots,
      conversation: stats.value?.conversations,
      message: stats.value?.messages,
      friendship: stats.value?.friendships,
      notification: stats.value?.notifications
    }
    const count = countMap[table.name] ?? null
    return {
      name: table.name,
      label: meta.label,
      icon: meta.icon,
      tone: meta.tone,
      path: meta.path,
      count
    }
  })
})

const formatCount = (value: number | null) => {
  if (value === null || value === undefined) return '-'
  return value.toLocaleString()
}

const loadData = async () => {
  loading.value = true
  try {
    const [tableRes, statRes] = await Promise.all([
      adminApi.getDatabaseTables(),
      adminApi.getDatabaseStats()
    ])
    tables.value = tableRes.data || []
    stats.value = statRes.data || null
  } finally {
    loading.value = false
  }
}

onMounted(loadData)
</script>

<template>
  <div class="space-y-6">
    <div class="bg-base-100 rounded-2xl border border-base-200 p-6 shadow-sm">
      <div class="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 class="text-xl font-bold">数据治理</h2>
          <p class="text-sm text-base-content/60">按表独立管理，支持权限审计与数据修订</p>
        </div>
        <button class="btn btn-sm btn-ghost" @click="loadData">刷新</button>
      </div>

      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mt-6">
        <NuxtLink
          v-for="card in tableCards"
          :key="card.name"
          :to="card.path"
          class="group rounded-2xl border border-base-200 bg-base-200/40 p-5 transition-all hover:-translate-y-0.5 hover:border-base-300 hover:bg-base-100"
        >
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-3">
              <div class="w-10 h-10 rounded-xl flex items-center justify-center" :class="card.tone">
                <Icon :name="card.icon" size="20" />
              </div>
              <div>
                <div class="text-sm text-base-content/60">表</div>
                <div class="text-lg font-semibold">{{ card.label }}</div>
              </div>
            </div>
            <Icon name="mingcute:right-line" size="18" class="text-base-content/40 group-hover:text-base-content" />
          </div>
          <div class="mt-4 flex items-baseline gap-2 text-sm text-base-content/60">
            <span>记录</span>
            <span class="text-xl font-semibold text-base-content">{{ loading ? '-' : formatCount(card.count) }}</span>
          </div>
        </NuxtLink>
      </div>
    </div>
  </div>
</template>
