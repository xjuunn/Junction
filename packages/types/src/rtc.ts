export type RtcCallType = 'audio' | 'video'

export type RtcCallMode = 'PRIVATE' | 'GROUP'

export type RtcCallStatus = 'idle' | 'ringing' | 'connecting' | 'in-call' | 'ending' | 'ended' | 'error'

export type RtcSignalKind = 'offer' | 'answer' | 'ice'

export interface RtcUserProfile {
  userId: string
  name?: string | null
  image?: string | null
}

export interface RtcCallInvite {
  callId: string
  conversationId: string
  callType: RtcCallType
  mode: RtcCallMode
  fromUser: RtcUserProfile
}

export interface RtcCallParticipant extends RtcUserProfile {
  isLocal?: boolean
}

export interface RtcCallJoined {
  callId: string
  participants: RtcCallParticipant[]
}

export interface RtcCallParticipantEvent {
  callId: string
  participant: RtcCallParticipant
}

export interface RtcCallParticipantLeft {
  callId: string
  userId: string
}

export interface RtcCallEnded {
  callId: string
  reason: 'hangup' | 'canceled' | 'rejected' | 'timeout' | 'disconnected' | 'ended'
  endedBy?: string
}

export interface RtcCallRejected {
  callId: string
  userId: string
}

export interface RtcCallCanceled {
  callId: string
}

export interface RtcCallSignalData {
  type: RtcSignalKind
  sdp?: {
    type: 'offer' | 'answer'
    sdp?: string
  }
  candidate?: {
    candidate?: string
    sdpMid?: string | null
    sdpMLineIndex?: number | null
    usernameFragment?: string | null
  }
}

export interface RtcCallSignal {
  callId: string
  fromUserId: string
  toUserId: string
  data: RtcCallSignalData
}
