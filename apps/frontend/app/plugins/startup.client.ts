import * as conversationApi from '~/api/conversation'
import { notify } from '~/utils/notification'

type ConversationMeta = {
  id: string
  title?: string | null
  type?: 'PRIVATE' | 'GROUP' | 'SYSTEM' | string
  muted?: boolean
  updatedAt: number
}

export default defineNuxtPlugin(async () => {
  await AppTheme.getInstance().init()

  const userStore = useUserStore()
  if (userStore.authToken.value) {
    try {
      await userStore.refresh()
    } catch {
      userStore.clearAuth()
    }
  } else {
    userStore.markAuthChecked()
  }

  const route = useRoute()
  const toast = useToast()
  const { on: busOn } = useEmitt()
  const currentUserId = computed(() => userStore.user.value?.id)
  const activeConversationId = ref<string | null>(null)
  const conversationCache = new Map<string, ConversationMeta>()
  const cacheTTL = 60 * 1000

  const resolveActiveConversationId = () => {
    if (activeConversationId.value) return activeConversationId.value
    const id = route.params.id
    return id ? String(id) : null
  }

  const getConversationMeta = async (conversationId: string) => {
    const cached = conversationCache.get(conversationId)
    const now = Date.now()
    if (cached && now - cached.updatedAt < cacheTTL) return cached

    try {
      const res = await conversationApi.findOne(conversationId)
      if (!res.success || !res.data) return cached || null
      const meta: ConversationMeta = {
        id: conversationId,
        title: res.data.title,
        type: res.data.type,
        muted: !!res.data.mySettings?.muted,
        updatedAt: now,
      }
      conversationCache.set(conversationId, meta)
      return meta
    } catch {
      return cached || null
    }
  }

  const socket = useSocket('app')
  socket.emit('init', (user) => {
    userStore.setUser(user)
  })

  socket.on('new-notification', (notification) => {
    console.log('收到通知:', notification)
    const title = notification?.title || '新通知'
    const body = notification?.content || ''
    notify({
      title,
      body,
      category: 'system',
      tag: notification?.id,
      data: { id: notification?.id },
    })
    if (body) toast.info(body)
  })

  socket.on('new-message', async (msg) => {
    if (!msg?.conversationId) return
    if (msg?.senderId && msg.senderId === currentUserId.value) return

    const activeId = resolveActiveConversationId()
    if (activeId && String(activeId) === String(msg.conversationId)) return

    const meta = await getConversationMeta(String(msg.conversationId))
    if (meta?.muted) return

    const title = meta?.title || msg?.sender?.name || '新消息'
    const body = msg?.content || ''
    const category = meta?.type === 'GROUP' ? 'group' : 'message'

    notify({
      title,
      body,
      category,
      tag: msg?.id || msg?.conversationId,
      data: { conversationId: msg?.conversationId, messageId: msg?.id },
    }, {
      requestPermission: true,
    })
  })

  busOn('chat:active-conversation', (id) => {
    activeConversationId.value = id
  })
})
