<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, reactive, ref, watch } from 'vue'
import type { RtcCallParticipant } from '@junction/types'
import gsap from 'gsap'
import { isTauri } from '~/utils/check'

const { state, localStream, remoteStreams, acceptCall, rejectCall, cancelCall, leaveCall, toggleMute, toggleCamera, toggleScreenShare, refreshDevices, switchAudioInput, switchVideoInput, setFocusUser, setPreferredQuality } = useCall()
const userStore = useUserStore()

const isVisible = computed(() => state.status.value !== 'idle')
const isRinging = computed(() => state.status.value === 'ringing')
const isIncoming = computed(() => state.direction.value === 'incoming')
const isOutgoing = computed(() => state.direction.value === 'outgoing')

const participants = computed<RtcCallParticipant[]>(() => state.participants.value || [])
const meId = computed(() => userStore.user.value?.id)

const isMinimized = ref(false)
const isAnimating = ref(false)
const isDragging = ref(false)
const dragMoved = ref(false)
const showDevicePanel = ref(false)
const lastDrag = reactive({ x: 0, y: 0, t: 0 })
const velocity = reactive({ x: 0, y: 0 })
const dragOffset = reactive({ x: 0, y: 0 })
const miniPos = reactive({ x: 24, y: 24 })
const miniTarget = reactive({ x: 24, y: 24 })
const miniSetter = ref<((value: number) => void) | null>(null)
const miniSetterY = ref<((value: number) => void) | null>(null)

const rootRef = ref<HTMLDivElement | null>(null)
const fullRef = ref<HTMLDivElement | null>(null)
const miniRef = ref<HTMLDivElement | null>(null)

const gridClass = computed(() => {
  const count = participants.value.length || 1
  if (count <= 1) return 'grid-cols-1'
  if (count === 2) return 'grid-cols-1 md:grid-cols-2'
  if (count <= 4) return 'grid-cols-2'
  return 'grid-cols-2 md:grid-cols-3'
})

const getStream = (participant: RtcCallParticipant) => {
  if (participant.userId === meId.value) return localStream.value
  return remoteStreams.value[participant.userId] ?? null
}

const focusedUserId = computed(() => state.focusedUserId.value)
const focusedParticipant = computed(() => {
  if (!focusedUserId.value) return null
  return participants.value.find(p => p.userId === focusedUserId.value) || null
})

const isFocusedView = computed(() => !!focusedParticipant.value)
const mainParticipants = computed(() => {
  if (focusedParticipant.value) return [focusedParticipant.value]
  return participants.value
})
const otherParticipants = computed(() => {
  if (!focusedParticipant.value) return []
  return participants.value.filter(p => p.userId !== focusedParticipant.value?.userId)
})

const miniParticipant = computed(() => {
  if (focusedParticipant.value) return focusedParticipant.value
  if (!participants.value.length) return null
  const remote = participants.value.find(p => p.userId !== meId.value)
  return remote || participants.value[0]
})

const selectedAudioInputId = computed({
  get: () => state.selectedAudioInputId.value,
  set: (value: string | null) => {
    if (value) switchAudioInput(value)
  }
})

const selectedVideoInputId = computed({
  get: () => state.selectedVideoInputId.value,
  set: (value: string | null) => {
    if (value) switchVideoInput(value)
  }
})


const selectedQuality = computed({
  get: () => state.preferredQuality.value,
  set: (value: 'auto' | 'high' | 'medium' | 'low') => {
    setPreferredQuality(value)
  }
})
const connectionQualityLabel = computed(() => {
  const level = state.connectionQuality.value
  if (level === 'excellent') return '\u4f18\u79c0'
  if (level === 'good') return '\u826f\u597d'
  if (level === 'poor') return '\u8f83\u5dee'
  return '\u672a\u77e5'
})

