<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import type { RtcCallParticipant } from '@junction/types'
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
  toggleScreenShare,
  refreshDevices,
  switchAudioInput,
  switchVideoInput,
  setFocusUser,
  setPreferredQuality,
} = useCall()

const userStore = useUserStore()
const router = useRouter()
const route = useRoute()

const isVisible = computed(() => state.status.value !== 'idle')
const isRinging = computed(() => state.status.value === 'ringing')
const isIncoming = computed(() => state.direction.value === 'incoming')
const isOutgoing = computed(() => state.direction.value === 'outgoing')
const isInCall = computed(() => state.status.value === 'in-call')
const isVideoCall = computed(() => state.callType.value === 'video')

const participants = computed<RtcCallParticipant[]>(() => state.participants.value || [])
const meId = computed(() => userStore.user.value?.id || '')

const showDevicePanel = ref(false)
const showParticipantsPanel = ref(false)
const isReturning = ref(false)

const callStartedAt = ref<number | null>(null)
const nowTick = ref(Date.now())
let timer: ReturnType<typeof setInterval> | null = null

const selectedAudioInputId = computed({
  get: () => state.selectedAudioInputId.value,
  set: (value: string | null) => {
    if (value) switchAudioInput(value)
  },
})

const selectedVideoInputId = computed({
  get: () => state.selectedVideoInputId.value,
  set: (value: string | null) => {
    if (value) switchVideoInput(value)
  },
})

const selectedQuality = computed({
  get: () => state.preferredQuality.value,
  set: (value: 'auto' | 'high' | 'medium' | 'low') => {
    setPreferredQuality(value)
  },
})

const connectionQualityLabel = computed(() => {
  const level = state.connectionQuality.value
  if (level === 'excellent') return '优秀'
  if (level === 'good') return '良好'
  if (level === 'poor') return '较差'
  return '未知'
})

