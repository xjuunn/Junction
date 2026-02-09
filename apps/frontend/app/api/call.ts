import type { CallController } from '@junction/backend/src/resource/call/call.controller'

const base = '/call'

export function getLiveKitToken(data: { callId: string; conversationId: string }) {
  return api.post<AwaitedReturnType<CallController['getLiveKitToken']>>(`${base}/livekit/token`, data)
}
