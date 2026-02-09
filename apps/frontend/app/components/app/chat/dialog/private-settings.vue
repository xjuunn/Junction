<script setup lang="ts">
import * as conversationApi from '~/api/conversation'
import * as friendshipApi from '~/api/friendship'
import type { PrismaTypes } from '@junction/types'

type ConversationView = PrismaTypes.Conversation & {
  online?: boolean
  otherUserId?: string | null
  mySettings?: {
    muted?: boolean
    pinned?: boolean
  } | null
}

interface Props {
  conversation: ConversationView | null
}

const props = defineProps<Props>()
const emit = defineEmits<{
  (e: 'close'): void
  (e: 'conversation-deleted'): void
}>()

const toast = useToast()
const dialog = useDialog()
const router = useRouter()
const authClient = useAuthClient()
const { emit: busEmit } = useEmitt()
const { copy, copied } = useClipboard()

const friendInfo = ref<any>(null)
const remark = ref('')
const loading = ref(false)
const savingRemark = ref(false)
const currentUserId = ref<string>('')

const fetchCurrentUser = async () => {
  const { data } = await authClient.getSession()
  currentUserId.value = data?.user?.id || ''
}

const otherUserId = computed(() => props.conversation?.otherUserId || null)
const currentMember = computed(() => props.conversation?.mySettings)
const isMuted = computed(() => currentMember.value?.muted ?? false)
const isPinned = computed(() => currentMember.value?.pinned ?? false)
const isBlocked = computed(() => friendInfo.value?.isBlocked === true)
const displayName = computed(() => remark.value.trim() || props.conversation?.title || '')
const isOnline = computed(() => Boolean(props.conversation?.online))
const originalRemark = computed(() => friendInfo.value?.note || '')
const remarkChanged = computed(() => remark.value.trim() !== (originalRemark.value || '').trim())

const fetchFriendInfo = async () => {
  if (!otherUserId.value) return
  loading.value = true
  try {
    const res = await friendshipApi.findOne(otherUserId.value)
    if (res.data) {
      friendInfo.value = res.data
      remark.value = res.data.note || ''
    }
  } finally {
    loading.value = false
  }
}

const handleSaveRemark = async () => {
  if (!otherUserId.value) {
    toast.error('无法获取好友ID')
    return
  }
  if (!remarkChanged.value) {
    toast.info('备注未变化')
    return
  }
  savingRemark.value = true
  try {
    const res = await friendshipApi.update(otherUserId.value, { note: remark.value })
    if (res.success) {
      toast.success('备注已保存')
      friendInfo.value = { ...(friendInfo.value || {}), note: remark.value }
      if (props.conversation?.id) {
        busEmit('chat:conversation-updated', { id: props.conversation.id, title: displayName.value })
      }
    } else {
      toast.error(res.error || '更新失败')
    }
  } catch (e: any) {
    toast.error(e.message || '更新备注失败')
  } finally {
    savingRemark.value = false
  }
}

const handleToggleMute = async () => {
  if (!props.conversation?.id) return
  const newValue = !isMuted.value
  const res = await conversationApi.updateSettings(props.conversation.id, { muted: newValue } as any)
  if (res.success) {
    toast.success(newValue ? '已开启免打扰' : '已取消免打扰')
    emit('conversation-deleted')
  }
}

const handleTogglePin = async () => {
  if (!props.conversation?.id) return
  const newValue = !isPinned.value
  const res = await conversationApi.updateSettings(props.conversation.id, { pinned: newValue } as any)
  if (res.success) {
    toast.success(newValue ? '已开启置顶' : '已取消置顶')
    emit('conversation-deleted')
  }
}

const handleBlock = async () => {
  if (!otherUserId.value) {
    toast.error('无法获取用户ID')
    return
  }

  const confirmed = await dialog.confirm({
    title: isBlocked.value ? '解除拉黑' : '拉黑用户',
    content: isBlocked.value ? '确定要解除拉黑吗？' : '确定要拉黑该用户吗？拉黑后将不再接收对方的消息。',
    type: 'warning',
    confirmText: isBlocked.value ? '解除拉黑' : '拉黑',
  })
  if (!confirmed) return

  try {
    const res = isBlocked.value
      ? await friendshipApi.unblock(otherUserId.value)
      : await friendshipApi.block(otherUserId.value)
    if (res.success) {
      toast.success(isBlocked.value ? '已解除拉黑' : '已拉黑用户')
      fetchFriendInfo()
    } else {
      toast.error(res.error || '操作失败')
    }
  } catch (e: any) {
    toast.error(e.message || '操作失败')
  }
}

const handleDeleteChat = async () => {
  const confirmed = await dialog.confirm({
    title: '删除聊天',
    content: '确定要删除该聊天记录吗？此操作不可恢复。',
    type: 'error',
    confirmText: '删除',
  })
  if (!confirmed) return
  if (!props.conversation?.id) return
  const res = await conversationApi.remove(props.conversation.id)
  if (res.success) {
    toast.success('聊天已删除')
    emit('conversation-deleted')
    router.push('/chat')
  }
}

