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
  scrcpyConfig: ScrcpyConfig
}

export interface ScrcpyConfig {
  connection: {
    serial: string
    selectUsb: boolean
    selectTcpip: boolean
    tcpipAuto: boolean
    tcpipAddress: string
  }
  video: {
    enabled: boolean
    maxSize: string
    maxFps: string
    printFps: boolean
    videoCodec: string
    videoBitRate: string
    videoEncoder: string
    videoCodecOptions: string
    crop: string
    captureOrientation: string
    orientation: string
    displayOrientation: string
    recordOrientation: string
    angle: string
    displayId: string
    videoBuffer: string
    noDownsizeOnError: boolean
    noPlayback: boolean
    noVideoPlayback: boolean
  }
  audio: {
    enabled: boolean
    requireAudio: boolean
    audioDup: boolean
    audioSource: string
    audioCodec: string
    audioEncoder: string
    audioCodecOptions: string
    audioBitRate: string
    audioBuffer: string
    audioOutputBuffer: string
    noAudioPlayback: boolean
  }
  control: {
    controlEnabled: boolean
    showTouches: boolean
    stayAwake: boolean
    turnScreenOff: boolean
    powerOffOnClose: boolean
    noClipboardAutosync: boolean
    legacyPaste: boolean
    pushTarget: string
  }
  keyboard: {
    keyboardMode: string
    preferText: boolean
    rawKeyEvents: boolean
    noKeyRepeat: boolean
  }
  mouse: {
    mouseMode: string
    noMouseHover: boolean
    mouseBind: string
  }
  gamepad: {
    gamepadMode: string
  }
  device: {
    screenOffTimeout: string
    noPowerOn: boolean
    startApp: string
  }
  window: {
    noWindow: boolean
    windowTitle: string
    windowX: string
    windowY: string
    windowWidth: string
    windowHeight: string
    borderless: boolean
    alwaysOnTop: boolean
    fullscreen: boolean
    disableScreensaver: boolean
  }
  recording: {
    recordPath: string
    recordFormat: string
    timeLimit: string
    noPlayback: boolean
  }
  virtualDisplay: {
    enabled: boolean
    newDisplay: string
    noSystemDecorations: boolean
    noDestroyContent: boolean
    displayImePolicy: string
  }
  tunnels: {
    tunnelHost: string
    tunnelPort: string
    port: string
    forceAdbForward: boolean
  }
  otg: {
    enabled: boolean
    keyboardDisabled: boolean
    mouseDisabled: boolean
    gamepadEnabled: boolean
  }
  camera: {
    videoSource: 'display' | 'camera'
    cameraId: string
    cameraFacing: string
    cameraSize: string
    cameraAr: string
  }
  v4l2: {
    v4l2Sink: string
    v4l2Buffer: string
  }
  shortcuts: {
    shortcutMod: string
  }
  extraArgs: string
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
  const scrcpyConfig = reactive<ScrcpyConfig>({
    connection: {
      serial: '',
      selectUsb: false,
      selectTcpip: false,
      tcpipAuto: false,
      tcpipAddress: '',
    },
    video: {
      enabled: true,
      maxSize: '1920',
      maxFps: '60',
      printFps: false,
      videoCodec: 'h264',
      videoBitRate: '',
      videoEncoder: '',
      videoCodecOptions: '',
      crop: '',
      captureOrientation: '',
      orientation: '',
      displayOrientation: '',
      recordOrientation: '',
      angle: '',
      displayId: '',
      videoBuffer: '',
      noDownsizeOnError: false,
      noPlayback: false,
      noVideoPlayback: false,
    },
    audio: {
      enabled: true,
      requireAudio: false,
      audioDup: false,
      audioSource: '',
      audioCodec: '',
      audioEncoder: '',
      audioCodecOptions: '',
      audioBitRate: '',
      audioBuffer: '',
      audioOutputBuffer: '',
      noAudioPlayback: false,
    },
    control: {
      controlEnabled: true,
      showTouches: false,
      stayAwake: false,
      turnScreenOff: false,
      powerOffOnClose: false,
      noClipboardAutosync: false,
      legacyPaste: false,
      pushTarget: '',
    },
    keyboard: {
      keyboardMode: 'sdk',
      preferText: false,
      rawKeyEvents: false,
      noKeyRepeat: false,
    },
    mouse: {
      mouseMode: 'sdk',
      noMouseHover: false,
      mouseBind: '',
    },
    gamepad: {
      gamepadMode: 'disabled',
    },
    device: {
      screenOffTimeout: '',
      noPowerOn: false,
      startApp: '',
    },
    window: {
      noWindow: false,
      windowTitle: '',
      windowX: '',
      windowY: '',
      windowWidth: '',
      windowHeight: '',
      borderless: false,
      alwaysOnTop: false,
      fullscreen: false,
      disableScreensaver: false,
    },
    recording: {
      recordPath: '',
      recordFormat: '',
      timeLimit: '',
      noPlayback: false,
    },
    virtualDisplay: {
      enabled: false,
      newDisplay: '',
      noSystemDecorations: false,
      noDestroyContent: false,
      displayImePolicy: '',
    },
    tunnels: {
      tunnelHost: '',
      tunnelPort: '',
      port: '',
      forceAdbForward: false,
    },
    otg: {
      enabled: false,
      keyboardDisabled: false,
      mouseDisabled: false,
      gamepadEnabled: false,
    },
    camera: {
      videoSource: 'display',
      cameraId: '',
      cameraFacing: '',
      cameraSize: '',
      cameraAr: '',
    },
    v4l2: {
      v4l2Sink: '',
      v4l2Buffer: '',
    },
    shortcuts: {
      shortcutMod: '',
    },
    extraArgs: '',
  })

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
    scrcpyConfig,
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
    scrcpyConfig,
    settings,
  }
}, {
  persist: true
})
