import type { AiBotService } from '@junction/backend/src/resource/ai-bot/ai-bot.service'

const base = '/ai-bot'

export function createBot(data: Parameters<AiBotService['createBot']>[1]) {
  return api.post<AwaitedReturnType<AiBotService['createBot']>>(base, data)
}

export function updateBot(id: string, data: Parameters<AiBotService['updateBot']>[2]) {
  return api.patch<AwaitedReturnType<AiBotService['updateBot']>>(`${base}/${id}`, data)
}

export function listBots(params?: {
  page?: number
  limit?: number
  keyword?: string
  mine?: boolean
  visibility?: string
  includeDisabled?: boolean
}) {
  return api.get<AwaitedReturnType<AiBotService['listBots']>>(base, params)
}

export function findBot(id: string) {
  return api.get<AwaitedReturnType<AiBotService['findOne']>>(`${base}/${id}`)
}
