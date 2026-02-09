<script setup lang="ts">
import { watchEffect, ref } from 'vue'
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

watchEffect(() => {
  if (!videoRef.value) return
  if (props.stream) {
    videoRef.value.srcObject = props.stream
    return
  }
  videoRef.value.srcObject = null
})
</script>

<template>
  <div class="relative w-full h-full rounded-2xl overflow-hidden bg-base-200/60 border border-base-content/5">
    <video
      v-if="stream && stream.getVideoTracks().length"
      ref="videoRef"
      class="w-full h-full object-cover"
      autoplay
      playsinline
      :muted="muted"
    />
    <div v-else class="w-full h-full flex flex-col items-center justify-center gap-3">
      <BaseAvatar :text="participant.name || 'User'" :src="participant.image || undefined" :height="64" :width="64" :radius="18" />
      <div class="text-xs font-bold opacity-70 truncate max-w-[70%]">
        {{ participant.name || '匿名用户' }}
      </div>
    </div>

    <div class="absolute left-3 bottom-3 px-2.5 py-1 rounded-full text-[10px] font-bold bg-base-100/80 backdrop-blur-md border border-base-content/5">
      {{ participant.isLocal ? '我' : (participant.name || '参与者') }}
    </div>
  </div>
</template>
