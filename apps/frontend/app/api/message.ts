import type { MessageService } from '@junction/backend/src/resource/message/message.service'
import type { PrismaTypes } from '@junction/types'

const base = '/message'

/**
 * 批量删除消息
 */
export function bulkDelete(ids: string[]) {
    // 企业级修复：Axios 的 delete 方法第二个参数是 config，body 必须放在 config.data 中
    return api.delete<AwaitedReturnType<MessageService['bulkDelete']>>(`${base}/bulk`, {
        data: { ids }
    })
}

/**
 * 发送消息
 */
export function send(data: Partial<PrismaTypes.Prisma.MessageUncheckedCreateInput>) {
    return api.post<AwaitedReturnType<MessageService['create']>>(base, data)
}

export interface MessageArchivePayload {
    version?: number
    exportedAt?: string
    exportedBy?: string
    conversations: Array<{
        id: string
        messages: any[]
        [key: string]: any
    }>
}

/**
 * 导入消息记录归档
 */
export function importArchive(data: MessageArchivePayload | { archive: MessageArchivePayload }) {
    return api.post<AwaitedReturnType<MessageService['importArchive']>>(`${base}/import`, data)
}

/**
 * 获取消息历史
 */
export function findAll(conversationId: string, pagination: PaginationOptions, cursor?: number) {
    return api.get<AwaitedReturnType<MessageService['findAll']>>(`${base}/${conversationId}`, { ...pagination, cursor })
}

/**
 * 编辑消息
 */
export function edit(id: string, data: { content: string; payload?: any }) {
    return api.patch<AwaitedReturnType<MessageService['update']>>(`${base}/${id}`, data)
}

/**
 * 撤回消息
 */
export function revoke(id: string) {
    return api.patch<AwaitedReturnType<MessageService['revoke']>>(`${base}/${id}/revoke`)
}

/**
 * 已读上报
 */
export function markAsRead(conversationId: string, messageId: string) {
    return api.patch<AwaitedReturnType<MessageService['markAsRead']>>(`${base}/${conversationId}/read/${messageId}`)
}

/**
 * 消息搜索
 */
export function search(conversationId: string, query: string) {
    return api.get<AwaitedReturnType<MessageService['search']>>(`${base}/${conversationId}/search`, { q: query })
}

// 消息状态
export enum MessageStatus {
    NORMAL = 'NORMAL', /// 正常
    DELETED = 'DELETED', /// 对自己删除
    REVOKED = 'REVOKED', /// 已撤回
    BLOCKED = 'BLOCKED', /// 被风控/屏蔽
}

// 消息类型
export enum MessageType {
    TEXT = 'TEXT', /// 普通文本
    IMAGE = 'IMAGE', /// 图片
    FILE = 'FILE', /// 文件
    AUDIO = 'AUDIO', /// 音频
    VIDEO = 'VIDEO', /// 视频
    SYSTEM = 'SYSTEM', /// 系统消息
    NOTICE = 'NOTICE', /// 通知类消息
    PLUGIN = 'PLUGIN', /// 插件/模块消息
    RICH_TEXT = 'RICH_TEXT'
}
