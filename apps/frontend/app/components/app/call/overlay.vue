<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, reactive, ref, watch } from 'vue'
import type { RtcCallParticipant } from '@junction/types'
import gsap from 'gsap'
import { isTauri } from '~/utils/check'

const {
  state,
  localStream,
  remoteStreams,
  acceptCall,
  rejectCall,
  cancelCall,
  leaveCall,
  toggleMute,
  toggleCamera,
} = useCall()

const route = useRoute()
const userStore = useUserStore()

const isOnCallPage = computed(() => route.path.startsWith('/call'))
const isVisible = computed(() => state.status.value !== 'idle')
const isRinging = computed(() => state.status.value === 'ringing')
const isIncoming = computed(() => state.direction.value === 'incoming')
const isOutgoing = computed(() => state.direction.value === 'outgoing')
const isVideoCall = computed(() => state.callType.value === 'video')
const isInCall = computed(() => state.status.value === 'in-call')

const showFloating = computed(() => isVisible.value && !isOnCallPage.value)
const showIncomingBanner = computed(() => showFloating.value && isRinging.value && isIncoming.value)
const showOutgoingBanner = computed(() => showFloating.value && isRinging.value && isOutgoing.value)
const showMiniFloating = computed(() => showFloating.value && !isRinging.value)

const participants = computed<RtcCallParticipant[]>(() => state.participants.value || [])
const meId = computed(() => userStore.user.value?.id || '')

const callStartedAt = ref<number | null>(null)
const nowTick = ref(Date.now())
let timer: ReturnType<typeof setInterval> | null = null

const miniRef = ref<HTMLDivElement | null>(null)
const isDragging = ref(false)
const dragMoved = ref(false)
const lastDrag = reactive({ x: 0, y: 0, t: 0 })
const velocity = reactive({ x: 0, y: 0 })
const dragOffset = reactive({ x: 0, y: 0 })
const miniPos = reactive({ x: 24, y: 24 })
const miniTarget = reactive({ x: 24, y: 24 })
const miniSetter = ref<((value: number) => void) | null>(null)
const miniSetterY = ref<((value: number) => void) | null>(null)

const autoRoutedCallId = ref<string | null>(null)

const getStream = (participant: RtcCallParticipant) => {
  if (participant.userId === meId.value) return localStream.value
  return remoteStreams.value[participant.userId] ?? null
}

const miniParticipant = computed(() => {
  const remote = participants.value.find(p => p.userId !== meId.value)
  return remote || participants.value[0] || null
})

const callDurationText = computed(() => {
  if (!callStartedAt.value) return '00:00'
  const seconds = Math.max(0, Math.floor((nowTick.value - callStartedAt.value) / 1000))
  const mm = String(Math.floor(seconds / 60)).padStart(2, '0')
  const ss = String(seconds % 60).padStart(2, '0')
  return `${mm}:${ss}`
})

const callTypeText = computed(() => isVideoCall.value ? '视频通话' : '语音通话')

const openCallPage = () => {
  const from = route.fullPath && !route.fullPath.startsWith('/call') ? route.fullPath : '/chat'
  navigateTo({
    path: '/call',
    query: { from },
  })
}

const updateMiniPosition = () => {
  const { innerWidth, innerHeight } = window
  const width = 320
  const height = 192
  miniPos.x = Math.max(16, innerWidth - width - 20)
  miniPos.y = Math.max(16, innerHeight - height - 20)
  miniTarget.x = miniPos.x
  miniTarget.y = miniPos.y
  if (miniSetter.value && miniSetterY.value) {
    miniSetter.value(miniPos.x)
    miniSetterY.value(miniPos.y)
  }
}

const onMiniPointerDown = (event: PointerEvent) => {
  if (!miniRef.value) return
  isDragging.value = true
  dragMoved.value = false
  dragOffset.x = event.clientX - miniPos.x
  dragOffset.y = event.clientY - miniPos.y
  lastDrag.x = event.clientX
  lastDrag.y = event.clientY
  lastDrag.t = performance.now()
  velocity.x = 0
  velocity.y = 0
  miniRef.value.setPointerCapture(event.pointerId)
}

