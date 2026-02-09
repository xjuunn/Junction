import { storeToRefs } from 'pinia'
import type { StartCallOptions } from '~/core/rtc/call-manager'
import { CallManager } from '~/core/rtc/call-manager'

export const useCall = () => {
  const manager = CallManager.getInstance()
  manager.init()
  const store = useCallStore()
  const state = storeToRefs(store)

  return {
    manager,
    state,
    localStream: manager.getLocalStream(),
    remoteStreams: manager.getRemoteStreams(),
    startCall: (options: StartCallOptions) => manager.startCall(options),
    acceptCall: () => manager.acceptCall(),
    rejectCall: () => manager.rejectCall(),
    cancelCall: () => manager.cancelCall(),
    leaveCall: () => manager.leaveCall(),
    toggleMute: () => manager.toggleMute(),
    toggleCamera: () => manager.toggleCamera(),
    toggleScreenShare: () => manager.toggleScreenShare(),
    refreshDevices: () => manager.refreshDevices(),
    switchAudioInput: (deviceId: string) => manager.switchAudioInput(deviceId),
    switchVideoInput: (deviceId: string) => manager.switchVideoInput(deviceId),
    setFocusUser: (userId: string | null) => manager.setFocusUser(userId),
    setPreferredQuality: (level: 'auto' | 'high' | 'medium' | 'low') => manager.setPreferredQuality(level)
  }
}
