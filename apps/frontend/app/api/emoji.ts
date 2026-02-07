import type { EmojiController } from '@junction/backend/src/resource/emoji/emoji.controller'
import type { PrismaTypes, PrismaValues } from '@junction/types'

const base = '/emoji'

/**
 * 获取表情分类
 */
export function getCategories(status?: PrismaValues.EmojiCategoryStatus | 'ALL') {
  return api.get<AwaitedReturnType<EmojiController['listCategories']>>(`${base}/categories`, {
    status
  })
}

/**
 * 创建表情分类
 */
export function createCategory(data: { name: string; description?: string; sortOrder?: number }) {
  return api.post<AwaitedReturnType<EmojiController['createCategory']>>(`${base}/categories`, data)
}

/**
 * 更新表情分类
 */
export function updateCategory(id: string, data: {
  name?: string
  description?: string
  sortOrder?: number
  status?: PrismaValues.EmojiCategoryStatus
}) {
  return api.patch<AwaitedReturnType<EmojiController['updateCategory']>>(`${base}/categories/${id}`, data)
}

/**
 * 删除表情分类
 */
export function removeCategory(id: string) {
  return api.delete<AwaitedReturnType<EmojiController['removeCategory']>>(`${base}/categories/${id}`)
}

/**
 * 获取表情列表
 */
export function findAll(params: PaginationOptions & {
  keyword?: string
  categoryId?: string
  status?: PrismaValues.EmojiStatus | 'ALL'
}) {
  return api.get<AwaitedReturnType<EmojiController['listEmojis']>>(base, params)
}

/**
 * 从消息创建表情
 */
export function createFromMessage(data: {
  messageId: string
  name: string
  categoryId?: string
  description?: string
  keywords?: string | string[]
}) {
  return api.post<AwaitedReturnType<EmojiController['createFromMessage']>>(`${base}/from-message`, data)
}

/**
 * 创建表情
 */
export function createEmoji(data: {
  name: string
  imageUrl: string
  categoryId?: string
  description?: string
  keywords?: string | string[]
}) {
  return api.post<AwaitedReturnType<EmojiController['createEmoji']>>(base, data)
}

/**
 * 更新表情
 */
export function updateEmoji(id: string, data: {
  name?: string
  description?: string
  keywords?: string | string[]
  imageUrl?: string
  categoryId?: string | null
  status?: PrismaValues.EmojiStatus
  sortOrder?: number
  usageCount?: number
}) {
  return api.patch<AwaitedReturnType<EmojiController['updateEmoji']>>(`${base}/${id}`, data)
}

/**
 * 置顶表情
 */
export function pinEmoji(id: string) {
  return api.patch<AwaitedReturnType<EmojiController['pinEmoji']>>(`${base}/${id}/pin`)
}

/**
 * 隐藏表情
 */
export function hideEmoji(id: string) {
  return api.patch<AwaitedReturnType<EmojiController['hideEmoji']>>(`${base}/${id}/hide`)
}

/**
 * 更新表情排序
 */
export function updateEmojiOrder(id: string, sortOrder: number) {
  return api.patch<AwaitedReturnType<EmojiController['updateEmojiOrder']>>(`${base}/${id}/order`, { sortOrder })
}

/**
 * 删除表情
 */
export function removeEmoji(id: string) {
  return api.delete<AwaitedReturnType<EmojiController['removeEmoji']>>(`${base}/${id}`)
}

export type EmojiItem = PrismaTypes.Emoji
export type EmojiCategoryItem = PrismaTypes.EmojiCategory
