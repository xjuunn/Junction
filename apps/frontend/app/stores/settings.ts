import { getSavedDownloadDir, setSavedDownloadDir } from '~/utils/download'

export interface AppSettings {
  language: string
  timezone: string
  dateFormat: string
  timeFormat: string
  autoCheckUpdate: boolean
  startMinimizedToTray: boolean
  downloadPath: string
  themeMode: string
  primaryColor: string
  compactMode: boolean
  sidebarCollapsed: boolean
  animationsEnabled: boolean
  animationSpeed: string
  notificationEnableDesktop: boolean
  notificationShowPreview: 'always' | 'when-unlocked' | 'never'
  notificationSoundEnabled: boolean
  notificationSoundVolume: number
  notificationQuietHoursEnabled: boolean
  notificationQuietHoursStart: string
  notificationQuietHoursEnd: string
  notificationMessageEnabled: boolean
  notificationGroupEnabled: boolean
  notificationMentionEnabled: boolean
  notificationFriendRequestEnabled: boolean
  notificationSystemEnabled: boolean
  aiProviderId: string
  aiApiKey: string
  aiBaseUrl: string
  aiDefaultModel: string
  scrcpyPath: string
}

export const useSettingsStore = defineStore('settings', () => {
  const language = ref('zh-CN')
  const timezone = ref('Asia/Shanghai')
  const dateFormat = ref('YYYY-MM-DD')
  const timeFormat = ref('24h')
  const autoCheckUpdate = ref(true)
  const startMinimizedToTray = ref(false)
  const downloadPath = ref(getSavedDownloadDir() || '')
  const themeMode = ref('system')
  const primaryColor = ref('primary')
  const compactMode = ref(false)
  const sidebarCollapsed = ref(false)
  const animationsEnabled = ref(true)
  const animationSpeed = ref('normal')
  const notificationEnableDesktop = ref(true)
  const notificationShowPreview = ref<'always' | 'when-unlocked' | 'never'>('always')
  const notificationSoundEnabled = ref(true)
  const notificationSoundVolume = ref(80)
  const notificationQuietHoursEnabled = ref(false)
  const notificationQuietHoursStart = ref('22:00')
  const notificationQuietHoursEnd = ref('08:00')
  const notificationMessageEnabled = ref(true)
  const notificationGroupEnabled = ref(true)
  const notificationMentionEnabled = ref(true)
  const notificationFriendRequestEnabled = ref(true)
  const notificationSystemEnabled = ref(true)
  const aiProviderId = ref('deepseek')
  const aiApiKey = ref('')
  const aiBaseUrl = ref('')
  const aiDefaultModel = ref('')
  const scrcpyPath = ref('')

  watch(downloadPath, (val) => {
    setSavedDownloadDir(val || '')
  })

  const settings = computed<AppSettings>(() => ({
    language: language.value,
    timezone: timezone.value,
    dateFormat: dateFormat.value,
    timeFormat: timeFormat.value,
    autoCheckUpdate: autoCheckUpdate.value,
    startMinimizedToTray: startMinimizedToTray.value,
    downloadPath: downloadPath.value,
    themeMode: themeMode.value,
    primaryColor: primaryColor.value,
    compactMode: compactMode.value,
    sidebarCollapsed: sidebarCollapsed.value,
    animationsEnabled: animationsEnabled.value,
    animationSpeed: animationSpeed.value,
    notificationEnableDesktop: notificationEnableDesktop.value,
    notificationShowPreview: notificationShowPreview.value,
    notificationSoundEnabled: notificationSoundEnabled.value,
    notificationSoundVolume: notificationSoundVolume.value,
    notificationQuietHoursEnabled: notificationQuietHoursEnabled.value,
    notificationQuietHoursStart: notificationQuietHoursStart.value,
    notificationQuietHoursEnd: notificationQuietHoursEnd.value,
    notificationMessageEnabled: notificationMessageEnabled.value,
    notificationGroupEnabled: notificationGroupEnabled.value,
    notificationMentionEnabled: notificationMentionEnabled.value,
    notificationFriendRequestEnabled: notificationFriendRequestEnabled.value,
    notificationSystemEnabled: notificationSystemEnabled.value,
    aiProviderId: aiProviderId.value,
    aiApiKey: aiApiKey.value,
    aiBaseUrl: aiBaseUrl.value,
    aiDefaultModel: aiDefaultModel.value,
    scrcpyPath: scrcpyPath.value,
  }))

  return {
    language,
    timezone,
    dateFormat,
    timeFormat,
    autoCheckUpdate,
    startMinimizedToTray,
    downloadPath,
    themeMode,
    primaryColor,
    compactMode,
    sidebarCollapsed,
    animationsEnabled,
    animationSpeed,
    notificationEnableDesktop,
    notificationShowPreview,
    notificationSoundEnabled,
    notificationSoundVolume,
    notificationQuietHoursEnabled,
    notificationQuietHoursStart,
    notificationQuietHoursEnd,
    notificationMessageEnabled,
    notificationGroupEnabled,
    notificationMentionEnabled,
    notificationFriendRequestEnabled,
    notificationSystemEnabled,
    aiProviderId,
    aiApiKey,
    aiBaseUrl,
    aiDefaultModel,
    scrcpyPath,
    settings,
  }
}, {
  persist: true
})
