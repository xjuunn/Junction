<script setup lang="ts">
import { isTauri } from '~/utils/check'

const settings = useSettingsStore()
const toast = useToast()
const appTheme = AppTheme.getInstance()
const prefersDark = usePreferredDark()

type ThemeMode = 'light' | 'dark' | 'system'
type PaletteMode = 'light' | 'dark'
type PaletteKey = 'primary' | 'secondary' | 'accent'

type Palette = {
  primary: string
  secondary: string
  accent: string
}

type ThemePreset = {
  id: string
  name: string
  desc: string
  light: Palette
  dark: Palette
}

const isSaving = ref(false)
const paletteMode = ref<PaletteMode>('light')
const isMicaSupported = computed(() => isTauri())
const isBgTransparent = appTheme.getIsBgTransparent()

const themeModes: Array<{ value: ThemeMode; label: string; desc: string; icon: string }> = [
  { value: 'light', label: '浅色模式', desc: '明亮界面，适合白天使用', icon: 'mingcute:sun-line' },
  { value: 'dark', label: '深色模式', desc: '低亮界面，适合夜间使用', icon: 'mingcute:moon-line' },
  { value: 'system', label: '跟随系统', desc: '自动切换浅色与深色', icon: 'mingcute:computer-line' },
]

const themePresets: ThemePreset[] = [
  {
    id: 'aurora',
    name: '极光蓝紫',
    desc: '科技感主色，清晰且稳定',
    light: { primary: '#4f46e5', secondary: '#7c3aed', accent: '#0ea5e9' },
    dark: { primary: '#818cf8', secondary: '#c084fc', accent: '#22d3ee' },
  },
  {
    id: 'sapphire',
    name: '商务蓝绿',
    desc: '企业后台风格，沉稳专业',
    light: { primary: '#1d4ed8', secondary: '#0f766e', accent: '#0891b2' },
    dark: { primary: '#60a5fa', secondary: '#34d399', accent: '#22d3ee' },
  },
  {
    id: 'ember',
    name: '曜石橙红',
    desc: '高对比强调，适合运营场景',
    light: { primary: '#ea580c', secondary: '#dc2626', accent: '#f59e0b' },
    dark: { primary: '#fb923c', secondary: '#f87171', accent: '#fbbf24' },
  },
  {
    id: 'mint',
    name: '薄荷青绿',
    desc: '轻盈通透，适合长时间阅读',
    light: { primary: '#0f766e', secondary: '#16a34a', accent: '#06b6d4' },
    dark: { primary: '#2dd4bf', secondary: '#4ade80', accent: '#67e8f9' },
  },
]

