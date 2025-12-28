import { MessageService } from '@junction/backend/src/resource/message/message.service'
import type { PrismaTypes } from '@junction/types'

const base = "/message"

/**
 * 批量删除消息
 */
export function bulkDelete(ids: string[]) {
    // 企业级修复：Axios 的 delete 方法第二个参数是 config，body 必须放在 config.data 中
    return api.delete<AwaitedReturnType<MessageService['bulkDelete']>>(`${base}/bulk`, {
        data: { ids }
    });
}

/**
 * 发送消息
 */
export function send(data: Partial<PrismaTypes.Prisma.MessageUncheckedCreateInput>) {
    return api.post<AwaitedReturnType<MessageService['create']>>(base, data);
}

/**
 * 获取消息历史
 */
export function findAll(conversationId: string, pagination: PaginationOptions, cursor?: number) {
    return api.get<AwaitedReturnType<MessageService['findAll']>>(`${base}/${conversationId}`, { ...pagination, cursor });
}

/**
 * 编辑消息
 */
export function edit(id: string, data: { content: string; payload?: any }) {
    return api.patch<AwaitedReturnType<MessageService['update']>>(`${base}/${id}`, data);
}

/**
 * 撤回消息
 */
export function revoke(id: string) {
    return api.patch<AwaitedReturnType<MessageService['revoke']>>(`${base}/${id}/revoke`);
}

/**
 * 已读上报
 */
export function markAsRead(conversationId: string, messageId: string) {
    return api.patch<AwaitedReturnType<MessageService['markAsRead']>>(`${base}/${conversationId}/read/${messageId}`);
}

/**
 * 消息搜索
 */
export function search(conversationId: string, query: string) {
    return api.get<AwaitedReturnType<MessageService['search']>>(`${base}/${conversationId}/search`, { q: query });
}

// 消息状态
export enum MessageStatus {
    "NORMAL",   /// 正常
    "DELETED",  /// 对自己删除
    "REVOKED",  /// 已撤回
    "BLOCKED",  /// 被风控 / 屏蔽
}

// 消息类型
export enum MessageType {
    "TEXT", /// 普通文本
    "IMAGE", /// 图片
    "FILE", /// 文件
    "AUDIO", /// 音频
    "VIDEO", /// 视频
    "SYSTEM", /// 系统消息
    "NOTICE", /// 通知类消息
    "PLUGIN", /// 插件 / 模块消息
}