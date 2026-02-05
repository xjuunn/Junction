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
    settings,
  }
}, {
  persist: true
})
