<script setup lang="ts">
const settings = useSettingsStore()
const toast = useToast()
const appTheme = AppTheme.getInstance()

const themes = [
  { value: 'light', label: '浅色', icon: 'mingcute:sun-line', color: 'bg-base-100' },
  { value: 'dark', label: '深色', icon: 'mingcute:moon-line', color: 'bg-neutral' },
  { value: 'system', label: '跟随系统', icon: 'mingcute:computer-line', color: 'bg-base-300' },
]

const primaryColors = [
  { value: 'primary', label: '默认蓝', class: 'bg-blue-500' },
  { value: 'secondary', label: '紫色', class: 'bg-purple-500' },
  { value: 'accent', label: '青色', class: 'bg-cyan-500' },
  { value: 'success', label: '绿色', class: 'bg-green-500' },
  { value: 'warning', label: '橙色', class: 'bg-orange-500' },
  { value: 'error', label: '红色', class: 'bg-red-500' },
  { value: 'pink', label: '粉色', class: 'bg-pink-500' },
  { value: 'indigo', label: '靛蓝', class: 'bg-indigo-500' },
]

const animationSpeeds = [
  { value: 'slow', label: '慢速' },
  { value: 'normal', label: '正常' },
  { value: 'fast', label: '快速' },
  { value: 'none', label: '无动画' },
]

const isSaving = ref(false)
const prefersDark = usePreferredDark()
const isMicaSupported = computed(() => isTauri())
const isBgTransparent = appTheme.getIsBgTransparent()

