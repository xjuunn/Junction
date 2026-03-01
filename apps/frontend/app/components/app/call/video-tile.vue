<script setup lang="ts">
import { ref, watch, watchEffect } from 'vue'
import type { RtcCallParticipant } from '@junction/types'

interface Props {
  participant: RtcCallParticipant
  stream?: MediaStream | null
  muted?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  stream: null,
  muted: false,
})

const videoRef = ref<HTMLVideoElement | null>(null)
const audioRef = ref<HTMLAudioElement | null>(null)
const hasVideo = ref(false)
const hasAudio = ref(false)

const attachStream = (stream: MediaStream | null) => {
  if (videoRef.value) {
    videoRef.value.srcObject = stream
    if (stream) {
      videoRef.value.play().catch(() => {})
    }
  }

  if (audioRef.value) {
    audioRef.value.srcObject = stream
    if (stream) {
      audioRef.value.play().catch(() => {})
    }
  }
}

const updateTrackFlags = (stream: MediaStream | null) => {
  hasVideo.value = !!stream && stream.getVideoTracks().length > 0
  hasAudio.value = !!stream && stream.getAudioTracks().length > 0
}

const handleTrackChange = () => {
  updateTrackFlags(props.stream || null)
  attachStream(props.stream || null)
}

watch(
  () => props.stream,
  (stream, prev) => {
    if (prev) {
      prev.removeEventListener('addtrack', handleTrackChange)
      prev.removeEventListener('removetrack', handleTrackChange)
    }
    if (stream) {
      stream.addEventListener('addtrack', handleTrackChange)
      stream.addEventListener('removetrack', handleTrackChange)
    }

    updateTrackFlags(stream || null)
    attachStream(stream || null)
  },
  { immediate: true },
)

watchEffect(() => {
  attachStream(props.stream || null)
})
</script>

<template>
  <div class="relative h-full w-full overflow-hidden bg-black">
    <audio ref="audioRef" autoplay playsinline :muted="muted" class="hidden" />
    <video
      ref="videoRef"
      class="h-full w-full bg-black object-contain transition-all duration-300"
      autoplay
      playsinline
      muted
      :class="{ 'pointer-events-none opacity-0': !hasVideo }"
    />

    <div v-if="!hasVideo" class="absolute inset-0 flex flex-col items-center justify-center gap-3">
      <BaseAvatar :text="participant.name || 'User'" :src="participant.image || undefined" :height="64" :width="64" :radius="18" />
      <div class="max-w-[70%] truncate text-xs font-bold text-white/70">
        {{ participant.name || '匿名用户' }}
      </div>
    </div>

    <div class="absolute bottom-3 left-3 rounded-full border border-white/10 bg-black/55 px-2.5 py-1 text-[10px] font-bold text-white backdrop-blur-md">
      {{ participant.isLocal ? '我' : (participant.name || '参与者') }}
    </div>

    <div class="absolute right-3 top-3 flex items-center gap-1.5">
      <span
        class="flex h-6 w-6 items-center justify-center rounded-full border border-white/10 bg-black/50 text-white backdrop-blur-md"
        :title="hasAudio ? '麦克风已开启' : '麦克风已关闭'"
      >
        <Icon :name="hasAudio ? 'mingcute:mic-line' : 'mingcute:mic-off-line'" size="12" />
      </span>
      <span
        class="flex h-6 w-6 items-center justify-center rounded-full border border-white/10 bg-black/50 text-white backdrop-blur-md"
        :title="hasVideo ? '摄像头已开启' : '摄像头已关闭'"
      >
        <Icon :name="hasVideo ? 'mingcute:camera-line' : 'mingcute:eye-close-line'" size="12" />
      </span>
    </div>
  </div>
</template>
