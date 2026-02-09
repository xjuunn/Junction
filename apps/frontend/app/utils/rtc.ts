import type { RtcCallType } from '@junction/types'

export const createCallId = () => {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID()
  }
  return `call_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`
}

export const getRtcIceServers = (): RTCIceServer[] => {
  try {
    const config = useRuntimeConfig()
    const raw = config.public?.rtcIceServers as unknown
    if (Array.isArray(raw)) return raw as RTCIceServer[]
    if (typeof raw === 'string' && raw.trim()) {
      const parsed = JSON.parse(raw)
      if (Array.isArray(parsed)) return parsed
    }
  } catch (error) {
    console.warn('[RTC] 读取 ICE 配置失败', error)
  }
  return [
    { urls: ['stun:stun.l.google.com:19302', 'stun:stun1.l.google.com:19302'] }
  ]
}

export const getMediaConstraints = (callType: RtcCallType): MediaStreamConstraints => ({
  audio: {
    echoCancellation: true,
    noiseSuppression: true,
    autoGainControl: true
  },
  video: callType === 'video' ? {
    width: { ideal: 1280 },
    height: { ideal: 720 },
    frameRate: { ideal: 30, max: 60 }
  } : false
})

export const stopMediaStream = (stream?: MediaStream | null) => {
  if (!stream) return
  stream.getTracks().forEach(track => track.stop())
}
