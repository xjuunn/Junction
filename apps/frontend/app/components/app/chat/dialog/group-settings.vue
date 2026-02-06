<script setup lang="ts">
import * as conversationApi from '~/api/conversation'
import type { ExtractDataType } from '~/utils/types'

type ConversationView = ExtractDataType<Awaited<ReturnType<typeof conversationApi.findOne>>> & {
  members?: Array<{ userId: string; role: string }>
  mySettings?: { muted?: boolean; pinned?: boolean }
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
const { copy, copied } = useClipboard()

const activeTab = ref<'members' | 'info' | 'settings'>('members')
const members = ref<any[]>([])
const loading = ref(false)
const currentUserId = ref<string>('')
const keyword = ref('')

const fetchCurrentUser = async () => {
  const { data } = await authClient.getSession()
  currentUserId.value = data?.user?.id || ''
}

const isOwner = computed(() => props.conversation?.ownerId === currentUserId.value)
const isAdmin = computed(() => props.conversation?.members?.some((m: any) => m.userId === currentUserId.value && m.role === 'ADMIN'))
const currentMember = computed(() => props.conversation?.mySettings)
const isMuted = computed(() => currentMember.value?.muted ?? false)
const isPinned = computed(() => currentMember.value?.pinned ?? false)

const memberCount = computed(() => members.value.length)
const adminCount = computed(() => members.value.filter(m => m.role === 'ADMIN').length)
const owner = computed(() => members.value.find(m => m.role === 'OWNER'))

const filteredMembers = computed(() => {
  const key = keyword.value.trim().toLowerCase()
  if (!key) return members.value
  return members.value.filter(m => {
    const name = (m.user?.name || '').toLowerCase()
    const id = (m.user?.id || '').toLowerCase()
    return name.includes(key) || id.includes(key)
  })
})

const fetchMembers = async () => {
  if (!props.conversation?.id) return
  loading.value = true
  try {
    const res = await conversationApi.getMembers(props.conversation.id)
    if (res.data) members.value = res.data
  } finally {
    loading.value = false
  }
}

const handleLeaveGroup = async () => {
  if (!currentUserId.value) {
    toast.error('用户未登录')
    return
  }
  if (isOwner.value) {
    toast.warning('群主不能直接退出，请先转让群主或解散群聊')
    return
  }
  const confirmed = await dialog.confirm({
    title: '退出群聊',
    content: '确定要退出该群聊吗？',
    type: 'warning',
    confirmText: '退出',
  })
  if (!confirmed) return
  if (!props.conversation?.id) return
  const res = await conversationApi.removeMember(props.conversation.id, currentUserId.value)
  if (res.success) {
    toast.success('已退出群聊')
    emit('conversation-deleted')
    router.push('/chat')
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

const handleDisbandGroup = async () => {
  const confirmed = await dialog.confirm({
    title: '解散群聊',
    content: '确定要解散该群聊吗？此操作不可恢复。',
    type: 'error',
    confirmText: '解散',
  })
  if (!confirmed) return
  if (!props.conversation?.id) return
  const res = await conversationApi.remove(props.conversation.id)
  if (res.success) {
    toast.success('群聊已解散')
    emit('conversation-deleted')
    router.push('/chat')
  }
}

const handleRemoveMember = async (member: any) => {
  const confirmed = await dialog.confirm({
    title: '移除成员',
    content: `确定要将 ${member.user?.name || '该成员'} 移出群聊吗？`,
    type: 'warning',
    confirmText: '移除',
  })
  if (!confirmed) return
  if (!props.conversation?.id) return
  const res = await conversationApi.removeMember(props.conversation.id, member.userId)
  if (res.success) {
    toast.success('已移除成员')
    fetchMembers()
  }
}

const handleUpdateMemberRole = async (member: any, role: 'ADMIN' | 'MEMBER') => {
  if (!props.conversation?.id) return
  const res = await conversationApi.updateMemberRole(props.conversation.id, member.userId, role)
  if (res.success) {
    toast.success(`已设置为${role === 'ADMIN' ? '管理员' : '普通成员'}`)
    fetchMembers()
  }
}

const showTransferDialog = ref(false)
const selectedTransferMember = ref<any>(null)

const handleTransferOwner = async () => {
  if (!selectedTransferMember.value || !props.conversation?.id) return
  const confirmed = await dialog.confirm({
    title: '转让群主',
    content: `确定要将群主转让给 ${selectedTransferMember.value.user?.name || '该成员'} 吗？转让后你将失去群主身份。`,
    type: 'warning',
    confirmText: '确定转让',
  })
  if (!confirmed) return
  const res = await conversationApi.transferOwner(props.conversation.id, selectedTransferMember.value.userId)
  if (res.success) {
    toast.success('群主已转让')
    showTransferDialog.value = false
    selectedTransferMember.value = null
    await fetchMembers()
    emit('conversation-deleted')
  }
}

const openTransferDialog = (member: any) => {
  selectedTransferMember.value = member
  showTransferDialog.value = true
}

const handleCopyGroupId = () => {
  if (!props.conversation?.id) return
  copy(props.conversation.id)
  toast.success('已复制群ID')
}

onMounted(async () => {
  await fetchCurrentUser()
  fetchMembers()
})
</script>

<template>
  <div class="flex flex-col h-full">
    <div class="tabs tabs-boxed bg-base-200/50 p-1 rounded-xl mb-6 animate-in fade-in duration-300">
      <button class="tab flex-1" :class="{ 'tab-active': activeTab === 'members' }" @click="activeTab = 'members'">
        <Icon name="mingcute:group-fill" class="mr-2" />
        成员 ({{ memberCount }})
      </button>
      <button class="tab flex-1" :class="{ 'tab-active': activeTab === 'info' }" @click="activeTab = 'info'">
        <Icon name="mingcute:information-line" class="mr-2" />
        群信息
      </button>
      <button class="tab flex-1" :class="{ 'tab-active': activeTab === 'settings' }" @click="activeTab = 'settings'">
        <Icon name="mingcute:settings-3-line" class="mr-2" />
        聊天设置
      </button>
    </div>

    <div v-if="activeTab === 'members'" class="space-y-4">
      <div class="rounded-2xl border border-base-200 bg-base-100/70 p-4">
        <div class="flex flex-col sm:flex-row sm:items-center gap-3">
          <div class="flex-1">
            <div class="text-sm font-bold">成员管理</div>
            <div class="text-xs opacity-60">管理员与群主可管理成员</div>
          </div>
          <div class="stats stats-horizontal shadow bg-base-200/60">
            <div class="stat py-2 px-3">
              <div class="stat-title text-xs">总成员</div>
              <div class="stat-value text-sm">{{ memberCount }}</div>
            </div>
            <div class="stat py-2 px-3">
              <div class="stat-title text-xs">管理员</div>
              <div class="stat-value text-sm">{{ adminCount }}</div>
            </div>
          </div>
        </div>
        <div class="mt-4">
          <input v-model="keyword" type="text" class="input input-bordered w-full bg-base-100"
            placeholder="搜索成员名称或ID" />
        </div>
      </div>

      <div v-if="loading" class="flex justify-center py-8">
        <span class="loading loading-spinner loading-md"></span>
      </div>

      <div v-else class="space-y-2">
        <div v-for="member in filteredMembers" :key="member.id"
          class="flex items-center justify-between p-3 rounded-xl border border-base-200 bg-base-100/60 hover:bg-base-200/50 transition">
          <div class="flex items-center gap-3">
            <BaseAvatar :text="member.user?.name" :src="member.user?.avatar" :size="44" :radius="12" />
            <div>
              <div class="font-medium flex items-center gap-2">
                {{ member.user?.name || '未知用户' }}
                <span v-if="member.userId === currentUserId" class="badge badge-sm badge-primary">我</span>
                <span v-if="member.role === 'OWNER'" class="badge badge-sm badge-warning">群主</span>
                <span v-if="member.role === 'ADMIN'" class="badge badge-sm badge-info">管理员</span>
              </div>
              <div class="text-xs opacity-50">{{ member.user?.id || '-' }}</div>
            </div>
          </div>
          <div class="flex items-center gap-2">
            <span v-if="member.role === 'OWNER' && member.userId === currentUserId" class="text-xs text-warning">
              你是群主
            </span>
            <div v-if="member.userId !== currentUserId && (isOwner || isAdmin)" class="dropdown dropdown-end">
              <button tabindex="0" class="btn btn-ghost btn-sm btn-circle">
                <Icon name="mingcute:more-1-line" size="18" />
              </button>
              <ul tabindex="0"
                class="dropdown-content z-50 menu p-2 shadow-lg bg-base-100 rounded-xl w-40 border border-base-200">
                <li v-if="member.role !== 'ADMIN' && isOwner">
                  <button @click="handleUpdateMemberRole(member, 'ADMIN')">设为管理员</button>
                </li>
                <li v-if="member.role === 'ADMIN' && isOwner">
                  <button @click="handleUpdateMemberRole(member, 'MEMBER')">取消管理员</button>
                </li>
                <li>
                  <button class="text-error" @click="handleRemoveMember(member)">移出群聊</button>
                </li>
                <li v-if="isOwner">
                  <button @click="openTransferDialog(member)">转让群主</button>
                </li>
              </ul>
            </div>
          </div>
        </div>
        <div v-if="!filteredMembers.length" class="text-center text-sm opacity-60 py-6">
          未找到匹配成员
        </div>
      </div>
    </div>

    <div v-if="activeTab === 'info'" class="space-y-6">
      <div class="rounded-2xl border border-base-200 bg-base-100/70 p-5 shadow-sm">
        <div class="flex flex-col items-center gap-4">
          <BaseAvatar :text="conversation?.title" :src="conversation?.avatar" :size="88" :radius="20" />
          <div class="text-center">
            <h3 class="text-xl font-bold">{{ conversation?.title }}</h3>
            <p class="text-sm opacity-50">群ID: {{ conversation?.id }}</p>
          </div>
          <div class="flex gap-3">
            <button class="btn btn-soft btn-sm" @click="handleCopyGroupId">
              <Icon :name="copied ? 'mingcute:check-line' : 'mingcute:copy-2-line'" />
              复制群ID
            </button>
          </div>
        </div>
      </div>

      <div class="rounded-2xl border border-base-200 bg-base-100/70 p-5 shadow-sm space-y-3">
        <div class="flex justify-between py-2 border-b border-base-200">
          <span class="opacity-60">群成员</span>
          <span class="font-medium">{{ memberCount }} 人</span>
        </div>
        <div class="flex justify-between py-2 border-b border-base-200">
          <span class="opacity-60">群主</span>
          <span class="font-medium">{{ owner?.user?.name || '-' }}</span>
        </div>
        <div class="flex justify-between py-2 border-b border-base-200">
          <span class="opacity-60">群聊类型</span>
          <span class="font-medium">{{ conversation?.type === 'GROUP' ? '群聊' : '私聊' }}</span>
        </div>
        <div class="flex justify-between py-2">
          <span class="opacity-60">创建时间</span>
          <span class="font-medium">{{ conversation?.createdAt ? new Date(conversation.createdAt).toLocaleDateString() : '-' }}</span>
        </div>
      </div>
    </div>

    <div v-if="activeTab === 'settings'" class="space-y-6">
      <div class="rounded-2xl border border-base-200 bg-base-100/70 p-5 shadow-sm space-y-3">
        <div class="font-bold">消息设置</div>
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

      <div class="rounded-2xl border border-error/30 bg-error/5 p-5 shadow-sm space-y-3">
        <div class="font-bold text-error">危险操作</div>
        <template v-if="isOwner">
          <button class="btn btn-soft btn-sm w-full justify-start" @click="activeTab = 'members'">
            <Icon name="mingcute:user-1-line" /> 转让群主
          </button>
          <button class="btn btn-soft btn-error btn-sm w-full justify-start" @click="handleDisbandGroup">
            <Icon name="mingcute:alert-fill" /> 解散群聊
          </button>
        </template>
        <template v-else>
          <button class="btn btn-soft btn-error btn-sm w-full justify-start" @click="handleLeaveGroup">
            <Icon name="mingcute:close-line" /> 退出群聊
          </button>
        </template>
      </div>
    </div>
  </div>

  <Teleport to="body">
    <BaseModal v-model="showTransferDialog" boxClass="max-w-sm">
      <template #header>
        <div class="flex items-center gap-3">
          <Icon name="mingcute:user-1-line" class="text-lg" />
          <span>转让群主</span>
        </div>
      </template>
      <div class="space-y-4">
        <p class="text-sm opacity-70">
          确定要将群主转让给 <span class="font-medium">{{ selectedTransferMember?.user?.name }}</span> 吗？
        </p>
        <p class="text-xs text-warning">转让后你将失去群主身份，但仍保留群聊成员权限。</p>
      </div>
      <template #actions="{ close }">
        <button class="btn btn-ghost btn-sm" @click="close">取消</button>
        <button class="btn btn-primary btn-sm" @click="handleTransferOwner">确定转让</button>
      </template>
    </BaseModal>
  </Teleport>
</template>
