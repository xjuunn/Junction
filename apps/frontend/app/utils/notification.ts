import { isTauri } from '~/utils/check'
import { useSettingsStore, type AppSettings } from '~/stores/settings'

export type NotificationCategory =
  | 'message'
  | 'group'
  | 'mention'
  | 'friend-request'
  | 'system'
  | 'custom'

export type NotificationPreviewMode = 'always' | 'when-unlocked' | 'never'

export interface NotifyPayload {
  title: string
  body?: string
  icon?: string
  image?: string
  badge?: string
  tag?: string
  data?: any
  requireInteraction?: boolean
  silent?: boolean
  renotify?: boolean
  vibrate?: number[]
  category?: NotificationCategory
  /**
   * Android 通知渠道（Tauri）
   */
  channelId?: string
  channel?: NotificationChannel
  /**
   * 是否强制发送（忽略免打扰与分类开关）
   */
  force?: boolean
  /**
   * Web 端的点击回调
   */
  onClick?: () => void
  /**
   * 覆盖 Web 端 NotificationOptions
   */
  web?: NotificationOptions
  /**
   * 覆盖 Tauri 端通知参数（按插件 Options）
   */
  tauri?: Record<string, any>
}

export interface NotificationChannel {
  id: string
  name: string
  description?: string
  importance?: number | string
  visibility?: number | string
  lights?: boolean
  lightColor?: string
  vibration?: boolean
  sound?: string
}

export interface NotifyOptions {
  /**
   * 是否自动触发权限申请
   */
  requestPermission?: boolean
  /**
   * 指定设置（不传则读取 settings store）
   */
  settings?: AppSettings
}

export interface NotifyResult {
  success: boolean
  reason?: 'not-supported' | 'permission-denied' | 'disabled' | 'quiet-hours' | 'invalid'
}

const getSettings = (settings?: AppSettings) => {
  if (settings) return settings
  try {
    const store = useSettingsStore()
    return store.settings.value
  } catch {
    return null
  }
}

const isInQuietHours = (start: string, end: string, now = new Date()) => {
  const parse = (value: string) => {
    const [h, m] = value.split(':').map(Number)
    if (Number.isNaN(h) || Number.isNaN(m)) return null
    return h * 60 + m
  }
  const startMin = parse(start)
  const endMin = parse(end)
  if (startMin === null || endMin === null) return false
  const nowMin = now.getHours() * 60 + now.getMinutes()
  if (startMin === endMin) return false
  if (startMin < endMin) return nowMin >= startMin && nowMin < endMin
  return nowMin >= startMin || nowMin < endMin
}

const shouldSendByCategory = (settings: AppSettings | null, category?: NotificationCategory) => {
  if (!settings) return true
  switch (category) {
    case 'message':
      return settings.notificationMessageEnabled
    case 'group':
      return settings.notificationGroupEnabled
    case 'mention':
      return settings.notificationMentionEnabled
    case 'friend-request':
      return settings.notificationFriendRequestEnabled
    case 'system':
      return settings.notificationSystemEnabled
    default:
      return true
  }
}

const resolvePreviewBody = (body: string | undefined, mode: NotificationPreviewMode) => {
  if (!body) return ''
  if (mode === 'never') return ''
  if (mode === 'when-unlocked') {
    if (typeof document !== 'undefined' && (document.hidden || !document.hasFocus())) {
      return ''
    }
  }
  return body
}

const playBeep = async (volume = 80) => {
  try {
    if (typeof window === 'undefined') return
    const AudioContext = window.AudioContext || (window as any).webkitAudioContext
    if (!AudioContext) return
    const ctx = new AudioContext()
    const oscillator = ctx.createOscillator()
    const gain = ctx.createGain()
    oscillator.type = 'sine'
    oscillator.frequency.value = 880
    gain.gain.value = Math.min(Math.max(volume, 0), 100) / 100 / 3
    oscillator.connect(gain)
    gain.connect(ctx.destination)
    oscillator.start()
    oscillator.stop(ctx.currentTime + 0.12)
    oscillator.onended = () => {
      ctx.close()
    }
  } catch {
    // 静默失败，避免影响主流程
  }
}

const channelCache = new Set<string>()

