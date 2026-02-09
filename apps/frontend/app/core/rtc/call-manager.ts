import { shallowRef } from 'vue'
import type { ShallowRef } from 'vue'
import type { RtcCallInvite, RtcCallJoined, RtcCallMode, RtcCallParticipant, RtcCallParticipantEvent, RtcCallParticipantLeft, RtcCallSignal, RtcCallType } from '@junction/types'
import { createCallId, getMediaConstraints, getRtcIceServers, stopMediaStream } from '~/utils/rtc'
import * as messageApi from '~/api/message'
import { MessageType } from '~/api/message'

export interface StartCallOptions {
  conversationId: string
  callType: RtcCallType
  mode: RtcCallMode
  targetUserIds?: string[]
}

export class CallManager {
  private static instance: CallManager | null = null
  private socket = useSocket('app')
  private store = useCallStore()
  private userStore = useUserStore()
  private toast = useToast()
  private initialized = false

  private localStream: ShallowRef<MediaStream | null> = shallowRef(null)
  private remoteStreams: ShallowRef<Record<string, MediaStream | null>> = shallowRef({})
  private screenStream: ShallowRef<MediaStream | null> = shallowRef(null)
  private peerConnections = new Map<string, RTCPeerConnection>()
  private disposers: Array<() => void> = []

  static getInstance() {
    if (!CallManager.instance) {
      CallManager.instance = new CallManager()
    }
    return CallManager.instance
  }

  init() {
    if (this.initialized || process.server) return
    this.initialized = true
    this.disposers.push(
      this.socket.on('call-incoming', payload => this.handleIncoming(payload)),
      this.socket.on('call-joined', payload => this.handleJoined(payload)),
      this.socket.on('call-participant-joined', payload => this.handleParticipantJoined(payload)),
      this.socket.on('call-participant-left', payload => this.handleParticipantLeft(payload)),
      this.socket.on('call-ended', payload => this.handleEnded(payload)),
      this.socket.on('call-rejected', payload => this.handleRejected(payload)),
      this.socket.on('call-canceled', payload => this.handleCanceled(payload)),
      this.socket.on('call-signal', payload => this.handleSignal(payload))
    )
  }

  getLocalStream() {
    return this.localStream
  }

  getRemoteStreams() {
    return this.remoteStreams
  }

  async startCall(options: StartCallOptions) {
    this.init()
    if (!this.ensureIdle()) return
    const callId = createCallId()
    this.store.setSession({
      callId,
      conversationId: options.conversationId,
      callType: options.callType,
      mode: options.mode,
      direction: 'outgoing'
    })
    this.store.setStatus('ringing')
    this.ensureLocalStream()
    this.store.setParticipants([this.getLocalParticipant()])
    await this.createCallMessage('start')
    this.socket.emit('call-start', {
      callId,
      conversationId: options.conversationId,
      callType: options.callType,
      mode: options.mode,
      targetUserIds: options.targetUserIds
    })
  }

  async acceptCall() {
    if (!this.store.callId || !this.store.callType) return
    this.ensureLocalStream()
    this.store.setStatus('connecting')
    this.store.setIncoming(null)
    this.store.upsertParticipant(this.getLocalParticipant())
    await this.createCallMessage('accept')
    this.socket.emit('call-accept', { callId: this.store.callId })
  }

  rejectCall() {
    if (!this.store.callId) return
    this.socket.emit('call-reject', { callId: this.store.callId })
    this.cleanup()
  }

  cancelCall() {
    if (!this.store.callId) return
    this.socket.emit('call-cancel', { callId: this.store.callId })
    this.cleanup()
  }

  leaveCall() {
    if (!this.store.callId) return
    this.socket.emit('call-leave', { callId: this.store.callId })
    this.cleanup()
  }

