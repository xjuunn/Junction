<script setup lang="ts">
import { computed } from 'vue'
import type { RtcCallParticipant } from '@junction/types'

const { state, localStream, remoteStreams, acceptCall, rejectCall, cancelCall, leaveCall, toggleMute, toggleCamera, toggleScreenShare } = useCall()
const userStore = useUserStore()

const isVisible = computed(() => state.status.value !== 'idle')
const isRinging = computed(() => state.status.value === 'ringing')
const isIncoming = computed(() => state.direction.value === 'incoming')
const isOutgoing = computed(() => state.direction.value === 'outgoing')

const participants = computed<RtcCallParticipant[]>(() => state.participants.value || [])
const meId = computed(() => userStore.user.value?.id)

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
</script>

<template>
  <div v-if="isVisible" class="fixed inset-0 z-[60] flex items-center justify-center">
    <div class="absolute inset-0 bg-base-100/70 backdrop-blur-xl"></div>

    <div class="relative w-full h-full flex flex-col">
      <div class="flex-1 p-4 md:p-8">
        <div class="h-full rounded-3xl border border-base-content/5 bg-base-100/80 backdrop-blur-md overflow-hidden flex flex-col">
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
            <div class="text-xs font-bold opacity-50">
              {{ participants.length }} 人
            </div>
          </div>

          <div class="flex-1 p-4 md:p-6">
            <div class="grid gap-4 h-full" :class="gridClass">
              <AppCallVideoTile
                v-for="p in participants"
                :key="p.userId"
                :participant="p"
                :stream="getStream(p)"
                :muted="p.userId === meId"
              />
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
            <button class="btn btn-error btn-circle text-base-100" @click="leaveCall">
              <Icon name="mingcute:phone-outgoing-line" size="20" />
            </button>
          </div>
        </div>
      </div>

      <div v-if="isRinging" class="absolute inset-x-0 bottom-6 flex justify-center px-4">
        <div class="w-full max-w-md rounded-3xl border border-base-content/5 bg-base-100/80 backdrop-blur-md p-5 flex items-center justify-between gap-4">
          <div class="flex items-center gap-3">
            <BaseAvatar :text="state.incomingFrom.value?.name || '来电'" :src="state.incomingFrom.value?.image || undefined" :height="44" :width="44" :radius="14" />
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
  </div>
</template>
