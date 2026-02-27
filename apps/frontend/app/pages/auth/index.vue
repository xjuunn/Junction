<script setup lang="ts">
import { isTauri } from '~/utils/check'

type SceneId = 'chat' | 'call' | 'admin' | 'theme'

type Scene = {
  id: SceneId
  label: string
  icon: string
  badge: string
}

const sceneMap: Record<SceneId, Scene> = {
  chat: { id: 'chat', label: '会话', icon: 'mingcute:chat-4-line', badge: '实时' },
  call: { id: 'call', label: '通话', icon: 'mingcute:video-line', badge: '稳定' },
  admin: { id: 'admin', label: '管理', icon: 'mingcute:shield-line', badge: '高效' },
  theme: { id: 'theme', label: '主题', icon: 'mingcute:palette-line', badge: '个性化' },
}

const sceneOrder: SceneId[] = ['chat', 'call', 'admin', 'theme']
const appTheme = AppTheme.getInstance()
const settings = useSettingsStore()
const prefersDark = usePreferredDark()
const isMicaEnabled = appTheme.getIsBgTransparent()

const themeModes = [
  { value: 'light', label: '浅色' },
  { value: 'dark', label: '深色' },
  { value: 'system', label: '跟随系统' },
] as const

const primaryPresets = [
  { value: '#4f46e5', label: '默认蓝' },
  { value: '#a855f7', label: '紫色' },
  { value: '#06b6d4', label: '青色' },
  { value: '#16a34a', label: '绿色' },
  { value: '#f59e0b', label: '橙色' },
  { value: '#ef4444', label: '红色' },
] as const

const activeSceneId = ref<SceneId>('chat')
const isPaused = ref(false)
let timer: ReturnType<typeof setInterval> | null = null

const activeScene = computed<Scene>(() => sceneMap[activeSceneId.value])
const activeIndex = computed(() => Math.max(0, sceneOrder.indexOf(activeSceneId.value)))
const canUseMica = computed(() => isTauri())
const accentStyle = computed(() => ({ backgroundColor: settings.primaryColor || '#4f46e5' }))
const isCompact = computed(() => settings.compactMode)

const switchScene = (index: number) => {
  activeSceneId.value = sceneOrder[index] ?? 'chat'
}

const applyThemeMode = async (mode: string) => {
  appTheme.setFollowSystem(mode === 'system')
  if (mode === 'system') {
    await appTheme.setTheme(prefersDark.value, true)
    return
  }
  await appTheme.setTheme(mode === 'dark', true)
}

const handleThemeModeSelect = (mode: string) => {
  settings.themeMode = mode
  void applyThemeMode(mode)
}

const handlePrimarySelect = (color: string) => {
  settings.primaryColor = color
}

const onMicaChange = (enabled: boolean) => {
  appTheme.setBgTransparent(enabled)
}

const tick = () => {
  if (isPaused.value) return
  const nextIndex = (activeIndex.value + 1) % sceneOrder.length
  activeSceneId.value = sceneOrder[nextIndex] ?? 'chat'
}

watch(prefersDark, (val) => {
  if (settings.themeMode === 'system') {
    void appTheme.setTheme(val, true)
  }
})

onMounted(() => {
  void applyThemeMode(settings.themeMode)
  timer = setInterval(tick, 4200)
})

onUnmounted(() => {
  if (timer) clearInterval(timer)
})
</script>