const onMiniPointerMove = (event: PointerEvent) => {
  if (!isDragging.value) return
  const dx = event.clientX - lastDrag.x
  const dy = event.clientY - lastDrag.y
  if (Math.abs(dx) + Math.abs(dy) > 2) dragMoved.value = true

  const now = performance.now()
  const dt = Math.max(16, now - lastDrag.t)
  velocity.x = dx / dt
  velocity.y = dy / dt
  lastDrag.x = event.clientX
  lastDrag.y = event.clientY
  lastDrag.t = now

  const width = 320
  const height = 192
  const maxX = window.innerWidth - width - 12
  const maxY = window.innerHeight - height - 12

  miniTarget.x = Math.min(Math.max(12, event.clientX - dragOffset.x), maxX)
  miniTarget.y = Math.min(Math.max(12, event.clientY - dragOffset.y), maxY)

  gsap.to(miniPos, {
    x: miniTarget.x,
    y: miniTarget.y,
    duration: 0.12,
    ease: 'power3.out',
    overwrite: true,
    onUpdate: () => {
      if (miniSetter.value && miniSetterY.value) {
        miniSetter.value(miniPos.x)
        miniSetterY.value(miniPos.y)
      }
    },
  })
}

const onMiniPointerUp = (event: PointerEvent) => {
  if (!miniRef.value) return
  isDragging.value = false
  miniRef.value.releasePointerCapture(event.pointerId)

  const width = 320
  const height = 192
  const maxX = window.innerWidth - width - 12
  const maxY = window.innerHeight - height - 12
  const targetX = Math.min(Math.max(12, miniPos.x + velocity.x * 220), maxX)
  const targetY = Math.min(Math.max(12, miniPos.y + velocity.y * 220), maxY)

  gsap.to(miniPos, {
    x: targetX,
    y: targetY,
    duration: 0.35,
    ease: 'power4.out',
    overwrite: true,
    onUpdate: () => {
      if (miniSetter.value && miniSetterY.value) {
        miniSetter.value(miniPos.x)
        miniSetterY.value(miniPos.y)
      }
    },
  })
}

const onMiniClick = () => {
  if (dragMoved.value) return
  openCallPage()
}

watch([() => state.callId.value, () => state.status.value], ([callId, status]) => {
  if (status === 'idle') {
    autoRoutedCallId.value = null
    return
  }
  if (!callId || autoRoutedCallId.value === callId) return

  // 仅在连接中/通话中自动跳转，来电振铃阶段保持顶部接听条
  if (status !== 'connecting' && status !== 'in-call') return

  autoRoutedCallId.value = callId
  if (!isOnCallPage.value) openCallPage()
})

watch(isInCall, (value) => {
  if (value) {
    if (!callStartedAt.value) callStartedAt.value = Date.now()
    if (!timer) {
      timer = setInterval(() => {
        nowTick.value = Date.now()
      }, 1000)
    }
    return
  }

  callStartedAt.value = null
  if (timer) {
    clearInterval(timer)
    timer = null
  }
})

watch(showMiniFloating, async (value) => {
  if (!value) return
  await nextTick()
  if (!miniRef.value) return
  miniSetter.value = gsap.quickSetter(miniRef.value, 'x', 'px')
  miniSetterY.value = gsap.quickSetter(miniRef.value, 'y', 'px')
  updateMiniPosition()
})

onMounted(() => {
  updateMiniPosition()
  window.addEventListener('resize', updateMiniPosition, { passive: true })
})

onBeforeUnmount(() => {
  window.removeEventListener('resize', updateMiniPosition)
  if (timer) {
    clearInterval(timer)
    timer = null
  }
})
</script>