const normalizeHex = (value: string) => {
  const val = value.trim().toLowerCase()
  if (/^#[0-9a-f]{6}$/.test(val)) return val
  if (/^#[0-9a-f]{3}$/.test(val)) return `#${val[1]}${val[1]}${val[2]}${val[2]}${val[3]}${val[3]}`
  return ''
}

const getPalette = (mode: PaletteMode): Palette => {
  if (mode === 'light') {
    return {
      primary: settings.lightPrimaryColor,
      secondary: settings.lightSecondaryColor,
      accent: settings.lightAccentColor,
    }
  }
  return {
    primary: settings.darkPrimaryColor,
    secondary: settings.darkSecondaryColor,
    accent: settings.darkAccentColor,
  }
}

const setPalette = (mode: PaletteMode, palette: Palette) => {
  if (mode === 'light') {
    settings.lightPrimaryColor = palette.primary
    settings.lightSecondaryColor = palette.secondary
    settings.lightAccentColor = palette.accent
    return
  }
  settings.darkPrimaryColor = palette.primary
  settings.darkSecondaryColor = palette.secondary
  settings.darkAccentColor = palette.accent
}

const selectedPresetId = computed(() => {
  const matched = themePresets.find((preset) => {
    const sameLight =
      normalizeHex(settings.lightPrimaryColor) === preset.light.primary &&
      normalizeHex(settings.lightSecondaryColor) === preset.light.secondary &&
      normalizeHex(settings.lightAccentColor) === preset.light.accent
    const sameDark =
      normalizeHex(settings.darkPrimaryColor) === preset.dark.primary &&
      normalizeHex(settings.darkSecondaryColor) === preset.dark.secondary &&
      normalizeHex(settings.darkAccentColor) === preset.dark.accent
    return sameLight && sameDark
  })
  return matched?.id ?? 'custom'
})

const editingPalette = computed(() => getPalette(paletteMode.value))
const livePalette = computed(() => getPalette(appTheme.getIsDark().value ? 'dark' : 'light'))

const applyThemeMode = async (mode: ThemeMode) => {
  appTheme.setFollowSystem(mode === 'system')
  if (mode === 'system') {
    await appTheme.setTheme(prefersDark.value, true)
    return
  }
  await appTheme.setTheme(mode === 'dark', true)
}

const handleThemeSelect = (mode: ThemeMode) => {
  settings.themeMode = mode
}

const applyPreset = (presetId: string) => {
  const preset = themePresets.find(item => item.id === presetId)
  if (!preset) return
  setPalette('light', preset.light)
  setPalette('dark', preset.dark)
}

const updatePaletteColor = (key: PaletteKey, value: string) => {
  const normalized = normalizeHex(value)
  if (!normalized) return
  const next = {
    ...editingPalette.value,
    [key]: normalized,
  }
  setPalette(paletteMode.value, next)
}

const handleToggleMica = (enabled: boolean) => {
  appTheme.setBgTransparent(enabled)
}

const handleResetTheme = () => {
  settings.themeMode = 'system'
  applyPreset('aurora')
  settings.compactMode = false
  settings.sidebarCollapsed = false
  settings.animationsEnabled = true
  settings.animationSpeed = 'normal'
  appTheme.setBgTransparent(true)
  toast.success('主题设置已恢复默认')
}

const handleSave = async () => {
  isSaving.value = true
  await new Promise(resolve => setTimeout(resolve, 260))
  toast.success('主题设置已同步')
  isSaving.value = false
}

watch(
  () => settings.themeMode,
  mode => void applyThemeMode((mode as ThemeMode) || 'system'),
  { immediate: true },
)

watch(prefersDark, (val) => {
  if (settings.themeMode === 'system') {
    void appTheme.setTheme(val, true)
  }
})
</script>

<template>
  <div class="space-y-4 md:space-y-6">
    <section class="rounded-2xl border border-base-content/10 bg-base-100/20 p-4 backdrop-blur-md md:p-6">
      <div class="flex items-start justify-between gap-3">
        <div class="space-y-1">
          <h2 class="text-base md:text-lg font-semibold">主题外观</h2>
          <p class="text-xs md:text-sm text-base-content/70">浅色与深色支持独立配色，切换时自动同步</p>
        </div>
        <Icon name="mingcute:palette-line" class="text-xl md:text-2xl text-primary" />
      </div>
      <div class="mt-4 grid grid-cols-1 gap-3 md:grid-cols-3">
        <button
          v-for="mode in themeModes"
          :key="mode.value"
          class="btn h-auto min-h-20 justify-start rounded-xl border border-base-content/10 px-4 py-3 text-left normal-case"
          :class="settings.themeMode === mode.value ? 'btn-soft border-primary/30 bg-primary/15' : 'btn-ghost bg-base-100/20'"
          @click="handleThemeSelect(mode.value)"
        >
          <span class="mr-3 inline-flex h-9 w-9 items-center justify-center rounded-lg bg-base-100/50">
            <Icon :name="mode.icon" class="text-lg" />
          </span>
          <span class="flex flex-col">
            <span class="text-sm font-medium">{{ mode.label }}</span>
            <span class="text-xs text-base-content/60">{{ mode.desc }}</span>
          </span>
        </button>
      </div>
    </section>

    <section class="rounded-2xl border border-base-content/10 bg-base-100/20 p-4 backdrop-blur-md md:p-6">
      <div class="flex items-center justify-between">
        <div>
          <h3 class="text-base md:text-lg font-semibold">高阶配色预设</h3>
          <p class="text-xs md:text-sm text-base-content/70">每个预设均包含浅色/深色两套品牌色</p>
        </div>
        <div class="badge badge-ghost border-base-content/10 bg-base-100/30">{{ selectedPresetId === 'custom' ? '自定义' : '已匹配预设' }}</div>
      </div>

      <div class="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
        <button
          v-for="preset in themePresets"
          :key="preset.id"
          class="btn h-auto min-h-28 flex-col items-start rounded-xl border border-base-content/10 px-4 py-3 normal-case"
          :class="selectedPresetId === preset.id ? 'btn-soft border-primary/30 bg-primary/15' : 'btn-ghost bg-base-100/20'"
          @click="applyPreset(preset.id)"
        >
          <span class="text-sm font-semibold">{{ preset.name }}</span>
          <span class="text-xs text-base-content/60">{{ preset.desc }}</span>
          <span class="mt-2 grid w-full grid-cols-2 gap-2">
            <span class="flex items-center gap-1">
              <span class="h-3 w-3 rounded-full border border-base-content/20" :style="{ backgroundColor: preset.light.primary }"></span>
              <span class="h-3 w-3 rounded-full border border-base-content/20" :style="{ backgroundColor: preset.light.secondary }"></span>
              <span class="h-3 w-3 rounded-full border border-base-content/20" :style="{ backgroundColor: preset.light.accent }"></span>
            </span>
            <span class="flex items-center justify-end gap-1">
              <span class="h-3 w-3 rounded-full border border-base-content/20" :style="{ backgroundColor: preset.dark.primary }"></span>
              <span class="h-3 w-3 rounded-full border border-base-content/20" :style="{ backgroundColor: preset.dark.secondary }"></span>
              <span class="h-3 w-3 rounded-full border border-base-content/20" :style="{ backgroundColor: preset.dark.accent }"></span>
            </span>
          </span>
        </button>
      </div>
    </section>

    <section class="rounded-2xl border border-base-content/10 bg-base-100/20 p-4 backdrop-blur-md md:p-6">
      <div class="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 class="text-base md:text-lg font-semibold">独立主题色编辑</h3>
          <p class="text-xs md:text-sm text-base-content/70">为浅色与深色分别设置主色、次色、强调色</p>
        </div>
        <div class="join">
          <button class="btn btn-sm join-item" :class="paletteMode === 'light' ? 'btn-soft' : 'btn-ghost'" @click="paletteMode = 'light'">浅色</button>
          <button class="btn btn-sm join-item" :class="paletteMode === 'dark' ? 'btn-soft' : 'btn-ghost'" @click="paletteMode = 'dark'">深色</button>
        </div>
      </div>

      <div class="mt-5 grid grid-cols-1 gap-3 md:grid-cols-3">
        <label class="rounded-xl border border-base-content/10 bg-base-100/20 p-3">
          <span class="mb-2 block text-xs text-base-content/70">{{ paletteMode === 'light' ? '浅色主色' : '深色主色' }}</span>
          <div class="flex items-center gap-2">
            <input :value="editingPalette.primary" type="color" class="h-10 w-12 cursor-pointer rounded-lg border border-base-content/10 bg-transparent p-0" @input="updatePaletteColor('primary', ($event.target as HTMLInputElement).value)">
            <input :value="editingPalette.primary" type="text" class="input input-sm w-full border-none bg-base-100/40" @input="updatePaletteColor('primary', ($event.target as HTMLInputElement).value)">
          </div>
        </label>
        <label class="rounded-xl border border-base-content/10 bg-base-100/20 p-3">
          <span class="mb-2 block text-xs text-base-content/70">{{ paletteMode === 'light' ? '浅色次色' : '深色次色' }}</span>
          <div class="flex items-center gap-2">
            <input :value="editingPalette.secondary" type="color" class="h-10 w-12 cursor-pointer rounded-lg border border-base-content/10 bg-transparent p-0" @input="updatePaletteColor('secondary', ($event.target as HTMLInputElement).value)">
            <input :value="editingPalette.secondary" type="text" class="input input-sm w-full border-none bg-base-100/40" @input="updatePaletteColor('secondary', ($event.target as HTMLInputElement).value)">
          </div>
        </label>
        <label class="rounded-xl border border-base-content/10 bg-base-100/20 p-3">
          <span class="mb-2 block text-xs text-base-content/70">{{ paletteMode === 'light' ? '浅色强调色' : '深色强调色' }}</span>
          <div class="flex items-center gap-2">
            <input :value="editingPalette.accent" type="color" class="h-10 w-12 cursor-pointer rounded-lg border border-base-content/10 bg-transparent p-0" @input="updatePaletteColor('accent', ($event.target as HTMLInputElement).value)">
            <input :value="editingPalette.accent" type="text" class="input input-sm w-full border-none bg-base-100/40" @input="updatePaletteColor('accent', ($event.target as HTMLInputElement).value)">
          </div>
        </label>
      </div>

      <div class="mt-4 rounded-xl border border-base-content/10 bg-base-100/25 p-3">
        <p class="mb-2 text-xs text-base-content/65">当前生效配色预览</p>
        <div class="flex items-center gap-2">
          <span class="h-6 w-6 rounded-full border border-base-content/20" :style="{ backgroundColor: livePalette.primary }"></span>
          <span class="h-6 w-6 rounded-full border border-base-content/20" :style="{ backgroundColor: livePalette.secondary }"></span>
          <span class="h-6 w-6 rounded-full border border-base-content/20" :style="{ backgroundColor: livePalette.accent }"></span>
        </div>
      </div>
    </section>

    <section class="grid grid-cols-1 gap-4 xl:grid-cols-2">
      <div class="rounded-2xl border border-base-content/10 bg-base-100/20 p-4 backdrop-blur-md md:p-6">
        <h3 class="text-base md:text-lg font-semibold">界面行为</h3>
        <div class="mt-4 space-y-3">
          <label class="flex items-center justify-between rounded-xl bg-base-100/20 px-3 py-2">
            <span class="text-sm">紧凑模式</span>
            <input v-model="settings.compactMode" type="checkbox" class="toggle toggle-sm toggle-primary">
          </label>
          <label class="flex items-center justify-between rounded-xl bg-base-100/20 px-3 py-2">
            <span class="text-sm">默认折叠侧边栏</span>
            <input v-model="settings.sidebarCollapsed" type="checkbox" class="toggle toggle-sm toggle-primary">
          </label>
          <label class="flex items-center justify-between rounded-xl bg-base-100/20 px-3 py-2">
            <span class="text-sm">启用动画</span>
            <input v-model="settings.animationsEnabled" type="checkbox" class="toggle toggle-sm toggle-primary">
          </label>
        </div>
      </div>

      <div class="rounded-2xl border border-base-content/10 bg-base-100/20 p-4 backdrop-blur-md md:p-6">
        <h3 class="text-base md:text-lg font-semibold">窗口效果</h3>
        <div class="mt-4 space-y-3">
          <label class="flex items-center justify-between rounded-xl bg-base-100/20 px-3 py-2">
            <span class="text-sm">云母背景</span>
            <input type="checkbox" class="toggle toggle-sm toggle-primary" :checked="isBgTransparent" :disabled="!isMicaSupported" @change="handleToggleMica(($event.target as HTMLInputElement).checked)">
          </label>
          <p class="text-xs text-base-content/65">
            仅桌面端可用，启用后主界面半透明，浮层保持高可读毛玻璃。
          </p>
        </div>
      </div>
    </section>

    <section class="flex flex-col gap-3 rounded-2xl border border-base-content/10 bg-base-100/20 p-4 backdrop-blur-md md:flex-row md:items-center md:justify-between md:p-6">
      <div>
        <h3 class="text-base font-semibold">确认主题配置</h3>
        <p class="text-xs md:text-sm text-base-content/70">设置已自动持久化，点击同步用于手动确认</p>
      </div>
      <div class="flex items-center gap-2">
        <button class="btn btn-soft btn-sm" @click="handleResetTheme">恢复默认</button>
        <button class="btn btn-primary btn-sm min-w-28" :disabled="isSaving" @click="handleSave">
          <span v-if="isSaving" class="loading loading-spinner loading-xs"></span>
          {{ isSaving ? '同步中' : '同步设置' }}
        </button>
      </div>
    </section>
  </div>
</template>