<template>
  <div class="flex h-full">
    <div class="relative flex flex-1 items-center justify-center overflow-hidden md:w-[430px] md:flex-none lg:w-[480px]">
      <transition name="page">
        <div class="absolute mb-10 min-w-80" :key="$route.path">
          <nuxt-page />
        </div>
      </transition>
    </div>

    <div class="hidden flex-1 p-4 md:block lg:p-6">
      <section
        class="relative h-full overflow-hidden rounded-[2rem] border border-base-content/10 bg-base-100/20 px-5 py-6 backdrop-blur-xl lg:px-8 lg:py-8"
        @mouseenter="isPaused = true"
        @mouseleave="isPaused = false"
      >
        <div class="pointer-events-none absolute inset-0 bg-gradient-to-b from-base-content/[0.03] via-transparent to-primary/[0.06]"></div>
        <div class="hero-orb pointer-events-none absolute -top-20 left-1/2 h-72 w-72 -translate-x-1/2 rounded-full bg-primary/20 blur-3xl"></div>

        <div class="relative mx-auto flex h-full w-full max-w-3xl flex-col">
          <header class="shrink-0 space-y-4">
            <div class="flex items-center justify-between">
              <div class="inline-flex items-center gap-2 text-base-content/70">
                <Icon name="mingcute:chat-1-line" size="16" class="text-primary/80" />
                <span class="text-sm font-medium">Junction</span>
              </div>
              <div class="inline-flex items-center gap-2 text-xs text-base-content/55">
                <span class="h-2 w-2 rounded-full bg-success"></span>
                <span>在线服务</span>
              </div>
            </div>

            <div class="text-center">
              <h2 class="text-3xl font-semibold tracking-tight text-base-content lg:text-4xl">企业协作平台</h2>
              <p class="mt-2 text-sm text-base-content/60">通信、通话与治理一体化</p>
            </div>

            <div class="mx-auto w-full max-w-2xl">
              <div class="inline-flex w-full items-center gap-2 overflow-x-auto rounded-2xl border border-base-content/10 bg-base-100/30 p-1.5 backdrop-blur-md [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
                <button
                  v-for="(sceneId, index) in sceneOrder"
                  :key="sceneId"
                  type="button"
                  class="btn btn-sm h-9 min-w-24 flex-1 rounded-xl border border-transparent transition-all duration-300"
                  :class="index === activeIndex ? 'btn-soft border-base-content/10 bg-base-100/70' : 'btn-ghost text-base-content/65 hover:text-base-content'"
                  :aria-label="`切换到${sceneMap[sceneId].label}`"
                  @click="switchScene(index)"
                >
                  <Icon :name="sceneMap[sceneId].icon" size="16" />
                  {{ sceneMap[sceneId].label }}
                </button>
              </div>
            </div>
          </header>

          <main class="min-h-0 flex-1 py-4 lg:py-6">
            <div class="grid h-full place-items-center">
              <div class="scene-shell w-full max-w-2xl rounded-[1.75rem] border border-base-content/10 bg-base-100/20 p-3 shadow-[0_18px_48px_rgba(0,0,0,0.16)]">
                <transition name="scene-swap" mode="out-in">
                  <article
                    :key="activeScene.id"
                    class="w-full rounded-[1.35rem] border border-base-content/10 bg-base-100/45 shadow-[0_10px_28px_rgba(0,0,0,0.12)] backdrop-blur-md"
                    :class="isCompact ? 'p-4 lg:p-5' : 'p-6 lg:p-7'"
                  >
                    <div class="mb-5 flex items-center justify-between">
                      <div class="inline-flex items-center gap-2 text-sm text-base-content/75">
                        <Icon :name="activeScene.icon" size="18" />
                        <span>{{ activeScene.label }}</span>
                      </div>
                      <span class="badge badge-soft border border-base-content/10">{{ activeScene.badge }}</span>
                    </div>

                    <div v-if="activeScene.id === 'chat'" class="space-y-4">
                      <div class="flex items-start gap-2">
                        <BaseAvatar text="J" size="34px" />
                        <div class="rounded-2xl bg-base-100/70 px-3 py-2 text-sm">版本已发布，开始灰度。</div>
                      </div>
                      <div class="flex items-start justify-end gap-2">
                        <div class="rounded-2xl bg-primary/20 px-3 py-2 text-sm">收到，5 分钟后同步结果。</div>
                        <BaseAvatar text="A" size="34px" />
                      </div>
                      <div class="mt-2 flex items-center gap-2 text-xs text-base-content/55">
                        <span class="h-1.5 w-1.5 rounded-full bg-success"></span>
                        3 条新消息
                      </div>
                    </div>

                    <div v-else-if="activeScene.id === 'call'" class="space-y-5">
                      <div class="mx-auto grid h-20 w-20 place-items-center rounded-2xl bg-base-100/65">
                        <BaseAvatar text="T" size="56px" />
                      </div>
                      <div class="flex items-center justify-center gap-2">
                        <span class="h-2 w-2 rounded-full bg-success"></span>
                        <span class="text-sm text-base-content/70">团队会议进行中</span>
                      </div>
                      <div class="flex items-center justify-center gap-2">
                        <button class="btn btn-circle btn-soft btn-sm"><Icon name="mingcute:mic-line" size="16" /></button>
                        <button class="btn btn-circle btn-soft btn-sm"><Icon name="mingcute:volume-line" size="16" /></button>
                        <button class="btn btn-circle btn-soft btn-sm text-error"><Icon name="mingcute:phone-off-line" size="16" /></button>
                      </div>
                    </div>

                    <div v-else-if="activeScene.id === 'admin'" class="space-y-4">
                      <div class="grid grid-cols-3 gap-2">
                        <div class="rounded-xl bg-base-100/65 p-3 text-center">
                          <p class="text-xs text-base-content/50">在线</p>
                          <p class="mt-1 text-lg font-semibold">128</p>
                        </div>
                        <div class="rounded-xl bg-base-100/65 p-3 text-center">
                          <p class="text-xs text-base-content/50">会话</p>
                          <p class="mt-1 text-lg font-semibold">342</p>
                        </div>
                        <div class="rounded-xl bg-base-100/65 p-3 text-center">
                          <p class="text-xs text-base-content/50">告警</p>
                          <p class="mt-1 text-lg font-semibold">2</p>
                        </div>
                      </div>
                      <div class="flex items-center justify-between rounded-xl bg-base-100/65 px-3 py-2">
                        <span class="text-sm">自动备份</span>
                        <input type="checkbox" class="toggle toggle-sm toggle-primary" checked>
                      </div>
                    </div>

                    <div v-else class="space-y-3">
                      <div class="text-sm text-base-content/70">外观模式</div>
                      <div class="join w-full">
                        <button
                          v-for="item in themeModes"
                          :key="item.value"
                          class="btn btn-sm join-item flex-1"
                          :class="settings.themeMode === item.value ? 'btn-soft' : 'btn-ghost'"
                          @click="handleThemeModeSelect(item.value)"
                        >
                          {{ item.label }}
                        </button>
                      </div>

                      <div class="text-sm text-base-content/70 pt-1">主色预设</div>
                      <div class="grid grid-cols-6 gap-2">
                        <button
                          v-for="item in primaryPresets"
                          :key="item.value"
                          class="h-8 rounded-lg border transition-all"
                          :class="[
                            settings.primaryColor === item.value
                              ? 'scale-105 border-base-content/30 ring-2 ring-base-content/15'
                              : 'border-base-content/10'
                          ]"
                          :style="{ backgroundColor: item.value }"
                          :title="item.label"
                          @click="handlePrimarySelect(item.value)"
                        ></button>
                      </div>

                      <div class="flex items-center justify-between rounded-xl bg-base-100/65 px-3 py-2">
                        <span class="text-sm">紧凑模式</span>
                        <input v-model="settings.compactMode" type="checkbox" class="toggle toggle-sm toggle-primary">
                      </div>

                      <div class="flex items-center justify-between rounded-xl bg-base-100/65 px-3 py-2">
                        <div>
                          <div class="text-sm">云母效果</div>
                          <div class="text-xs text-base-content/55">窗口背景半透明与毛玻璃层</div>
                        </div>
                        <input
                          type="checkbox"
                          class="toggle toggle-sm toggle-primary"
                          :disabled="!canUseMica"
                          :checked="isMicaEnabled"
                          @change="onMicaChange(($event.target as HTMLInputElement).checked)"
                        >
                      </div>
                    </div>
                  </article>
                </transition>
              </div>
            </div>
          </main>

          <footer class="shrink-0 pb-1 pt-3">
            <div class="mx-auto inline-flex w-auto items-center gap-2 rounded-full border border-base-content/10 bg-base-100/35 px-3 py-2 backdrop-blur-md">
              <button
                v-for="(sceneId, index) in sceneOrder"
                :key="sceneId + '-dot'"
                type="button"
                class="group inline-flex items-center gap-2 rounded-full px-2.5 py-1 transition-all duration-300"
                :class="index === activeIndex ? 'bg-base-100/80' : 'hover:bg-base-100/45'"
                :aria-label="`选择${sceneMap[sceneId].label}`"
                @click="switchScene(index)"
              >
                <span
                  class="h-2.5 rounded-full transition-all duration-300"
                  :class="index === activeIndex ? 'w-7' : 'w-2.5 bg-base-content/25 group-hover:bg-base-content/45'"
                  :style="index === activeIndex ? accentStyle : undefined"
                />
                <span
                  class="text-xs transition-colors duration-300"
                  :class="index === activeIndex ? 'text-base-content/80' : 'text-base-content/50 group-hover:text-base-content/70'"
                >
                  {{ sceneMap[sceneId].label }}
                </span>
              </button>
            </div>
          </footer>
        </div>
      </section>
    </div>
  </div>