const connectionQualityClass = computed(() => {
  const level = state.connectionQuality.value
  if (level === 'excellent') return 'bg-emerald-500/15 text-emerald-600'
  if (level === 'good') return 'bg-sky-500/15 text-sky-600'
  if (level === 'poor') return 'bg-amber-500/15 text-amber-600'
  return 'bg-base-200/70 text-base-content/60'
})

const toggleDevicePanel = async () => {
  showDevicePanel.value = !showDevicePanel.value
  if (showDevicePanel.value) {
    await refreshDevices()
  }
}

const handleTileClick = (participant: RtcCallParticipant) => {
  if (focusedUserId.value === participant.userId) {
    setFocusUser(null)
    return
  }
  setFocusUser(participant.userId)
}

const updateMiniPosition = () => {
  const { innerWidth, innerHeight } = window
  const width = 280
  const height = 180
  miniPos.x = Math.max(16, innerWidth - width - 24)
  miniPos.y = Math.max(16, innerHeight - height - 24)
  miniTarget.x = miniPos.x
  miniTarget.y = miniPos.y
  if (miniSetter.value && miniSetterY.value) {
    miniSetter.value(miniPos.x)
    miniSetterY.value(miniPos.y)
  }
}

const animateToMini = async () => {
  if (isAnimating.value || isMinimized.value) return
  isAnimating.value = true
  isMinimized.value = true
  await nextTick()
  const full = fullRef.value
  const mini = miniRef.value
  if (full) {
    gsap.to(full, {
      scale: 0.92,
      opacity: 0,
      duration: 0.35,
      ease: 'power3.inOut'
    })
  }
  if (mini) {
    gsap.fromTo(mini, {
      scale: 0.8,
      opacity: 0
    }, {
      scale: 1,
      opacity: 1,
      duration: 0.4,
      ease: 'power3.out',
      onComplete: () => {
        isAnimating.value = false
      }
    })
  } else {
    isAnimating.value = false
  }
}

const animateToFull = async () => {
  if (isAnimating.value || !isMinimized.value) return
  isAnimating.value = true
  isMinimized.value = false
  await nextTick()
  const full = fullRef.value
  const mini = miniRef.value
  if (mini) {
    gsap.to(mini, {
      scale: 0.85,
      opacity: 0,
      duration: 0.25,
      ease: 'power3.in'
    })
  }
  if (full) {
    gsap.fromTo(full, {
      scale: 0.96,
      opacity: 0
    }, {
      scale: 1,
      opacity: 1,
      duration: 0.4,
      ease: 'power3.out',
      onComplete: () => {
        isAnimating.value = false
      }
    })
  } else {
    isAnimating.value = false
  }
}

const onBackdropClick = () => {
  if (!isMinimized.value) animateToMini()
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

  const width = 280
  const height = 180
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
    }
  })
}

const onMiniPointerUp = (event: PointerEvent) => {
  if (!miniRef.value) return
  isDragging.value = false
  miniRef.value.releasePointerCapture(event.pointerId)

  const width = 280
  const height = 180
  const maxX = window.innerWidth - width - 12
  const maxY = window.innerHeight - height - 12
  const momentumX = miniPos.x + velocity.x * 220
  const momentumY = miniPos.y + velocity.y * 220
  const targetX = Math.min(Math.max(12, momentumX), maxX)
  const targetY = Math.min(Math.max(12, momentumY), maxY)

  gsap.to(miniPos, {
    x: targetX,
    y: targetY,
    duration: 0.4,
    ease: 'power4.out',
    overwrite: true,
    onUpdate: () => {
      if (miniSetter.value && miniSetterY.value) {
        miniSetter.value(miniPos.x)
        miniSetterY.value(miniPos.y)
      }
    }
  })
}

const onMiniClick = () => {
  if (dragMoved.value) return
  animateToFull()
}