<template>
  <div v-if="showFloating" class="pointer-events-none fixed inset-0 z-[60]">
    <Transition name="top-call-banner">
      <div v-if="showIncomingBanner" class="pointer-events-none absolute inset-x-0 top-3 z-[61] flex justify-center px-3 sm:px-4">
        <div class="pointer-events-auto call-banner w-full max-w-xl rounded-2xl border border-white/15 bg-black/65 px-3 py-2 shadow-[0_20px_45px_rgba(0,0,0,0.28)] backdrop-blur-xl sm:px-4 sm:py-3">
          <div class="flex items-center justify-between gap-3">
            <div class="flex min-w-0 items-center gap-3">
              <div class="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/10 text-white">
                <Icon :name="isVideoCall ? 'mingcute:video-line' : 'mingcute:mic-line'" size="18" />
              </div>
              <div class="min-w-0">
                <div class="truncate text-sm font-black text-white">
                  {{ state.incomingFrom.value?.name || '来电邀请' }}
                </div>
                <div class="mt-0.5 text-xs text-white/70">
                  {{ isVideoCall ? '邀请你进行视频通话' : '邀请你进行语音通话' }}
                </div>
              </div>
            </div>

            <div class="flex shrink-0 items-center gap-2">
              <button class="btn btn-success btn-circle btn-sm text-base-100" @click="acceptCall">
                <Icon name="mingcute:phone-incoming-line" size="16" />
              </button>
              <button class="btn btn-error btn-circle btn-sm text-base-100" @click="rejectCall">
                <Icon name="mingcute:phone-outgoing-line" size="16" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </Transition>

    <Transition name="top-call-banner">
      <div v-if="showOutgoingBanner" class="pointer-events-none absolute inset-x-0 top-3 z-[61] flex justify-center px-3 sm:px-4">
        <div class="pointer-events-auto call-banner w-full max-w-xl rounded-2xl border border-white/15 bg-black/65 px-3 py-2 shadow-[0_20px_45px_rgba(0,0,0,0.28)] backdrop-blur-xl sm:px-4 sm:py-3">
          <div class="flex items-center justify-between gap-3">
            <div class="min-w-0">
              <div class="truncate text-sm font-black text-white">正在呼叫中</div>
              <div class="mt-0.5 text-xs text-white/70">等待对方接听</div>
            </div>
            <button class="btn btn-error btn-circle btn-sm text-base-100" @click="cancelCall">
              <Icon name="mingcute:close-line" size="16" />
            </button>
          </div>
        </div>
      </div>
    </Transition>

    <Transition name="mini-float">
      <div
        v-if="showMiniFloating"
        ref="miniRef"
        class="pointer-events-auto fixed h-[192px] w-[320px] select-none overflow-hidden rounded-2xl border border-white/15 bg-black/88 shadow-[0_20px_50px_rgba(0,0,0,0.35)] backdrop-blur-xl"
        :style="`transform: translate3d(${miniPos.x}px, ${miniPos.y}px, 0);`"
        @pointerdown="onMiniPointerDown"
        @pointermove="onMiniPointerMove"
        @pointerup="onMiniPointerUp"
        @pointercancel="onMiniPointerUp"
        @click="onMiniClick"
      >
        <div class="flex h-9 items-center justify-between border-b border-white/10 px-3 text-white" :data-tauri-drag-region="isTauri() ? '' : undefined">
          <div class="flex items-center gap-2 text-[11px] font-bold">
            <Icon :name="isVideoCall ? 'mingcute:video-line' : 'mingcute:mic-line'" size="14" />
            <span>{{ callTypeText }} · {{ callDurationText }}</span>
          </div>
          <div class="flex items-center gap-1">
            <button class="btn btn-ghost btn-circle btn-xs text-white hover:bg-white/10" @pointerdown.stop @click.stop="openCallPage">
              <Icon name="mingcute:square-line" size="14" />
            </button>
            <button class="btn btn-ghost btn-circle btn-xs text-white hover:bg-white/10" @pointerdown.stop @click.stop="leaveCall">
              <Icon name="mingcute:close-line" size="14" />
            </button>
          </div>
        </div>

        <div class="h-[calc(100%-2.25rem)] p-2.5">
          <div class="flex h-full w-full flex-col gap-2">
            <div class="h-full overflow-hidden rounded-xl border border-white/10 bg-black">
              <AppCallVideoTile
                v-if="miniParticipant"
                :participant="miniParticipant"
                :stream="getStream(miniParticipant)"
                :muted="miniParticipant.userId === meId"
              />
              <div v-else class="flex h-full w-full items-center justify-center text-xs font-bold text-white/55">
                暂无可显示画面
              </div>
            </div>

            <div class="flex items-center justify-center gap-2">
              <button class="btn btn-ghost btn-circle btn-xs text-white hover:bg-white/10" @pointerdown.stop @click.stop="toggleMute">
                <Icon :name="state.isMuted.value ? 'mingcute:mic-off-line' : 'mingcute:mic-line'" size="14" />
              </button>
              <button v-if="isVideoCall" class="btn btn-ghost btn-circle btn-xs text-white hover:bg-white/10" @pointerdown.stop @click.stop="toggleCamera">
                <Icon :name="state.isCameraOff.value ? 'mingcute:eye-close-line' : 'mingcute:camera-line'" size="14" />
              </button>
              <button class="btn btn-ghost btn-xs text-white hover:bg-white/10" @pointerdown.stop @click.stop="openCallPage">
                返回通话页
              </button>
            </div>
          </div>
        </div>
      </div>
    </Transition>
  </div>
</template>

<style scoped>
.top-call-banner-enter-active,
.top-call-banner-leave-active,
.mini-float-enter-active,
.mini-float-leave-active {
  transition: all 0.26s ease;
}

.top-call-banner-enter-from,
.top-call-banner-leave-to,
.mini-float-enter-from,
.mini-float-leave-to {
  opacity: 0;
  transform: translateY(-14px) scale(0.98);
}

.call-banner {
  background-image: linear-gradient(135deg, rgb(255 255 255 / 10%), rgb(255 255 255 / 3%));
}
</style>
