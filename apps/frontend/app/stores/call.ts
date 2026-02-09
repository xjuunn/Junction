import type { RtcCallMode, RtcCallParticipant, RtcCallStatus, RtcCallType } from '@junction/types'

export interface CallState {
  callId: string | null
  conversationId: string | null
  callType: RtcCallType | null
  mode: RtcCallMode | null
  status: RtcCallStatus
  connectionQuality: 'excellent' | 'good' | 'poor' | 'unknown'
  preferredQuality: 'auto' | 'high' | 'medium' | 'low'
  direction: 'incoming' | 'outgoing' | null
  participants: RtcCallParticipant[]
  incomingFrom?: RtcCallParticipant | null
  error?: string | null
  isMuted: boolean
  isCameraOff: boolean
  isScreenSharing: boolean
  focusedUserId: string | null
  audioInputDevices: Array<{ deviceId: string; label: string }>
  videoInputDevices: Array<{ deviceId: string; label: string }>
  selectedAudioInputId: string | null
  selectedVideoInputId: string | null
}

export const useCallStore = defineStore('call', {
  state: (): CallState => ({
    callId: null,
    conversationId: null,
    callType: null,
    mode: null,
    status: 'idle',
    connectionQuality: 'unknown',
    preferredQuality: 'auto',
    direction: null,
    participants: [],
    incomingFrom: null,
    error: null,
    isMuted: false,
    isCameraOff: false,
    isScreenSharing: false,
    focusedUserId: null,
    audioInputDevices: [],
    videoInputDevices: [],
    selectedAudioInputId: null,
    selectedVideoInputId: null
  }),

  actions: {
    reset() {
      this.callId = null
      this.conversationId = null
      this.callType = null
      this.mode = null
      this.status = 'idle'
      this.connectionQuality = 'unknown'
      this.preferredQuality = 'auto'
      this.direction = null
      this.participants = []
      this.incomingFrom = null
      this.error = null
      this.isMuted = false
      this.isCameraOff = false
      this.isScreenSharing = false
      this.focusedUserId = null
      this.audioInputDevices = []
      this.videoInputDevices = []
      this.selectedAudioInputId = null
      this.selectedVideoInputId = null
    },

    setSession(payload: {
      callId: string
      conversationId: string
      callType: RtcCallType
      mode: RtcCallMode
      direction: 'incoming' | 'outgoing'
    }) {
      this.callId = payload.callId
      this.conversationId = payload.conversationId
      this.callType = payload.callType
      this.mode = payload.mode
      this.direction = payload.direction
    },

    setStatus(status: RtcCallStatus) {
      this.status = status
    },

    setConnectionQuality(quality: CallState['connectionQuality']) {
      this.connectionQuality = quality
    },

    setPreferredQuality(quality: CallState['preferredQuality']) {
      this.preferredQuality = quality
    },

    setParticipants(participants: RtcCallParticipant[]) {
      this.participants = participants
    },

    upsertParticipant(participant: RtcCallParticipant) {
      const index = this.participants.findIndex(p => p.userId === participant.userId)
      if (index === -1) {
        this.participants.push(participant)
        return
      }
      this.participants[index] = { ...this.participants[index], ...participant }
    },

    removeParticipant(userId: string) {
      this.participants = this.participants.filter(p => p.userId !== userId)
    },

    setIncoming(fromUser: RtcCallParticipant | null) {
      this.incomingFrom = fromUser
    },

    setMediaState(payload: Partial<Pick<CallState, 'isMuted' | 'isCameraOff' | 'isScreenSharing'>>) {
      this.isMuted = payload.isMuted ?? this.isMuted
      this.isCameraOff = payload.isCameraOff ?? this.isCameraOff
      this.isScreenSharing = payload.isScreenSharing ?? this.isScreenSharing
    },

    setFocusedUserId(userId: string | null) {
      this.focusedUserId = userId
    },

    setDevices(payload: {
      audioInputs: Array<{ deviceId: string; label: string }>
      videoInputs: Array<{ deviceId: string; label: string }>
    }) {
      this.audioInputDevices = payload.audioInputs
      this.videoInputDevices = payload.videoInputs
    },

    setSelectedDevices(payload: { audioInputId?: string | null; videoInputId?: string | null }) {
      if (payload.audioInputId !== undefined) {
        this.selectedAudioInputId = payload.audioInputId
      }
      if (payload.videoInputId !== undefined) {
        this.selectedVideoInputId = payload.videoInputId
      }
    },

    setError(message: string | null) {
      this.error = message
    }
  }
})
