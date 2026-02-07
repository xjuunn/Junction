<script setup lang="ts">
import * as adminApi from '~/api/admin'

definePageMeta({
  layout: 'admin',
  middleware: ['admin']
})

type AdminStatus = Awaited<ReturnType<typeof adminApi.getAdminStatus>>['data']
type AdminDatabaseStats = Awaited<ReturnType<typeof adminApi.getDatabaseStats>>['data']

const loading = ref(true)
const status = ref<AdminStatus | null>(null)
const database = ref<AdminDatabaseStats | null>(null)

const numberText = (value?: number | null) => {
  if (value === null || value === undefined) return '-'
  return value.toLocaleString()
}

const statusCards = computed(() => [
  { label: '在线用户', value: numberText(status.value?.onlineCount), icon: 'mingcute:user-3-line', tone: 'bg-primary/10 text-primary' },
  { label: '用户总数', value: numberText(status.value?.totalUsers), icon: 'mingcute:user-3-line', tone: 'bg-success/10 text-success' },
  { label: '机器人总数', value: numberText(status.value?.totalBots), icon: 'mingcute:ai-line', tone: 'bg-info/10 text-info' },
  { label: '会话总数', value: numberText(status.value?.totalConversations), icon: 'mingcute:chat-4-line', tone: 'bg-warning/10 text-warning' },
  { label: '消息总数', value: numberText(status.value?.totalMessages), icon: 'mingcute:message-4-line', tone: 'bg-secondary/10 text-secondary' }
])

const databaseCards = computed(() => [
  { label: '用户表', value: numberText(database.value?.users), icon: 'mingcute:user-2-line' },
  { label: '机器人表', value: numberText(database.value?.bots), icon: 'mingcute:ai-line' },
  { label: '会话表', value: numberText(database.value?.conversations), icon: 'mingcute:chat-4-line' },
  { label: '消息表', value: numberText(database.value?.messages), icon: 'mingcute:message-4-line' },
  { label: '好友关系表', value: numberText(database.value?.friendships), icon: 'mingcute:link-line' },
  { label: '通知表', value: numberText(database.value?.notifications), icon: 'mingcute:notification-line' }
])

const load = async () => {
  loading.value = true
  try {
    const [statusRes, dbRes] = await Promise.all([
      adminApi.getAdminStatus(),
      adminApi.getDatabaseStats()
    ])
    status.value = statusRes.data
    database.value = dbRes.data
  } finally {
    loading.value = false
  }
}

onMounted(load)
</script>

<template>
  <div class="space-y-6">
    <div class="bg-base-100 rounded-2xl border border-base-200 p-6 shadow-sm">
      <div class="flex items-center justify-between">
        <div>
          <h2 class="text-xl font-bold">系统概览</h2>
          <p class="text-sm text-base-content/60">实时掌控全局运营状态</p>
        </div>
        <button class="btn btn-sm btn-ghost" @click="load">刷新</button>
      </div>
      <div class="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-4 mt-6">
        <div
          v-for="card in statusCards"
          :key="card.label"
          class="rounded-2xl border border-base-200 p-4 bg-base-200/60"
        >
          <div class="flex items-center justify-between">
            <div class="text-sm text-base-content/60">{{ card.label }}</div>
            <div class="w-9 h-9 rounded-xl flex items-center justify-center" :class="card.tone">
              <Icon :name="card.icon" size="18" />
            </div>
          </div>
          <div class="mt-4 text-2xl font-semibold">
            <span v-if="loading">-</span>
            <span v-else>{{ card.value }}</span>
          </div>
        </div>
      </div>
    </div>

    <div class="bg-base-100 rounded-2xl border border-base-200 p-6 shadow-sm">
      <div class="flex items-center justify-between">
        <div>
          <h2 class="text-xl font-bold">数据表规模</h2>
          <p class="text-sm text-base-content/60">核心表容量与活跃度</p>
        </div>
      </div>
      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mt-6">
        <div
          v-for="card in databaseCards"
          :key="card.label"
          class="rounded-2xl border border-base-200 p-4 bg-base-200/60"
        >
          <div class="flex items-center gap-3">
            <div class="w-9 h-9 rounded-xl flex items-center justify-center bg-base-100 text-base-content/70">
              <Icon :name="card.icon" size="18" />
            </div>
            <div>
              <div class="text-sm text-base-content/60">{{ card.label }}</div>
              <div class="text-xl font-semibold">
                <span v-if="loading">-</span>
                <span v-else>{{ card.value }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
