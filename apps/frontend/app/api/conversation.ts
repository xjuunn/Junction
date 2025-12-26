import { ConversationService } from '@junction/backend/src/resource/conversation/conversation.service'
import type { PrismaTypes } from '@junction/types';

const base = "/conversation"

/**
 * 创建或获取现有会话
 * @param data 私聊传 targetId，群聊传 title 和 memberIds
 */
export function create(data: {
    type: 'PRIVATE' | 'GROUP';
    targetId?: string;
    title?: string;
    avatar?: string;
    memberIds?: string[]
}) {
    return api.post<AwaitedReturnType<ConversationService['create']>>(base, data);
}

/**
 * 分页获取会话列表
 */
export function findAll(pagination: PaginationOptions) {
    return api.get<AwaitedReturnType<ConversationService['findAll']>>(base, pagination);
}

/**
 * 获取指定会话的元数据详情
 */
export function findOne(id: string) {
    return api.get<AwaitedReturnType<ConversationService['findOne']>>(base + "/" + id);
}

/**
 * 更新当前用户的会话偏好设置（置顶、静音等）
 */
export function updateSettings(id: string, data: PrismaTypes.Prisma.ConversationMemberUpdateInput) {
    return api.patch<AwaitedReturnType<ConversationService['updateMember']>>(`${base}/${id}/settings`, data);
}

/**
 * 在列表中隐藏该会话
 */
export function remove(id: string) {
    return api.delete<AwaitedReturnType<ConversationService['remove']>>(base + "/" + id);
}