watch(isVisible, (value) => {
  if (!value) {
    isMinimized.value = false
    return
  }
  updateMiniPosition()
  nextTick(() => {
    if (fullRef.value) {
      gsap.fromTo(fullRef.value, {
        scale: 0.98,
        opacity: 0
      }, {
        scale: 1,
        opacity: 1,
        duration: 0.35,
        ease: 'power3.out'
      })
    }
  })
})

watch(participants, (value) => {
  if (!focusedUserId.value) return
  const exists = value.some(p => p.userId === focusedUserId.value)
  if (!exists) setFocusUser(null)
})

onMounted(() => {
  updateMiniPosition()
  window.addEventListener('resize', updateMiniPosition, { passive: true })
})

watch(isMinimized, async (value) => {
  if (!value) return
  await nextTick()
  if (!miniRef.value) return
  miniSetter.value = gsap.quickSetter(miniRef.value, 'x', 'px')
  miniSetterY.value = gsap.quickSetter(miniRef.value, 'y', 'px')
  miniSetter.value(miniPos.x)
  miniSetterY.value(miniPos.y)
})

onBeforeUnmount(() => {
  window.removeEventListener('resize', updateMiniPosition)
})
</script>

<template>
  <div v-if="isVisible" ref="rootRef" class="fixed inset-0 z-[60] pointer-events-none">
    <div v-show="!isMinimized" class="absolute inset-0 bg-base-100/70 backdrop-blur-xl pointer-events-auto" @click.self="onBackdropClick"></div>

    <div v-show="!isMinimized" ref="fullRef" class="relative w-full h-full flex flex-col pointer-events-auto">
      <div class="absolute inset-0 pointer-events-none">
        <div class="absolute inset-x-0 top-0 h-6" :data-tauri-drag-region="isTauri() ? '' : undefined"></div>
        <div class="absolute inset-y-0 left-0 w-3" :data-tauri-drag-region="isTauri() ? '' : undefined"></div>
        <div class="absolute inset-y-0 right-0 w-3" :data-tauri-drag-region="isTauri() ? '' : undefined"></div>
        <div class="absolute inset-x-0 bottom-0 h-3" :data-tauri-drag-region="isTauri() ? '' : undefined"></div>
      </div>
      <div class="flex-1 p-4 md:p-8 min-h-0">
        <div class="h-full rounded-3xl border border-base-content/5 bg-base-100/80 backdrop-blur-md overflow-hidden flex flex-col shadow-[0_30px_80px_rgba(0,0,0,0.12)] relative">
          <div class="flex items-center justify-between px-4 md:px-6 py-4 border-b border-base-content/5">
            <div class="flex items-center gap-3">
              <div class="w-10 h-10 rounded-2xl bg-primary/10 text-primary flex items-center justify-center">
                <Icon :name="state.callType.value === 'video' ? 'mingcute:video-line' : 'mingcute:mic-line'" size="20" />
              </div>
              <div class="flex flex-col">
                <div class="text-sm font-black tracking-tight">
                  {{ state.callType.value === 'video' ? '视频通话' : '语音通话' }}
                </div>
                <div class="text-xs opacity-60">
                  {{ state.status.value === 'ringing' ? (isIncoming ? '来电中' : '呼叫中') : '通话中' }}
                </div>
              </div>
            </div>
            <div class="flex items-center gap-3">
              <div class="px-2.5 py-1 rounded-full text-[10px] font-bold" :class="connectionQualityClass">
                {{ connectionQualityLabel }}
              </div>
              <select v-model="selectedQuality" class="select select-xs select-bordered rounded-full text-[10px] h-7 min-h-0 px-2">
                <option value="auto">自动画质</option>
                <option value="high">高画质</option>
                <option value="medium">中画质</option>
                <option value="low">低画质</option>
              </select>
              <div class="text-xs font-bold opacity-50">
                {{ participants.length }} 人
              </div>
              <button class="btn btn-ghost btn-circle btn-sm" @click="animateToMini">
                <Icon name="mingcute:minimize-line" size="18" />
              </button>
            </div>
          </div>

          <div class="flex-1 p-4 md:p-6 min-h-0">
            <div v-if="isFocusedView" class="flex flex-col h-full min-h-0 gap-3">
              <div class="flex-1 min-h-0">
                <div class="h-full rounded-2xl border border-base-content/5 overflow-hidden" @click="handleTileClick(mainParticipants[0])">
                  <AppCallVideoTile
                    v-if="mainParticipants[0]"
                    :participant="mainParticipants[0]"
                    :stream="getStream(mainParticipants[0])"
                    :muted="mainParticipants[0].userId === meId"
                  />
                </div>
              </div>
              <div v-if="otherParticipants.length" class="flex gap-3 overflow-x-auto pb-1 shrink-0">
                <div
                  v-for="p in otherParticipants"
                  :key="p.userId"
                  class="w-40 h-28 rounded-xl border border-base-content/5 overflow-hidden shrink-0 cursor-pointer"
                  @click="handleTileClick(p)"
                >
                  <AppCallVideoTile
                    :participant="p"
                    :stream="getStream(p)"
                    :muted="p.userId === meId"
                  />
                </div>
              </div>
            </div>
            <div v-else class="grid gap-4 h-full min-h-0" :class="gridClass">
              <div
                v-for="p in mainParticipants"
                :key="p.userId"
                class="rounded-2xl border border-base-content/5 overflow-hidden cursor-pointer"
                @click="handleTileClick(p)"
              >
                <AppCallVideoTile
                  :participant="p"
                  :stream="getStream(p)"
                  :muted="p.userId === meId"
                />
              
              <div class="space-y-1">
                <div class="text-[10px] font-semibold opacity-60">画质</div>
                <select v-model="selectedQuality" class="select select-sm select-bordered w-full rounded-xl">
                  <option value="auto">自动</option>
                  <option value="high">高</option>
                  <option value="medium">中</option>
                  <option value="low">低</option>
                </select>
              </div>