const applyThemeMode = async (mode: string) => {
  appTheme.setFollowSystem(mode === 'system')
  if (mode === 'system') {
    await appTheme.setTheme(prefersDark.value, true)
    return
  }
  await appTheme.setTheme(mode === 'dark', true)
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

const handleThemeSelect = (mode: string) => {
  settings.themeMode = mode
}

const handleToggleMica = (val: boolean) => {
  appTheme.setBgTransparent(val)
}

async function handleSave() {
  isSaving.value = true
  await new Promise(resolve => setTimeout(resolve, 300))
  toast.success('主题设置已保存')
  isSaving.value = false
}

function handleResetTheme() {
  settings.themeMode = 'system'
  settings.primaryColor = 'primary'
  settings.compactMode = false
  settings.sidebarCollapsed = false
  settings.animationsEnabled = true
  settings.animationSpeed = 'normal'
  appTheme.setBgTransparent(true)
  toast.success('已恢复为默认设置')
}
</script>

<template>
  <div class="card bg-base-100 shadow-sm border border-base-200 animate-in fade-in slide-in-from-bottom-2 duration-300">
    <div class="card-body p-6 md:p-8">
      <h2 class="card-title text-lg border-b border-base-200 pb-4 mb-6 flex items-center gap-2">
        <Icon name="mingcute:paint-line" class="text-primary" />
        主题设置
      </h2>

      <div class="space-y-8 max-w-2xl">
        <div>
          <h3 class="text-md font-bold mb-4 flex items-center gap-2">
            <Icon name="mingcute:sun-moon-line" class="text-base-content/50" />
            主题模式
          </h3>

          <div class="grid grid-cols-3 gap-4">
            <button v-for="t in themes" :key="t.value" @click="handleThemeSelect(t.value)"
              class="card p-4 border-2 transition-all cursor-pointer hover:scale-[1.02]"
              :class="settings.themeMode === t.value ? 'border-primary bg-primary/5' : 'border-base-300'">
              <div class="flex flex-col items-center gap-3">
                <div class="w-16 h-16 rounded-xl flex items-center justify-center"
                  :class="t.color + ' text-base-content'">
                  <Icon :name="t.icon" size="32" />
                </div>
                <span class="font-medium">{{ t.label }}</span>
              </div>
            </button>
          </div>
        </div>

        <div class="divider"></div>

        <div>
          <h3 class="text-md font-bold mb-4 flex items-center gap-2">
            <Icon name="mingcute:palette-line" class="text-base-content/50" />
            主题色
          </h3>

          <div class="grid grid-cols-4 gap-3">
            <button v-for="c in primaryColors" :key="c.value" @click="settings.primaryColor = c.value"
              class="flex flex-col items-center gap-2 p-3 rounded-xl border-2 transition-all cursor-pointer hover:scale-[1.05]"
              :class="settings.primaryColor === c.value ? 'border-primary bg-primary/5' : 'border-base-300'">
              <div class="w-10 h-10 rounded-full shadow-sm" :class="c.class"></div>
              <span class="text-sm">{{ c.label }}</span>
            </button>
          </div>
        </div>

        <div class="divider"></div>

        <div>
          <h3 class="text-md font-bold mb-4 flex items-center gap-2">
            <Icon name="mingcute:window-line" class="text-base-content/50" />
            云母效果
          </h3>

          <div class="form-control">
            <label class="label cursor-pointer justify-start gap-4">
              <input type="checkbox" class="toggle toggle-primary" :checked="isBgTransparent"
                :disabled="!isMicaSupported" @change="handleToggleMica(($event.target as HTMLInputElement).checked)" />
              <span class="label-text">
                <span class="font-bold">启用窗口云母</span>
                <br />
                <span class="text-sm text-base-content/50">
                  仅在桌面端生效，启用后会将应用背景设为透明
                </span>
              </span>
            </label>
          </div>
        </div>

        <div class="divider"></div>

        <div>
          <h3 class="text-md font-bold mb-4 flex items-center gap-2">
            <Icon name="mingcute:layout-line" class="text-base-content/50" />
            界面布局
          </h3>

          <div class="space-y-4">
            <div class="form-control">
              <label class="label cursor-pointer justify-start gap-4">
                <input v-model="settings.compactMode" type="checkbox" class="toggle toggle-primary" />
                <span class="label-text">
                  <span class="font-bold">紧凑模式</span>
                  <br />
                  <span class="text-sm text-base-content/50">减少间距，让界面展示更多内容</span>
                </span>
              </label>
            </div>

            <div class="form-control">
              <label class="label cursor-pointer justify-start gap-4">
                <input v-model="settings.sidebarCollapsed" type="checkbox" class="toggle toggle-primary" />
                <span class="label-text">
                  <span class="font-bold">默认折叠侧边栏</span>
                  <br />
                  <span class="text-sm text-base-content/50">应用启动时自动折叠侧边栏</span>
                </span>
              </label>
            </div>
          </div>
        </div>

        <div class="divider"></div>

        <div>
          <h3 class="text-md font-bold mb-4 flex items-center gap-2">
            <Icon name="mingcute:animation-line" class="text-base-content/50" />
            动画效果
          </h3>

          <div class="space-y-4">
            <div class="form-control">
              <label class="label cursor-pointer justify-start gap-4">
                <input v-model="settings.animationsEnabled" type="checkbox" class="toggle toggle-primary" />
                <span class="label-text font-bold">启用动画效果</span>
              </label>
            </div>

            <div class="form-control w-full" v-if="settings.animationsEnabled">
              <label class="label">
                <span class="label-text font-bold">动画速度</span>
              </label>
              <div class="flex flex-wrap gap-2">
                <button v-for="s in animationSpeeds" :key="s.value" @click="settings.animationSpeed = s.value"
                  class="btn btn-sm rounded-lg"
                  :class="settings.animationSpeed === s.value ? 'btn-primary' : 'btn-ghost'">
                  {{ s.label }}
                </button>
              </div>
            </div>
          </div>
        </div>

        <div class="divider"></div>

        <div class="card bg-base-200/50 p-4 rounded-xl">
          <div class="flex items-center justify-between">
            <div>
              <p class="font-bold">恢复默认设置</p>
              <p class="text-sm text-base-content/50">将主题设置恢复到初始状态</p>
            </div>
            <button class="btn btn-sm btn-ghost" @click="handleResetTheme">重置</button>
          </div>
        </div>
      </div>

      <div class="card-actions justify-end mt-10 pt-6 border-t border-base-200">
        <button class="btn btn-primary px-8 rounded-xl min-w-[120px]" @click="handleSave" :disabled="isSaving">
          <span v-if="isSaving" class="loading loading-spinner loading-xs"></span>
          保存更改
        </button>
      </div>
    </div>
  </div>
</template>