const connectionQualityClass = computed(() => {
  const level = state.connectionQuality.value
  if (level === 'excellent') return 'bg-emerald-500/20 text-emerald-300'
  if (level === 'good') return 'bg-sky-500/20 text-sky-300'
  if (level === 'poor') return 'bg-amber-500/20 text-amber-300'
  return 'bg-white/10 text-white/70'
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

const callTitle = computed(() => {
  if (state.mode.value === 'GROUP') {
    return isVideoCall.value ? '群组视频会议' : '群组语音会议'
  }
  return isVideoCall.value ? '双人视频通话' : '双人语音通话'
})

const callStatusText = computed(() => {
  if (state.status.value === 'ringing') return isIncoming.value ? '来电中' : '呼叫中'
  if (state.status.value === 'connecting') return '连接中'
  if (state.status.value === 'in-call') return '通话中'
  if (state.status.value === 'error') return '通话异常'
  return '准备中'
})

const callDurationText = computed(() => {
  if (!callStartedAt.value) return '00:00'
  const seconds = Math.max(0, Math.floor((nowTick.value - callStartedAt.value) / 1000))
  const mm = String(Math.floor(seconds / 60)).padStart(2, '0')
  const ss = String(seconds % 60).padStart(2, '0')
  return `${mm}:${ss}`
})

const participantCountText = computed(() => `${participants.value.length} 人在线`)
const returnPath = computed(() => {
  const from = route.query.from
  if (typeof from === 'string' && from.startsWith('/') && !from.startsWith('/call')) {
    return from
  }
  return '/chat'
})

const isLikelyScreenShare = (participant: RtcCallParticipant) => {
  const stream = getStream(participant)
  if (!stream) return false
  if (participant.userId === meId.value && state.isScreenSharing.value) return true
  const tracks = stream.getVideoTracks()
  return tracks.some((track) => {
    const label = String(track.label || '').toLowerCase()
    return /screen|display|window|desktop|monitor/.test(label)
  })
}

const stageParticipant = computed(() => {
  if (focusedParticipant.value) return focusedParticipant.value
  const sharing = participants.value.find(isLikelyScreenShare)
  if (sharing) return sharing
  const remote = participants.value.find(p => p.userId !== meId.value)
  return remote || participants.value[0] || null
})

const stageParticipants = computed(() => {
  if (!isVideoCall.value) return []
  if (!stageParticipant.value) return []
  return [stageParticipant.value]
})

const thumbnailParticipants = computed(() => {
  if (!isVideoCall.value) return participants.value
  if (!stageParticipant.value) return participants.value
  return participants.value.filter(p => p.userId !== stageParticipant.value?.userId)
})

const gridClass = computed(() => {
  const count = participants.value.length || 1
  if (count <= 1) return 'grid-cols-1'
  if (count === 2) return 'grid-cols-1 sm:grid-cols-2'
  if (count <= 4) return 'grid-cols-2'
  if (count <= 6) return 'grid-cols-2 lg:grid-cols-3'
  return 'grid-cols-2 md:grid-cols-3 lg:grid-cols-4'
})

const toggleDevicePanel = async () => {
  showDevicePanel.value = !showDevicePanel.value
  if (showDevicePanel.value) {
    showParticipantsPanel.value = false
    await refreshDevices()
  }
}

const toggleParticipantsPanel = () => {
  showParticipantsPanel.value = !showParticipantsPanel.value
  if (showParticipantsPanel.value) showDevicePanel.value = false
}

const handleTileClick = (participant: RtcCallParticipant) => {
  if (!isVideoCall.value) return
  if (focusedUserId.value === participant.userId) {
    setFocusUser(null)
    return
  }
  setFocusUser(participant.userId)
}

const exitPage = async () => {
  if (import.meta.client && window.history.length > 1) {
    router.back()
    return
  }
  await navigateTo('/chat')
}

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

watch(participants, (value) => {
  if (!focusedUserId.value) return
  if (!value.some(p => p.userId === focusedUserId.value)) {
    setFocusUser(null)
  }
})

watch(isVisible, async (value) => {
  if (value || isReturning.value) return
  isReturning.value = true
  await navigateTo(returnPath.value, { replace: true })
}, { immediate: true })

onBeforeUnmount(() => {
  if (timer) {
    clearInterval(timer)
    timer = null
  }
})
</script>

<template>
  <div class="h-full w-full">
    <div v-if="isVisible" class="relative h-[100dvh] w-full overflow-hidden bg-transparent text-white">
      <header
        class="relative z-20 flex items-center justify-between gap-3 border-b border-white/10 bg-black/55 px-3 py-2.5 backdrop-blur-md sm:px-4 sm:py-3 md:px-6"
        :data-tauri-drag-region="isTauri() ? '' : undefined"
      >
        <div class="flex min-w-0 items-center gap-3">
          <button class="btn btn-ghost btn-circle btn-sm text-white hover:bg-white/10" @click="exitPage">
            <Icon name="mingcute:arrow-left-line" size="18" />
          </button>
          <div class="flex h-10 w-10 items-center justify-center rounded-2xl bg-white/12 text-white">
            <Icon :name="isVideoCall ? 'mingcute:video-line' : 'mingcute:mic-line'" size="20" />
          </div>
          <div class="min-w-0">
            <div class="truncate text-sm font-black tracking-tight md:text-base">{{ callTitle }}</div>
            <div class="mt-0.5 flex items-center gap-2 text-[11px] text-white/70">
              <span>{{ callStatusText }}</span>
              <span class="opacity-30">•</span>
              <span>{{ callDurationText }}</span>
              <span class="opacity-30">•</span>
              <span>{{ participantCountText }}</span>
            </div>
          </div>
        </div>

        <div class="flex shrink-0 items-center gap-2">
          <div class="hidden rounded-full px-2.5 py-1 text-[10px] font-bold sm:block" :class="connectionQualityClass">
            {{ connectionQualityLabel }}
          </div>
          <button class="btn btn-ghost btn-circle btn-sm text-white hover:bg-white/10" @click="toggleParticipantsPanel">
            <Icon name="mingcute:group-3-line" size="18" />
          </button>
        </div>
      </header>

      <section class="relative h-[calc(100dvh-132px)] min-h-0 overflow-hidden p-2 sm:p-3 md:p-5">
        <div v-if="isVideoCall" class="flex h-full min-h-0 flex-col gap-3 lg:gap-4">
          <div v-if="stageParticipants.length" class="relative min-h-0 flex-1 overflow-hidden rounded-lg border border-white/10 bg-black">
            <AppCallVideoTile
              :participant="stageParticipants[0]"
              :stream="getStream(stageParticipants[0])"
              :muted="stageParticipants[0].userId === meId"
            />
            <div class="pointer-events-none absolute left-3 top-3 rounded-full bg-black/50 px-2 py-1 text-[10px] font-bold text-white/90">
              {{ isLikelyScreenShare(stageParticipants[0]) ? '屏幕共享' : '主画面' }}
            </div>
          </div>

          <div v-if="thumbnailParticipants.length" class="no-scrollbar flex gap-2 overflow-x-auto pb-1">
            <button
              v-for="p in thumbnailParticipants"
              :key="p.userId"
              class="relative h-24 w-40 shrink-0 overflow-hidden rounded-lg border transition-all sm:h-28 sm:w-44"
              :class="focusedUserId === p.userId ? 'border-primary/60 ring-2 ring-primary/30' : 'border-white/20 hover:border-primary/40'"
              @click="handleTileClick(p)"
            >
              <AppCallVideoTile
                :participant="p"
                :stream="getStream(p)"
                :muted="p.userId === meId"
              />
            </button>
          </div>
        </div>

        <div v-else class="grid h-full min-h-0 gap-3 sm:gap-4" :class="gridClass">
          <div
            v-for="p in participants"
            :key="p.userId"
            class="relative overflow-hidden rounded-lg border border-white/15 bg-black"
          >
            <div class="relative z-10 flex h-full min-h-[160px] flex-col items-center justify-center gap-3 p-4 text-center">
              <BaseAvatar :text="p.name || '用户'" :src="p.image || undefined" :height="72" :width="72" :radius="20" />
              <div class="text-sm font-bold text-white">{{ p.userId === meId ? '我' : (p.name || '参与者') }}</div>
              <div class="voice-pulse"></div>
            </div>
          </div>
        </div>
      </section>

      <footer class="relative z-20 border-t border-white/10 bg-black/60 px-3 pb-[calc(env(safe-area-inset-bottom,0px)+0.75rem)] pt-2.5 backdrop-blur-md sm:px-4 sm:pt-3 md:px-6">
        <div class="mx-auto flex w-full max-w-3xl flex-wrap items-center justify-center gap-2 sm:flex-nowrap sm:gap-3">
          <button class="btn btn-circle" :class="state.isMuted.value ? 'btn-warning' : 'btn-ghost text-white hover:bg-white/10'" @click="toggleMute">
            <Icon :name="state.isMuted.value ? 'mingcute:mic-off-line' : 'mingcute:mic-line'" size="20" />
          </button>

          <button
            v-if="isVideoCall"
            class="btn btn-circle"
            :class="state.isCameraOff.value ? 'btn-warning' : 'btn-ghost text-white hover:bg-white/10'"
            @click="toggleCamera"
          >
            <Icon :name="state.isCameraOff.value ? 'mingcute:eye-close-line' : 'mingcute:camera-line'" size="20" />
          </button>

          <button
            class="btn btn-circle"
            :class="state.isScreenSharing.value ? 'btn-info' : 'btn-ghost text-white hover:bg-white/10'"
            @click="toggleScreenShare"
          >
            <Icon name="mingcute:computer-line" size="20" />
          </button>

          <button class="btn btn-circle btn-ghost text-white hover:bg-white/10" @click="toggleDevicePanel">
            <Icon name="mingcute:settings-3-line" size="20" />
          </button>

          <button class="btn btn-error btn-circle text-base-100" @click="leaveCall">
            <Icon name="mingcute:phone-outgoing-line" size="20" />
          </button>
        </div>
      </footer>

      <Transition name="panel-slide">
        <aside
          v-if="showParticipantsPanel"
          class="absolute inset-y-0 right-0 z-30 w-full border-l border-white/10 bg-black/85 p-4 backdrop-blur-xl sm:w-[320px] sm:max-w-[88vw]"
        >
          <div class="mb-3 flex items-center justify-between">
            <div class="text-sm font-bold">参会成员</div>
            <button class="btn btn-ghost btn-circle btn-xs text-white hover:bg-white/10" @click="showParticipantsPanel = false">
              <Icon name="mingcute:close-line" size="14" />
            </button>
          </div>

          <div class="space-y-2 overflow-y-auto pr-1">
            <button
              v-for="p in participants"
              :key="`member-${p.userId}`"
              class="flex w-full items-center gap-3 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-left transition hover:border-primary/40 hover:bg-primary/10"
              @click="handleTileClick(p)"
            >
              <BaseAvatar :text="p.name || '用户'" :src="p.image || undefined" :height="34" :width="34" :radius="10" />
              <div class="min-w-0 flex-1">
                <div class="truncate text-sm font-semibold">{{ p.userId === meId ? '我' : (p.name || '参与者') }}</div>
                <div class="text-[11px] text-white/55">{{ p.userId }}</div>
              </div>
              <Icon v-if="focusedUserId === p.userId" name="mingcute:check-fill" size="14" class="text-primary" />
            </button>
          </div>
        </aside>
      </Transition>

      <Transition name="panel-slide">
        <aside
          v-if="showDevicePanel"
          class="absolute bottom-[calc(env(safe-area-inset-bottom,0px)+5.4rem)] left-1/2 z-30 w-[340px] max-w-[92vw] -translate-x-1/2 rounded-2xl border border-white/15 bg-black/85 p-4 shadow-2xl backdrop-blur-xl"
        >
          <div class="mb-3 flex items-center justify-between">
            <div class="text-sm font-bold">设备设置</div>
            <button class="btn btn-ghost btn-circle btn-xs text-white hover:bg-white/10" @click="showDevicePanel = false">
              <Icon name="mingcute:close-line" size="14" />
            </button>
          </div>

          <div class="space-y-3">
            <div class="space-y-1">
              <div class="text-[11px] font-semibold text-white/70">画质</div>
              <select v-model="selectedQuality" class="select select-sm w-full rounded-xl border-white/20 bg-black/30 text-white">
                <option value="auto">自动画质</option>
                <option value="high">高清</option>
                <option value="medium">标清</option>
                <option value="low">流畅</option>
              </select>
            </div>
            <div class="space-y-1">
              <div class="text-[11px] font-semibold text-white/70">麦克风</div>
              <select v-model="selectedAudioInputId" class="select select-sm w-full rounded-xl border-white/20 bg-black/30 text-white">
                <option v-for="device in state.audioInputDevices.value" :key="device.deviceId" :value="device.deviceId">
                  {{ device.label || '未知麦克风' }}
                </option>
              </select>
            </div>
            <div class="space-y-1">
              <div class="text-[11px] font-semibold text-white/70">摄像头</div>
              <select v-model="selectedVideoInputId" class="select select-sm w-full rounded-xl border-white/20 bg-black/30 text-white">
                <option v-for="device in state.videoInputDevices.value" :key="device.deviceId" :value="device.deviceId">
                  {{ device.label || '未知摄像头' }}
                </option>
              </select>
            </div>
          </div>
        </aside>
      </Transition>

      <Transition name="ringing-float">
        <div v-if="isRinging" class="pointer-events-none absolute inset-x-0 top-[72px] z-30 flex justify-center px-4">
          <div class="pointer-events-auto flex w-full max-w-md items-center justify-between gap-4 rounded-3xl border border-white/15 bg-black/70 p-4 shadow-[0_20px_60px_rgba(0,0,0,0.35)] backdrop-blur-xl">
            <div class="flex min-w-0 items-center gap-3">
              <BaseAvatar :text="state.incomingFrom.value?.name || '来电'" :src="state.incomingFrom.value?.image || undefined" :height="44" :width="44" :radius="14" />
              <div class="min-w-0">
                <div class="truncate text-sm font-black">{{ state.incomingFrom.value?.name || (isIncoming ? '来电中' : '呼叫中') }}</div>
                <div class="text-xs text-white/65">{{ isVideoCall ? '视频通话' : '语音通话' }}</div>
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
      </Transition>
    </div>

    <div v-else class="h-[100dvh] w-full bg-transparent"></div>
  </div>
</template>

<style scoped>
.no-scrollbar::-webkit-scrollbar {
  display: none;
}

.no-scrollbar {
  -ms-overflow-style: none;
  scrollbar-width: none;
}

.panel-slide-enter-active,
.panel-slide-leave-active {
  transition: all 0.24s ease;
}

.panel-slide-enter-from,
.panel-slide-leave-to {
  opacity: 0;
  transform: translateY(8px);
}

.ringing-float-enter-active,
.ringing-float-leave-active {
  transition: all 0.26s ease;
}

.ringing-float-enter-from,
.ringing-float-leave-to {
  opacity: 0;
  transform: translateY(18px) scale(0.96);
}

.voice-pulse {
  width: 58px;
  height: 8px;
  border-radius: 999px;
  background: linear-gradient(90deg, hsl(var(--p) / 0.35), hsl(var(--s) / 0.4));
  animation: voicePulse 1.4s ease-in-out infinite;
}

@keyframes voicePulse {
  0%, 100% {
    transform: scaleX(0.65);
    opacity: 0.55;
  }
  50% {
    transform: scaleX(1);
    opacity: 1;
  }
}
</style>


