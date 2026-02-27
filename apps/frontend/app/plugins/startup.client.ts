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
  const appTheme = AppTheme.getInstance()
  await appTheme.init()

  const settings = useSettingsStore()
  const prefersDark = usePreferredDark()

  const applyThemeMode = async (mode: string) => {
    appTheme.setFollowSystem(mode === 'system')
    if (mode === 'system') {
      await appTheme.setTheme(prefersDark.value, true)
      return
    }
    await appTheme.setTheme(mode === 'dark', true)
  }

  const resolvePalette = (dark: boolean) => ({
    primary: dark ? settings.darkPrimaryColor : settings.lightPrimaryColor,
    secondary: dark ? settings.darkSecondaryColor : settings.lightSecondaryColor,
    accent: dark ? settings.darkAccentColor : settings.lightAccentColor,
  })

  const applyThemeColors = () => {
    const palette = resolvePalette(appTheme.getIsDark().value)
    appTheme.setBrandColors({
      primary: palette.primary,
      secondary: palette.secondary,
      accent: palette.accent,
    })
    // 兼容历史字段，保证旧页面读取到当前生效主题色
    settings.primaryColor = palette.primary
    settings.secondaryColor = palette.secondary
    settings.accentColor = palette.accent
  }

  watch(
    () => settings.themeMode,
    (mode) => {
      applyThemeMode(mode)
    },
    { immediate: true }
  )

  watch(prefersDark, (val) => {
    if (settings.themeMode === 'system') {
      appTheme.setTheme(val, true)
    }
  })

  watch(
    () => [
      appTheme.getIsDark().value,
      settings.lightPrimaryColor,
      settings.lightSecondaryColor,
      settings.lightAccentColor,
      settings.darkPrimaryColor,
      settings.darkSecondaryColor,
      settings.darkAccentColor,
    ],
    () => {
      applyThemeColors()
    },
    { immediate: true }
  )

  // 兼容旧入口仅设置 primary/secondary/accent 的场景
  watch(
    () => [settings.primaryColor, settings.secondaryColor, settings.accentColor],
    ([primary, secondary, accent]) => {
      if (appTheme.getIsDark().value) {
        settings.darkPrimaryColor = primary
        settings.darkSecondaryColor = secondary
        settings.darkAccentColor = accent
      } else {
        settings.lightPrimaryColor = primary
        settings.lightSecondaryColor = secondary
        settings.lightAccentColor = accent
      }
    }
  )

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

  const isConversationActive = (conversationId: string | null | undefined) => {
    if (!conversationId) return false
    const activeId = activeConversationId.value || (route.params.id ? String(route.params.id) : null)
    if (!activeId) return false
    if (String(activeId) === String(conversationId)) return true
    const routePath = typeof route.path === 'string' ? route.path : ''
    return routePath.startsWith(`/chat/${conversationId}`)
  }

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

    if (isConversationActive(String(msg.conversationId)) && document.visibilityState === 'visible') return

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

  watch(() => route.params.id, (id) => {
    activeConversationId.value = id ? String(id) : null
  })
})
