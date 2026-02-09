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
  muted: false
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
  if (props.stream) {
    console.info('[RTC] tile track change', {
      tracks: props.stream.getTracks().map(t => ({ kind: t.kind, id: t.id, enabled: t.enabled }))
    })
  }
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
  { immediate: true }
)

watchEffect(() => {
  attachStream(props.stream || null)
})
</script>

<template>
  <div class="relative w-full h-full rounded-2xl overflow-hidden bg-base-200/60 border border-base-content/5">
    <audio ref="audioRef" autoplay playsinline muted class="hidden" />
    <video
      ref="videoRef"
      class="w-full h-full object-cover"
      autoplay
      playsinline
      muted
      :class="{ 'opacity-0 pointer-events-none': !hasVideo }"
    />
    <div v-if="!hasVideo" class="absolute inset-0 flex flex-col items-center justify-center gap-3">
      <BaseAvatar :text="participant.name || 'User'" :src="participant.image || undefined" :height="64" :width="64" :radius="18" />
      <div class="text-xs font-bold opacity-70 truncate max-w-[70%]">
        {{ participant.name || '\u533f\u540d\u7528\u6237' }}
      </div>
    </div>

    <div class="absolute left-3 bottom-3 px-2.5 py-1 rounded-full text-[10px] font-bold bg-base-100/80 backdrop-blur-md border border-base-content/5">
      {{ participant.isLocal ? '\u6211' : (participant.name || '\u53c2\u4e0e\u8005') }}
    </div>
  </div>
</template>