</template>

<style scoped>
.page-enter-active,
.page-leave-active {
  transition: all 0.48s cubic-bezier(0.22, 1, 0.36, 1);
}

.page-enter-from {
  transform: translateY(-28px);
  opacity: 0;
}

.page-enter-to {
  transform: translateY(0);
  opacity: 1;
}

.page-leave-from {
  transform: translateY(0);
  opacity: 1;
}

.page-leave-to {
  transform: translateY(28px);
  opacity: 0;
}

.scene-swap-enter-active,
.scene-swap-leave-active {
  transition:
    opacity 0.34s ease,
    transform 0.34s cubic-bezier(0.22, 1, 0.36, 1),
    filter 0.34s ease;
}

.scene-swap-enter-from,
.scene-swap-leave-to {
  opacity: 0;
  transform: translateY(8px) scale(0.992);
  filter: blur(4px);
}

.scene-swap-enter-to,
.scene-swap-leave-from {
  opacity: 1;
  transform: translateY(0) scale(1);
  filter: blur(0);
}

.hero-orb {
  animation: orb-float 8s ease-in-out infinite;
}

@keyframes orb-float {
  0%,
  100% {
    transform: translate(-50%, 0);
    opacity: 0.75;
  }
  50% {
    transform: translate(-50%, 12px);
    opacity: 1;
  }
}
</style>