</div>
            </div>
          </div>

          <div class="px-4 md:px-6 py-4 border-t border-base-content/5 flex items-center justify-center gap-3">
            <button class="btn btn-ghost btn-circle" @click="toggleMute">
              <Icon :name="state.isMuted.value ? 'mingcute:mic-off-line' : 'mingcute:mic-line'" size="20" />
            </button>
            <button v-if="state.callType.value === 'video'" class="btn btn-ghost btn-circle" @click="toggleCamera">
              <Icon :name="state.isCameraOff.value ? 'mingcute:eye-close-line' : 'mingcute:camera-line'" size="20" />
            </button>
            <button class="btn btn-ghost btn-circle" @click="toggleScreenShare">
              <Icon :name="state.isScreenSharing.value ? 'mingcute:upload-2-line' : 'mingcute:upload-2-line'" size="20" />
            </button>
            <button class="btn btn-ghost btn-circle" @click="toggleDevicePanel">
              <Icon name="mingcute:settings-3-line" size="20" />
            </button>
            <button class="btn btn-error btn-circle text-base-100" @click="leaveCall">
              <Icon name="mingcute:phone-outgoing-line" size="20" />
            </button>
          </div>

          <div v-if="showDevicePanel" class="absolute bottom-24 left-1/2 -translate-x-1/2 w-[320px] max-w-[86vw] rounded-2xl border border-base-content/5 bg-base-100/90 backdrop-blur-md p-4 shadow-[0_20px_40px_rgba(0,0,0,0.18)]">
            <div class="text-xs font-bold opacity-60 mb-2">设备选择</div>
            <div class="space-y-3">
              <div class="space-y-1">
                <div class="text-[10px] font-semibold opacity-60">麦克风</div>
                <select v-model="selectedAudioInputId" class="select select-sm select-bordered w-full rounded-xl">
                  <option v-for="device in state.audioInputDevices.value" :key="device.deviceId" :value="device.deviceId">
                    {{ device.label || '未知麦克风' }}
                  </option>
                </select>
              </div>
              <div class="space-y-1">
                <div class="text-[10px] font-semibold opacity-60">摄像头</div>
                <select v-model="selectedVideoInputId" class="select select-sm select-bordered w-full rounded-xl">
                  <option v-for="device in state.videoInputDevices.value" :key="device.deviceId" :value="device.deviceId">
                    {{ device.label || '未知摄像头' }}
                  </option>
                </select>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div v-if="isRinging" class="absolute inset-x-0 bottom-6 flex justify-center px-4">
        <div class="w-full max-w-md rounded-3xl border border-base-content/5 bg-base-100/80 backdrop-blur-md p-5 flex items-center justify-between gap-4">
          <div class="flex items-center gap-3">
            <BaseAvatar :text="state.incomingFrom.value?.name || '??'" :src="state.incomingFrom.value?.image || undefined" :height="44" :width="44" :radius="14" />
            <div class="flex flex-col">
              <div class="text-sm font-black">{{ state.incomingFrom.value?.name || (isIncoming ? '来电' : '呼叫中') }}</div>
              <div class="text-xs opacity-60">
                {{ state.callType.value === 'video' ? '视频通话' : '语音通话' }}
              </div>
            </div>
          </div>
          <div class="flex items-center gap-2">
            <button v-if="isIncoming" class="btn btn-success btn-circle text-base-100" @click="acceptCall">
              <Icon name="mingcute:phone-incoming-line" size="20" />
            </button>
            <button v-if="isIncoming" class="btn btn-error btn-circle text-base-100" @click="rejectCall">
              <Icon name="mingcute:phone-outgoing-line" size="20" />
            </button>
            <button v-if="isOutgoing" class="btn btn-error btn-circle text-base-100" @click="cancelCall">
              <Icon name="mingcute:close-line" size="20" />
            </button>
          </div>
        </div>
      </div>
    </div>

    <div
      v-show="isMinimized"
      ref="miniRef"
      class="fixed w-[280px] h-[180px] rounded-2xl border border-base-content/5 bg-base-100/85 backdrop-blur-md shadow-[0_20px_50px_rgba(0,0,0,0.2)] overflow-hidden pointer-events-auto select-none"
      :style="`transform: translate3d(${miniPos.x}px, ${miniPos.y}px, 0);`"
      @pointerdown="onMiniPointerDown"
      @pointermove="onMiniPointerMove"
      @pointerup="onMiniPointerUp"
      @pointercancel="onMiniPointerUp"
      @click="onMiniClick"
    >
      <div class="h-10 flex items-center justify-between px-3 border-b border-base-content/5">
        <div class="flex items-center gap-2 text-xs font-bold">
          <Icon :name="state.callType.value === 'video' ? 'mingcute:video-line' : 'mingcute:mic-line'" size="14" />
          <span>通话中</span>
        </div>
        <div class="flex items-center gap-1">
          <button class="btn btn-ghost btn-circle btn-xs" @pointerdown.stop @click.stop="animateToFull">
            <Icon name="mingcute:full-screen-2-line" size="14" />
          </button>
          <button class="btn btn-ghost btn-circle btn-xs" @pointerdown.stop @click.stop="leaveCall">
            <Icon name="mingcute:close-line" size="14" />
          </button>
        </div>
      </div>
      <div class="h-[calc(100%-2.5rem)] p-3">
        <div class="w-full h-full rounded-xl bg-base-200/60 border border-base-content/5 overflow-hidden">
          <AppCallVideoTile
            v-if="miniParticipant"
            :participant="miniParticipant"
            :stream="getStream(miniParticipant)"
            :muted="miniParticipant.userId === meId"
          />
          <div v-else class="w-full h-full flex items-center justify-center">
            <div class="text-xs font-bold opacity-70">拖动或点击右上角恢复</div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
