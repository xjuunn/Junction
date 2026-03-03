import * as conversationApi from '~/api/conversation'
import { notify } from '~/utils/notification'
import { isAuthInvalidError } from '~/utils/auth'
import { getCurrentWindow } from '@tauri-apps/api/window';
import { normalizeEndpointUrl, probeBackendReachability, resolveApiBaseUrl } from '~/utils/backend-endpoint'

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
  const route = useRoute()
  const toast = useToast()
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
      const resolvedPrimary = primary ?? settings.primaryColor
      const resolvedSecondary = secondary ?? settings.secondaryColor
      const resolvedAccent = accent ?? settings.accentColor
      if (appTheme.getIsDark().value) {
        settings.darkPrimaryColor = resolvedPrimary
        settings.darkSecondaryColor = resolvedSecondary
        settings.darkAccentColor = resolvedAccent
      } else {
        settings.lightPrimaryColor = resolvedPrimary
        settings.lightSecondaryColor = resolvedSecondary
        settings.lightAccentColor = resolvedAccent
      }
    }
  )

  const preferredBaseUrl = normalizeEndpointUrl(settings.backendServerUrl || '', { defaultProtocol: 'http' })
    || resolveApiBaseUrl()
  const healthCheck = await probeBackendReachability({
    baseUrl: preferredBaseUrl,
    timeoutMs: 3500,
  })
  if (!healthCheck.reachable) {
    const isNoSignal = healthCheck.reason === 'timeout' || healthCheck.reason === 'network-error'
    const targetPath = isNoSignal ? '/no-signal' : '/settings/connection'
    if (!route.path.startsWith(targetPath)) {
      await navigateTo({
        path: targetPath,
        query: {
          reason: 'unreachable',
          probe: healthCheck.reason || 'unknown',
          from: route.fullPath || '/',
        },
      }, { replace: true })
    }
    return
  }

  const userStore = useUserStore()
  if (userStore.authToken.value) {
    try {
      await userStore.refresh()
    } catch (error) {
      if (isAuthInvalidError(error)) {
        userStore.clearAuth()
      } else {
        userStore.markAuthChecked()
      }
    }
  } else {
    userStore.markAuthChecked()
  }

  const { on: busOn } = useEmitt()
  const focusAppWindowForNotification = async () => {
    if (!isTauri()) return
    try {
      const currentWindow = getCurrentWindow()
      const isMinimized = await currentWindow.isMinimized()
      const isFocused = await currentWindow.isFocused()

      // 先确保窗口可见，再恢复最小化，最后抢焦点
      await currentWindow.show()
      if (isMinimized) {
        await currentWindow.unminimize()
      }
      if (!isFocused && settings.notificationWakeAppForceFocus) {
        await currentWindow.setFocus()
      }
    } catch {
      // 通知链路不应因窗口唤起失败中断
    }
  }
  const currentUserId = computed(() => userStore.user.value?.id)
  const activeConversationId = ref<string | null>(null)
  const conversationCache = new Map<string, ConversationMeta>()
  const cacheTTL = 60 * 1000

  const isMessageFromCurrentUser = (msg: any) => {
    const uid = String(currentUserId.value || '').trim()
    if (!uid) return false
    const senderId = String(msg?.senderId || '').trim()
    const senderUserId = String(msg?.sender?.id || '').trim()
    return senderId === uid || senderUserId === uid
  }

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

  socket.on('new-notification', async (notification) => {
    console.log('收到通知:', notification)
    const title = notification?.title || '新通知'
    const body = notification?.content || ''
    const result = await notify({
      title,
      body,
      category: 'system',
      tag: notification?.id,
      data: { id: notification?.id },
    })
    if (body && result.success) toast.info(body)
  })

  socket.on('new-message', async (msg) => {
    if (!msg?.conversationId) return
    // 用户信息未就绪时不触发系统通知，避免把自己消息误判为他人消息
    if (!currentUserId.value) return
    if (isMessageFromCurrentUser(msg)) return

    const isWindowFocused = typeof document !== 'undefined' ? document.hasFocus() : true
    if (
      isConversationActive(String(msg.conversationId))
      && document.visibilityState === 'visible'
      && isWindowFocused
    ) return

    const meta = await getConversationMeta(String(msg.conversationId))
    if (meta?.muted) return

    const title = meta?.title || msg?.sender?.name || '新消息'
    const body = msg?.content || ''
    const category = meta?.type === 'GROUP' ? 'group' : 'message'

    const result = await notify({
      title,
      body,
      category,
      tag: msg?.id || msg?.conversationId,
      data: { conversationId: msg?.conversationId, messageId: msg?.id },
    }, {
      requestPermission: true,
    })

    if (!result.success) return
    if (!settings.notificationWakeAppOnMessage) return
    await focusAppWindowForNotification()
  })

  busOn('chat:active-conversation', (id) => {
    activeConversationId.value = id
  })

  watch(() => route.params.id, (id) => {
    activeConversationId.value = id ? String(id) : null
  })
})