const ensureTauriChannel = async (channel?: NotificationChannel) => {
  if (!channel?.id) return
  if (channelCache.has(channel.id)) return
  try {
    const mod = await import('@tauri-apps/plugin-notification')
    if (typeof mod.createChannel === 'function') {
      await mod.createChannel(channel as any)
      channelCache.add(channel.id)
    }
  } catch {
    // 忽略渠道创建失败
  }
}

export const getNotificationPermission = async (): Promise<NotificationPermission> => {
  if (typeof window === 'undefined') return 'default'
  if (isTauri()) {
    const mod = await import('@tauri-apps/plugin-notification')
    const granted = await mod.isPermissionGranted()
    return granted ? 'granted' : 'denied'
  }
  if (!('Notification' in window)) return 'denied'
  return Notification.permission
}

export const requestNotificationPermission = async (): Promise<NotificationPermission> => {
  if (typeof window === 'undefined') return 'default'
  if (isTauri()) {
    const mod = await import('@tauri-apps/plugin-notification')
    return mod.requestPermission()
  }
  if (!('Notification' in window)) return 'denied'
  return Notification.requestPermission()
}

export const notify = async (payload: NotifyPayload, options: NotifyOptions = {}): Promise<NotifyResult> => {
  if (!payload?.title) return { success: false, reason: 'invalid' }
  if (typeof window === 'undefined') return { success: false, reason: 'not-supported' }

  const settings = getSettings(options.settings)
  if (settings && !settings.notificationEnableDesktop && !payload.force) {
    return { success: false, reason: 'disabled' }
  }
  if (!payload.force && settings?.notificationQuietHoursEnabled) {
    if (isInQuietHours(settings.notificationQuietHoursStart, settings.notificationQuietHoursEnd)) {
      return { success: false, reason: 'quiet-hours' }
    }
  }
  if (!payload.force && !shouldSendByCategory(settings, payload.category)) {
    return { success: false, reason: 'disabled' }
  }

  const previewMode = settings?.notificationShowPreview || 'always'
  const body = resolvePreviewBody(payload.body, previewMode)
  const silent = payload.silent ?? !(settings?.notificationSoundEnabled ?? true)

  const needPermission = options.requestPermission === true
  if (isTauri()) {
    const mod = await import('@tauri-apps/plugin-notification')
    let permissionGranted = await mod.isPermissionGranted()
    if (!permissionGranted && needPermission) {
      const permission = await mod.requestPermission()
      permissionGranted = permission === 'granted'
    }
    if (!permissionGranted) return { success: false, reason: 'permission-denied' }
    try {
      const channelId = payload.channelId || payload.channel?.id
      if (payload.channel) await ensureTauriChannel(payload.channel)
      const base = payload.tauri || {
        title: payload.title,
        body,
        ...(channelId ? { channelId } : {}),
      }
      mod.sendNotification(base)
      return { success: true }
    } catch {
      try {
        mod.sendNotification(payload.title)
        return { success: true }
      } catch {
        return { success: false, reason: 'not-supported' }
      }
    }
  }

  if (!('Notification' in window)) return { success: false, reason: 'not-supported' }
  if (Notification.permission !== 'granted') {
    if (needPermission) {
      const permission = await Notification.requestPermission()
      if (permission !== 'granted') return { success: false, reason: 'permission-denied' }
    } else {
      return { success: false, reason: 'permission-denied' }
    }
  }

  const notification = new Notification(payload.title, {
    body,
    icon: payload.icon,
    image: payload.image,
    badge: payload.badge,
    tag: payload.tag,
    data: payload.data,
    requireInteraction: payload.requireInteraction,
    silent,
    renotify: payload.renotify,
    vibrate: payload.vibrate,
    ...(payload.web || {}),
  })

  if (payload.onClick) {
    notification.onclick = () => payload.onClick?.()
  }

  if (!silent && (settings?.notificationSoundEnabled ?? true)) {
    await playBeep(settings?.notificationSoundVolume ?? 80)
  }
  return { success: true }
}

/**
 * 创建带默认参数的通知器
 */
export const createNotifier = (defaults: NotifyPayload, options?: NotifyOptions) => {
  return (payload: NotifyPayload) => notify({ ...defaults, ...payload }, options)
}