const handleBlockAndDelete = async () => {
  const confirmed = await dialog.confirm({
    title: '加入黑名单并删除聊天',
    content: '确定要将该用户加入黑名单并删除聊天记录吗？',
    type: 'error',
    confirmText: '确定',
  })
  if (!confirmed) return
  if (!otherUserId.value || !props.conversation?.id) return
  await friendshipApi.block(otherUserId.value)
  await conversationApi.remove(props.conversation.id)
  toast.success('已加入黑名单并删除聊天记录')
  emit('conversation-deleted')
  router.push('/chat')
}

const handleCopyUserId = () => {
  if (!otherUserId.value) return
  copy(otherUserId.value)
  toast.success('已复制用户ID')
}

onMounted(async () => {
  await fetchCurrentUser()
  fetchFriendInfo()
})

watch(() => props.conversation, () => {
  fetchFriendInfo()
}, { immediate: true })
</script>

<template>
  <div class="space-y-6">
    <div class="rounded-2xl border border-base-200 bg-base-100/80 backdrop-blur-md p-5 shadow-sm animate-in fade-in slide-in-from-bottom-2 duration-300">
      <div class="flex flex-col items-center gap-4">
        <BaseAvatar :text="conversation?.title" :src="conversation?.avatar" :size="88" :radius="20" />
        <div class="text-center space-y-2">
          <div class="flex items-center justify-center gap-2">
            <h3 class="text-xl font-bold">{{ displayName }}</h3>
            <span class="badge" :class="isOnline ? 'badge-success' : 'badge-ghost'">
              {{ isOnline ? '在线' : '离线' }}
            </span>
          </div>
          <div class="text-sm opacity-60">ID: {{ otherUserId || '-' }}</div>
          <div class="flex items-center justify-center gap-2">
            <button class="btn btn-xs btn-ghost" @click="handleCopyUserId">
              <Icon :name="copied ? 'mingcute:check-line' : 'mingcute:copy-2-line'" />
              复制ID
            </button>
          </div>
        </div>
      </div>
    </div>

    <div class="rounded-2xl border border-base-200 bg-base-100/80 backdrop-blur-md p-5 shadow-sm space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300"
      style="animation-delay: 60ms;">
      <div class="flex items-center justify-between">
        <div>
          <div class="font-bold">备注与别名</div>
          <div class="text-xs opacity-60">用于聊天列表与消息展示</div>
        </div>
        <span v-if="loading" class="loading loading-spinner loading-sm"></span>
      </div>
      <div class="flex flex-col sm:flex-row gap-3">
        <input v-model="remark" type="text" placeholder="输入备注"
          class="input input-bordered flex-1 bg-base-100/80" />
        <button class="btn btn-primary btn-sm" @click="handleSaveRemark" :disabled="savingRemark || !remarkChanged">
          <span v-if="savingRemark" class="loading loading-spinner loading-xs"></span>
          保存
        </button>
      </div>
    </div>

    <div class="rounded-2xl border border-base-200 bg-base-100/80 backdrop-blur-md p-5 shadow-sm space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300"
      style="animation-delay: 120ms;">
      <div class="font-bold">消息设置</div>
      <div class="space-y-3">
        <label class="flex items-center justify-between gap-4 rounded-xl border border-base-200 p-3 hover:bg-base-200/40 transition">
          <div>
            <div class="font-medium">消息免打扰</div>
            <div class="text-xs opacity-60">不显示提醒，但仍可查看消息</div>
          </div>
          <input type="checkbox" class="toggle toggle-primary" :checked="isMuted" @change="handleToggleMute" />
        </label>
        <label class="flex items-center justify-between gap-4 rounded-xl border border-base-200 p-3 hover:bg-base-200/40 transition">
          <div>
            <div class="font-medium">置顶聊天</div>
            <div class="text-xs opacity-60">在聊天列表顶部显示</div>
          </div>
          <input type="checkbox" class="toggle toggle-primary" :checked="isPinned" @change="handleTogglePin" />
        </label>
      </div>
    </div>

    <div class="rounded-2xl border border-base-200 bg-base-100/80 backdrop-blur-md p-5 shadow-sm space-y-3 animate-in fade-in slide-in-from-bottom-2 duration-300"
      style="animation-delay: 180ms;">
      <div class="font-bold">隐私与安全</div>
      <button class="btn btn-soft btn-sm w-full justify-start" @click="handleBlock">
        <Icon :name="isBlocked ? 'mingcute:check-circle-fill' : 'mingcute:close-line'" />
        {{ isBlocked ? '解除拉黑' : '加入黑名单' }}
      </button>
    </div>

    <div class="rounded-2xl border border-error/30 bg-error/5 p-5 shadow-sm space-y-3 animate-in fade-in slide-in-from-bottom-2 duration-300"
      style="animation-delay: 240ms;">
      <div class="font-bold text-error">危险操作</div>
      <button class="btn btn-soft btn-error btn-sm w-full justify-start" @click="handleDeleteChat">
        <Icon name="mingcute:alert-fill" /> 删除聊天记录
      </button>
      <button class="btn btn-soft btn-error btn-sm w-full justify-start" @click="handleBlockAndDelete">
        <Icon name="mingcute:close-line" /> 拉黑并删除聊天
      </button>
    </div>
  </div>
</template>
