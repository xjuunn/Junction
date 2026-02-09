import { ref } from 'vue'
import type { Ref } from 'vue'
import type {
  RtcCallInvite,
  RtcCallJoined,
  RtcCallMode,
  RtcCallParticipant,
  RtcCallParticipantEvent,
  RtcCallParticipantLeft,
  RtcCallSignal,
  RtcCallType
} from '@junction/types'
import {
  ConnectionState,
  Room,
  RoomEvent,
  Track,
  createLocalAudioTrack,
  createLocalScreenTracks,
  createLocalVideoTrack,
  type LocalAudioTrack,
  type LocalTrack,
  type LocalVideoTrack
} from 'livekit-client'
import { createCallId, stopMediaStream } from '~/utils/rtc'
import * as messageApi from '~/api/message'
import * as callApi from '~/api/call'
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

  private localStream: Ref<MediaStream | null> = ref(null)
  private remoteStreams: Ref<Record<string, MediaStream | null>> = ref({})

  private room: Room | null = null
  private roomConnecting: Promise<void> | null = null
  private roomBound = false

  private localAudioTrack: LocalAudioTrack | null = null
  private localVideoTrack: LocalVideoTrack | null = null
  private screenTrack: LocalVideoTrack | null = null
  private resumeCameraAfterScreen = false

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
    this.store.setMediaState({ isMuted: true, isCameraOff: true, isScreenSharing: false })
    this.store.setParticipants([this.getLocalParticipant()])
    await this.createCallMessage('start')
    this.socket.emit('call-start', {
      callId,
      conversationId: options.conversationId,
      callType: options.callType,
      mode: options.mode,
      targetUserIds: options.targetUserIds
    })
    await this.connectRoomIfNeeded()
  }

  async acceptCall() {
    if (!this.store.callId || !this.store.callType || !this.store.conversationId) return
    this.store.setStatus('connecting')
    this.store.setIncoming(null)
    this.store.upsertParticipant(this.getLocalParticipant())
    this.store.setMediaState({ isMuted: true, isCameraOff: true, isScreenSharing: false })
    await this.createCallMessage('accept')
    this.socket.emit('call-accept', { callId: this.store.callId })
    await this.connectRoomIfNeeded()
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

  async toggleMute() {
    await this.connectRoomIfNeeded()
    if (this.localAudioTrack) {
      await this.disableAudioTrack()
      return
    }
    await this.enableAudioTrack()
  }

  async toggleCamera() {
    await this.connectRoomIfNeeded()
    if (this.store.isScreenSharing) {
      await this.stopScreenShare()
    }
    if (this.localVideoTrack) {
      await this.disableVideoTrack()
      return
    }
    await this.enableVideoTrack()
  }

  async toggleScreenShare() {
    await this.connectRoomIfNeeded()
    if (this.store.isScreenSharing) {
      await this.stopScreenShare()
      return
    }
    await this.startScreenShare()
  }

  private async connectRoomIfNeeded() {
    if (!this.store.callId || !this.store.conversationId) return
    if (this.room?.connectionState === ConnectionState.Connected) return
    if (this.roomConnecting) return this.roomConnecting
    this.roomConnecting = this.connectRoom(this.store.callId, this.store.conversationId)
    await this.roomConnecting
    this.roomConnecting = null
  }

  private async connectRoom(callId: string, conversationId: string) {
    try {
      const room = this.ensureRoom()
      const res = await callApi.getLiveKitToken({ callId, conversationId })
      await room.connect(res.data.url, res.data.token, { autoSubscribe: true })
    } catch (error) {
      console.error('[RTC] livekit connect failed', error)
      this.store.setStatus('error')
      this.toast.error('通话连接失败')
    }
  }

  private ensureRoom() {
    if (this.room) return this.room
    const room = new Room({
      adaptiveStream: true,
      dynacast: true,
    })
    this.room = room
    this.bindRoomEvents(room)
    return room
  }

  private bindRoomEvents(room: Room) {
    if (this.roomBound) return
    this.roomBound = true
    room.on(RoomEvent.ParticipantConnected, participant => {
      console.info('[RTC] participant connected', { userId: participant.identity })
    })
    room.on(RoomEvent.ParticipantDisconnected, participant => {
      console.info('[RTC] participant disconnected', { userId: participant.identity })
      this.clearRemoteStream(participant.identity)
    })
    room.on(RoomEvent.TrackSubscribed, (track, _pub, participant) => {
      if (!participant?.identity) return
      if (track.kind !== Track.Kind.Video && track.kind !== Track.Kind.Audio) return
      const mediaTrack = track.mediaStreamTrack
      if (!mediaTrack) return
      this.addRemoteTrack(participant.identity, mediaTrack)
    })
    room.on(RoomEvent.TrackUnsubscribed, (track, _pub, participant) => {
      if (!participant?.identity) return
      if (!track?.mediaStreamTrack) return
      this.removeRemoteTrack(participant.identity, track.mediaStreamTrack)
    })
    room.on(RoomEvent.Disconnected, () => {
      console.info('[RTC] room disconnected')
      this.clearAllRemoteStreams()
    })
  }

  private addRemoteTrack(userId: string, track: MediaStreamTrack) {
    const stream = this.remoteStreams.value[userId] ?? new MediaStream()
    if (!stream.getTracks().includes(track)) {
      stream.addTrack(track)
    }
    this.remoteStreams.value = {
      ...this.remoteStreams.value,
      [userId]: stream
    }
  }

  private removeRemoteTrack(userId: string, track: MediaStreamTrack) {
    const stream = this.remoteStreams.value[userId]
    if (!stream) return
    stream.removeTrack(track)
    if (!stream.getTracks().length) {
      const next = { ...this.remoteStreams.value }
      delete next[userId]
      this.remoteStreams.value = next
      return
    }
    this.remoteStreams.value = {
      ...this.remoteStreams.value,
      [userId]: stream
    }
  }

  private clearRemoteStream(userId: string) {
    const next = { ...this.remoteStreams.value }
    delete next[userId]
    this.remoteStreams.value = next
  }

  private clearAllRemoteStreams() {
    this.remoteStreams.value = {}
  }

  private async enableAudioTrack() {
    try {
      const track = await createLocalAudioTrack()
      if (track.mediaStreamTrack) {
        track.mediaStreamTrack.enabled = true
      }
      await this.publishTrack(track, Track.Source.Microphone)
      this.localAudioTrack = track
      this.store.setMediaState({ isMuted: false })
      this.updateLocalStream()
    } catch (error) {
      console.error('[RTC] enable audio failed', error)
      this.toast.error('无法访问麦克风')
    }
  }

  private async disableAudioTrack() {
    if (!this.localAudioTrack) return
    await this.unpublishTrack(this.localAudioTrack)
    this.localAudioTrack = null
    this.store.setMediaState({ isMuted: true })
    this.updateLocalStream()
  }

  private async enableVideoTrack() {
    try {
      const track = await createLocalVideoTrack()
      if (track.mediaStreamTrack) {
        track.mediaStreamTrack.enabled = true
      }
      await this.publishTrack(track, Track.Source.Camera)
      this.localVideoTrack = track
      this.store.setMediaState({ isCameraOff: false })
      this.updateLocalStream()
    } catch (error) {
      console.error('[RTC] enable video failed', error)
      this.toast.error('无法访问摄像头')
    }
  }

  private async disableVideoTrack() {
    if (!this.localVideoTrack) return
    await this.unpublishTrack(this.localVideoTrack)
    this.localVideoTrack = null
    this.store.setMediaState({ isCameraOff: true })
    this.updateLocalStream()
  }

  private async startScreenShare() {
    try {
      const tracks = await createLocalScreenTracks({ audio: false })
      const screen = tracks.find(t => t.kind === Track.Kind.Video) as LocalVideoTrack | undefined
      if (!screen) return
      if (screen.mediaStreamTrack) {
        screen.mediaStreamTrack.enabled = true
      }
      this.resumeCameraAfterScreen = !!this.localVideoTrack
      if (this.localVideoTrack) {
        await this.disableVideoTrack()
      }
      this.screenTrack = screen
      this.screenTrack.mediaStreamTrack.addEventListener('ended', () => {
        this.stopScreenShare()
      })
      await this.publishTrack(screen, Track.Source.ScreenShare)
      this.store.setMediaState({ isScreenSharing: true, isCameraOff: true })
      this.updateLocalStream()
    } catch (error) {
      console.error('[RTC] screen share failed', error)
      this.toast.error('屏幕共享失败')
    }
  }

  private async stopScreenShare() {
    if (!this.screenTrack) return
    await this.unpublishTrack(this.screenTrack)
    this.screenTrack = null
    this.store.setMediaState({ isScreenSharing: false })
    if (this.resumeCameraAfterScreen) {
      this.resumeCameraAfterScreen = false
      await this.enableVideoTrack()
      return
    }
    this.updateLocalStream()
  }

  private async publishTrack(track: LocalTrack, source: Track.Source) {
    await this.connectRoomIfNeeded()
    const room = this.room
    if (!room) return
    await room.localParticipant.publishTrack(track, { source })
  }

  private async unpublishTrack(track: LocalTrack) {
    const room = this.room
    if (room) {
      room.localParticipant.unpublishTrack(track, true)
    }
    track.stop()
  }

  private updateLocalStream() {
    const tracks: MediaStreamTrack[] = []
    if (this.localAudioTrack?.mediaStreamTrack) {
      tracks.push(this.localAudioTrack.mediaStreamTrack)
    }
    const videoTrack = this.screenTrack?.mediaStreamTrack ?? this.localVideoTrack?.mediaStreamTrack
    if (videoTrack) {
      tracks.push(videoTrack)
    }
    this.localStream.value = tracks.length ? new MediaStream(tracks) : null
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
    this.store.setMediaState({ isMuted: true, isCameraOff: true, isScreenSharing: false })
  }

  private handleJoined(payload: RtcCallJoined) {
    if (payload.callId !== this.store.callId) return
    this.store.setParticipants(payload.participants)
    const hasRemote = payload.participants.some(p => p.userId !== this.currentUserId())
    this.store.setStatus(hasRemote ? 'connecting' : this.store.status)
    if (hasRemote) {
      this.store.setStatus('in-call')
    }
    this.connectRoomIfNeeded()
  }

  private handleParticipantJoined(payload: RtcCallParticipantEvent) {
    if (payload.callId !== this.store.callId) return
    this.store.upsertParticipant(payload.participant)
    if (this.store.status === 'ringing' || this.store.status === 'connecting') {
      this.store.setStatus('in-call')
    }
    this.connectRoomIfNeeded()
  }

  private handleParticipantLeft(payload: RtcCallParticipantLeft) {
    if (payload.callId !== this.store.callId) return
    this.store.removeParticipant(payload.userId)
    this.clearRemoteStream(payload.userId)
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

  private handleSignal(_payload: RtcCallSignal) {
  }

  private cleanup() {
    this.teardownRoom()
    this.stopLocalTracks()
    this.clearAllRemoteStreams()
    stopMediaStream(this.localStream.value)
    this.localStream.value = null
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
      console.warn('[RTC] create call message failed', error)
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

  private getLocalParticipant(): RtcCallParticipant {
    const user = this.userStore.user.value
    return {
      userId: user?.id || 'me',
      name: user?.name,
      image: user?.image,
      isLocal: true
    }
  }

  private async teardownRoom() {
    if (!this.room) return
    try {
      this.room.removeAllListeners()
      await this.room.disconnect()
    } catch {
    }
    this.room = null
    this.roomBound = false
    this.roomConnecting = null
  }

  private stopLocalTracks() {
    if (this.localAudioTrack) {
      this.localAudioTrack.stop()
      this.localAudioTrack = null
    }
    if (this.localVideoTrack) {
      this.localVideoTrack.stop()
      this.localVideoTrack = null
    }
    if (this.screenTrack) {
      this.screenTrack.stop()
      this.screenTrack = null
    }
    this.resumeCameraAfterScreen = false
  }
}