  toggleMute() {
    this.ensureLocalStream()
    const stream = this.localStream.value
    if (!stream) return
    const audioTracks = stream.getAudioTracks()
    if (!audioTracks.length) {
      this.enableAudioTrack()
      return
    }
    const nextEnabled = audioTracks.some(track => !track.enabled)
    audioTracks.forEach(track => {
      track.enabled = nextEnabled
      if (!nextEnabled) {
        track.stop()
        stream.removeTrack(track)
      }
    })
    this.updateSenders('audio', nextEnabled ? audioTracks[0] : null)
    this.store.setMediaState({ isMuted: !nextEnabled })
  }

  toggleCamera() {
    this.ensureLocalStream()
    const stream = this.localStream.value
    if (!stream) return
    const videoTracks = stream.getVideoTracks()
    if (!videoTracks.length) {
      this.enableVideoTrack()
      return
    }
    const nextEnabled = videoTracks.some(track => !track.enabled)
    videoTracks.forEach(track => {
      track.enabled = nextEnabled
      if (!nextEnabled) {
        track.stop()
        stream.removeTrack(track)
      }
    })
    this.updateSenders('video', nextEnabled ? videoTracks[0] : null)
    this.store.setMediaState({ isCameraOff: !nextEnabled })
  }

  async toggleScreenShare() {
    if (this.store.isScreenSharing) {
      await this.stopScreenShare()
      return
    }
    await this.startScreenShare()
  }

