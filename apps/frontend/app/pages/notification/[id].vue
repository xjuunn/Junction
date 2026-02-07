<script setup lang="ts">
import * as NotificationApi from '~/api/notification'
import type { PrismaTypes } from '@junction/types'

definePageMeta({ layout: 'main' })

const route = useRoute()
const router = useRouter()
const toast = useToast()

const loading = ref(true)
const notification = ref<PrismaTypes.Notification | null>(null)

const notificationId = computed(() => route.params.id as string)

const formatDate = (value?: string | Date | null) => {
  if (!value) return '-'
  const date = typeof value === 'string' ? new Date(value) : value
  return Number.isNaN(date.getTime()) ? '-' : date.toLocaleString()
}

const formatJson = (value: any) => {
  if (value === null || value === undefined) return '-'
  try {
    return typeof value === 'string' ? value : JSON.stringify(value, null, 2)
  } catch {
    return String(value)
  }
}

const getIconByType = (type: string): string => {
  const map: Record<string, string> = {
    SYSTEM: 'mingcute:computer-line',
    MESSAGE: 'mingcute:chat-4-line',
    FRIEND_REQUEST: 'mingcute:user-add-2-line',
    MODULE_UPDATE: 'mingcute:upload-2-line',
    DOWNLOAD: 'mingcute:download-2-line',
    WARNING: 'mingcute:alert-line',
    CUSTOM: 'mingcute:notification-line'
  }
  return map[type] || 'mingcute:notification-line'
}

const getColorByType = (type: string): string => {
  const map: Record<string, string> = {
    SYSTEM: 'text-info',
    MESSAGE: 'text-success',
    FRIEND_REQUEST: 'text-primary',
    MODULE_UPDATE: 'text-secondary',
    DOWNLOAD: 'text-accent',
    WARNING: 'text-warning',
    CUSTOM: 'text-neutral-content'
  }
  return map[type] || 'text-base-content'
}

const getTypeLabel = (type: string): string => {
  const map: Record<string, string> = {
    SYSTEM: '系统',
    MESSAGE: '消息',
    FRIEND_REQUEST: '好友请求',
    MODULE_UPDATE: '模块更新',
    DOWNLOAD: '下载',
    WARNING: '警告',
    CUSTOM: '自定义'
  }
  return map[type] || type
}

const getLevelLabel = (level: string): string => {
  const map: Record<string, string> = {
    LOW: '低',
    NORMAL: '普通',
    HIGH: '高',
    URGENT: '紧急'
  }
  return map[level] || level
}

const getLevelBadgeClass = (level: string): string => {
  const map: Record<string, string> = {
    LOW: 'badge-ghost',
    NORMAL: 'badge-ghost',
    HIGH: 'badge-warning',
    URGENT: 'badge-error'
  }
  return map[level] || 'badge-ghost'
}

const getProcessLabel = (status: string): string => {
  const map: Record<string, string> = {
    PENDING: '待处理',
    PROCESSED: '已处理',
    EXPIRED: '已过期',
    CANCELED: '已取消'
  }
  return map[status] || status
}

const goBack = () => {
  router.push('/notification')
}

const handleAction = () => {
  if (!notification.value) return
  if (notification.value.actionPath) {
    router.push(notification.value.actionPath)
    return
  }
  const payload = (notification.value.actionPayload || {}) as any
  if (payload?.conversationId) {
    router.push(`/chat/${payload.conversationId}`)
    return
  }
  if (payload?.conversation?.id) {
    router.push(`/chat/${payload.conversation.id}`)
    return
  }
  toast.info('暂无可执行动作')
}

const loadDetail = async () => {
  loading.value = true
  try {
    const res = await NotificationApi.findOne(notificationId.value)
    if (!res.success || !res.data) {
      toast.error('无法加载通知')
      goBack()
      return
    }
    notification.value = res.data
    if (res.data.status === 'UNREAD') {
      await NotificationApi.markAsRead(res.data.id)
    }
  } catch {
    toast.error('加载失败')
  } finally {
    loading.value = false
  }
}

onMounted(loadDetail)
</script>

<template>
  <div class="h-full flex flex-col bg-base-100 overflow-y-auto">
    <div class="px-6 pt-6 pb-4 border-b border-base-200 flex items-center justify-between">
      <div class="flex items-center gap-3">
        <button class="btn btn-ghost btn-sm" @click="goBack">返回</button>
        <div class="w-10 h-10 rounded-2xl bg-base-200/60 flex items-center justify-center">
          <Icon :name="getIconByType(notification?.type || 'CUSTOM')" size="20" :class="getColorByType(notification?.type || 'CUSTOM')" />
        </div>
        <div>
          <div class="text-sm text-base-content/60">通知详情</div>
          <div class="text-lg font-semibold">{{ notification?.title || '通知' }}</div>
        </div>
      </div>
      <button class="btn btn-sm btn-primary" @click="handleAction">执行动作</button>
    </div>

    <div class="p-6 space-y-6">
      <div v-if="loading" class="flex items-center justify-center h-64">
        <span class="loading loading-spinner loading-lg text-primary opacity-30"></span>
      </div>

      <div v-else-if="notification" class="space-y-6">
        <div class="rounded-2xl border border-base-200 bg-base-200/40 p-5">
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-2 text-sm text-base-content/60">
              <span class="badge badge-ghost badge-sm">{{ getTypeLabel(notification.type) }}</span>
              <span v-if="notification.level" class="badge badge-sm" :class="getLevelBadgeClass(notification.level)">{{ getLevelLabel(notification.level) }}</span>
              <span v-if="notification.processStatus" class="badge badge-ghost badge-sm">{{ getProcessLabel(notification.processStatus) }}</span>
            </div>
            <div class="text-xs text-base-content/40">{{ formatDate(notification.createdAt) }}</div>
          </div>
          <div class="mt-4 text-base-content/80 whitespace-pre-line leading-relaxed">
            {{ notification.content || '暂无内容' }}
          </div>
        </div>

        <div v-if="notification.cover" class="rounded-2xl border border-base-200 overflow-hidden">
          <img :src="notification.cover" class="w-full h-64 object-cover" />
        </div>

        <div class="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div class="rounded-2xl border border-base-200 bg-base-100 p-4">
            <div class="text-sm font-semibold mb-2">Payload</div>
            <pre class="text-xs bg-base-200/60 p-3 rounded-xl overflow-auto max-h-64">{{ formatJson(notification.payload) }}</pre>
          </div>
          <div class="rounded-2xl border border-base-200 bg-base-100 p-4">
            <div class="text-sm font-semibold mb-2">Action Payload</div>
            <pre class="text-xs bg-base-200/60 p-3 rounded-xl overflow-auto max-h-64">{{ formatJson(notification.actionPayload) }}</pre>
          </div>
        </div>
      </div>

      <div v-else class="text-center text-base-content/40">暂无数据</div>
    </div>
  </div>
</template>
