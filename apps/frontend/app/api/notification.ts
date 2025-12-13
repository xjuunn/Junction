import type { NotificationController } from '@junction/backend/src/resource/notification/notification.controller'
import type { PrismaTypes } from "@junction/types";

const base = '/notification';

/**
 * 获取通知列表
 */
export function findAll(data: PrismaTypes.Prisma.NotificationWhereInput & PaginationOptions) {
    return api.get<AwaitedReturnType<NotificationController['findAll']>>(base, data);
}

/**
 * 获取通知详情
 */
export function findOne(id: string) {
    return api.get<AwaitedReturnType<NotificationController['findOne']>>(base + '/' + id);
}

/**
 * 获取未读通知数量
 */
export function findUnreadCount() {
    return api.get<AwaitedReturnType<NotificationController['getUnreadCount']>>(base + '/unread-count');
}

/**
 * 全部标记为已读
 */
export function markAllAsRead() {
    return api.patch<AwaitedReturnType<NotificationController['markAllAsRead']>>(base + '/read-all');
}

export function updateStatus(id: string, processStatus: PrismaTypes.NotificationProcessStatus) {
    return api.patch<AwaitedReturnType<NotificationController['updateStatus']>>(base + `/${id}/status`, { processStatus })
}

/**
 * 标记指定通知为已读
 */
export function markAsRead(id: string) {
    return api.patch<AwaitedReturnType<NotificationController['markAsRead']>>(base + `/${id}/read`);
}

/**
 * 清空通知
 */
export function removeAll() {
    return api.delete<AwaitedReturnType<NotificationController['removeAll']>>(base);
}

/**
 * 删除指定通知
 */
export function remove(id: string) {
    return api.delete<AwaitedReturnType<NotificationController['remove']>>(base + `/${id}`);
}