  async startScreenShare() {
    if (!navigator.mediaDevices?.getDisplayMedia) {
      this.toast.error('当前环境不支持屏幕共享')
      return
    }
    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: false })
      this.screenStream.value = stream
      this.store.setMediaState({ isScreenSharing: true })
      const screenTrack = stream.getVideoTracks()[0]
      screenTrack.addEventListener('ended', () => {
        this.stopScreenShare()
      })
      await this.replaceVideoTrack(screenTrack)
    } catch (error) {
      console.error('[RTC] 屏幕共享失败', error)
      this.toast.error('屏幕共享失败')
    }
  }

  async stopScreenShare() {
    stopMediaStream(this.screenStream.value)
    this.screenStream.value = null
    this.store.setMediaState({ isScreenSharing: false })
    const localTrack = this.localStream.value?.getVideoTracks()[0]
    if (localTrack) {
      await this.replaceVideoTrack(localTrack)
    } else {
      this.updateSenders('video', null)
    }
  }

  private async replaceVideoTrack(track: MediaStreamTrack) {
    this.ensureLocalStream()
    const stream = this.localStream.value!
    const existing = stream.getVideoTracks()
    existing.forEach(t => {
      if (t !== track) stream.removeTrack(t)
    })
    if (!stream.getVideoTracks().includes(track)) {
      stream.addTrack(track)
    }
    this.peerConnections.forEach(pc => {
      const sender = pc.getSenders().find(s => s.track?.kind === 'video')
      if (sender) {
        sender.replaceTrack(track)
        return
      }
      pc.addTrack(track, stream)
    })
  }

  private ensureLocalStream() {
    if (this.localStream.value) return
    this.localStream.value = new MediaStream()
    this.store.setMediaState({
      isMuted: true,
      isCameraOff: true
    })
  }

  private handleIncoming(payload: RtcCallInvite) {
    this.init()
    if (!this.ensureIdle()) {
      this.socket.emit('call-reject', { callId: payload.callId })
      return
    }
    this.store.setSession({
      callId: payload.callId,
      conversationId: payload.conversationId,
      callType: payload.callType,
      mode: payload.mode,
      direction: 'incoming'
    })
    this.store.setIncoming(payload.fromUser)
    this.store.setStatus('ringing')
    this.store.setParticipants([payload.fromUser])
  }

  private handleJoined(payload: RtcCallJoined) {
    if (payload.callId !== this.store.callId) return
    this.store.setParticipants(payload.participants)
    const hasRemote = payload.participants.some(p => p.userId !== this.currentUserId())
    this.store.setStatus(hasRemote ? 'connecting' : this.store.status)
    payload.participants.forEach(participant => {
      if (participant.userId === this.currentUserId()) return
      this.ensurePeerConnection(participant.userId)
      if (this.shouldCreateOffer(participant.userId)) {
        this.createOffer(participant.userId)
      }
    })
    if (hasRemote) {
      this.store.setStatus('in-call')
    }
  }

  private handleParticipantJoined(payload: RtcCallParticipantEvent) {
    if (payload.callId !== this.store.callId) return
    this.store.upsertParticipant(payload.participant)
    const userId = payload.participant.userId
    if (userId === this.currentUserId()) return
    if (this.store.status === 'ringing' || this.store.status === 'connecting') {
      this.store.setStatus('in-call')
    }
    this.ensurePeerConnection(userId)
    if (this.shouldCreateOffer(userId)) {
      this.createOffer(userId)
    }
  }

  private handleParticipantLeft(payload: RtcCallParticipantLeft) {
    if (payload.callId !== this.store.callId) return
    this.store.removeParticipant(payload.userId)
    this.cleanupPeer(payload.userId)
  }

  private handleEnded(payload: { callId: string; reason: string }) {
    if (payload.callId !== this.store.callId) return
    this.cleanup()
  }

  private handleRejected(payload: { callId: string; userId: string }) {
    if (payload.callId !== this.store.callId) return
    this.store.removeParticipant(payload.userId)
  }

  private handleCanceled(payload: { callId: string }) {
    if (payload.callId !== this.store.callId) return
    this.cleanup()
  }

  private async handleSignal(payload: RtcCallSignal) {
    if (payload.callId !== this.store.callId) return
    const fromUserId = payload.fromUserId
    this.ensureLocalStream()
    this.ensurePeerConnection(fromUserId)
    const pc = this.peerConnections.get(fromUserId)
    if (!pc) return
    const data = payload.data
    if (data.type === 'offer') {
      await pc.setRemoteDescription(data.sdp!)
      const answer = await pc.createAnswer()
      await pc.setLocalDescription(answer)
      this.socket.emit('call-signal', {
        callId: payload.callId,
        toUserId: fromUserId,
        data: { type: 'answer', sdp: pc.localDescription! }
      })
      return
    }
    if (data.type === 'answer') {
      await pc.setRemoteDescription(data.sdp!)
      return
    }
    if (data.type === 'ice' && data.candidate) {
      try {
        await pc.addIceCandidate(data.candidate)
      } catch (error) {
        console.warn('[RTC] ICE 处理失败', error)
      }
    }
  }

  private ensurePeerConnection(userId: string) {
    if (this.peerConnections.has(userId)) return
    const pc = new RTCPeerConnection({ iceServers: getRtcIceServers() })
    const local = this.localStream.value
    if (local) {
      local.getTracks().forEach(track => pc.addTrack(track, local))
    }
    pc.onnegotiationneeded = () => {
      if (pc.signalingState !== 'stable') return
      this.createOffer(userId)
    }
    pc.onicecandidate = event => {
      if (!event.candidate || !this.store.callId) return
      this.socket.emit('call-signal', {
        callId: this.store.callId,
        toUserId: userId,
        data: { type: 'ice', candidate: event.candidate }
      })
    }
    pc.ontrack = event => {
      const [stream] = event.streams
      if (!stream) return
      this.remoteStreams.value = {
        ...this.remoteStreams.value,
        [userId]: stream
      }
    }
    this.peerConnections.set(userId, pc)
  }

  private async createOffer(userId: string) {
    const pc = this.peerConnections.get(userId)
    if (!pc || !this.store.callId) return
    if (pc.signalingState !== 'stable') return
    const offer = await pc.createOffer()
    await pc.setLocalDescription(offer)
    this.socket.emit('call-signal', {
      callId: this.store.callId,
      toUserId: userId,
      data: { type: 'offer', sdp: pc.localDescription! }
    })
  }

  private cleanupPeer(userId: string) {
    const pc = this.peerConnections.get(userId)
    if (pc) {
      pc.onicecandidate = null
      pc.ontrack = null
      pc.close()
    }
    this.peerConnections.delete(userId)
    const next = { ...this.remoteStreams.value }
    delete next[userId]
    this.remoteStreams.value = next
  }
  private async enableAudioTrack() {
    if (!navigator.mediaDevices?.getUserMedia) {
      this.toast.error('当前环境不支持麦克风')
      return
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false })
      const track = stream.getAudioTracks()[0]
      if (!track) return
      this.attachTrack(track)
      this.store.setMediaState({ isMuted: false })
    } catch (error) {
      console.error('[RTC] 获取麦克风失败', error)
      this.toast.error('无法访问麦克风')
    }
  }
  private async enableVideoTrack() {
    if (!navigator.mediaDevices?.getUserMedia) {
      this.toast.error('当前环境不支持摄像头')
      return
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: false, video: getMediaConstraints('video').video || true })
      const track = stream.getVideoTracks()[0]
      if (!track) return
      this.attachTrack(track)
      this.store.setMediaState({ isCameraOff: false })
    } catch (error) {
      console.error('[RTC] 获取摄像头失败', error)
      this.toast.error('无法访问摄像头')
    }
  }

  private attachTrack(track: MediaStreamTrack) {
    this.ensureLocalStream()
    const stream = this.localStream.value!
    if (!stream.getTracks().includes(track)) {
      stream.addTrack(track)
    }
    this.peerConnections.forEach(pc => {
      const sender = pc.getSenders().find(s => s.track?.kind === track.kind)
      if (sender) {
        sender.replaceTrack(track)
      } else {
        pc.addTrack(track, stream)
      }
    })
    this.peerConnections.forEach((_, userId) => {
      this.createOffer(userId)
    })
  }

  private updateSenders(kind: 'audio' | 'video', track: MediaStreamTrack | null) {
    this.peerConnections.forEach(pc => {
      const sender = pc.getSenders().find(s => s.track?.kind === kind)
      if (sender) {
        sender.replaceTrack(track)
        return
      }
      if (track && this.localStream.value) {
        pc.addTrack(track, this.localStream.value)
      }
    })
    this.peerConnections.forEach((_, userId) => {
      this.createOffer(userId)
    })
  }

  private cleanup() {
    this.peerConnections.forEach((_, userId) => this.cleanupPeer(userId))
    stopMediaStream(this.localStream.value)
    stopMediaStream(this.screenStream.value)
    this.localStream.value = null
    this.screenStream.value = null
    this.remoteStreams.value = {}
    this.store.reset()
  }
  private async createCallMessage(action: 'start' | 'accept') {
    if (!this.store.conversationId || !this.store.callId || !this.store.callType) return
    const actionText = action === 'start' ? '发起了' : '接听了'
    const typeText = this.store.callType === 'video' ? '视频通话' : '语音通话'
    try {
      await messageApi.send({
        conversationId: this.store.conversationId,
        type: MessageType.NOTICE,
        content: `${actionText}${typeText}`,
        payload: {
          action,
          callId: this.store.callId,
          callType: this.store.callType
        }
      })
    } catch (error) {
      console.warn('[RTC] 创建通话消息失败', error)
    }
  }

  private ensureIdle() {
    if (this.store.status !== 'idle') {
      this.toast.warning('已有通话正在进行')
      return false
    }
    return true
  }

  private currentUserId() {
    return this.userStore.user.value?.id ?? ''
  }

  private shouldCreateOffer(remoteUserId: string) {
    const me = this.currentUserId()
    if (!me) return false
    return me < remoteUserId
  }

  private getLocalParticipant(): RtcCallParticipant {
    const user = this.userStore.user.value
    return {
      userId: user?.id || 'me',
      name: user?.name,
      image: user?.image,
      isLocal: true
    }
  }

  
}
