import type { FriendshipService } from '@junction/backend/src/resource/friendship/friendship.service'
import type { PrismaTypes } from '@junction/types'
const base = "/friendship"

/**
 * 创建好友关系
 */
export function create(data: Omit<PrismaTypes.Prisma.FriendshipUncheckedCreateInput, 'senderId' | 'status'>) {
    return api.post<AwaitedReturnType<FriendshipService['create']>>(base, data);
}

/**
 * 查找好友关系列表
 */
export function findAll(data: Omit<PrismaTypes.Prisma.FriendshipWhereInput, 'senderId'> & PaginationOptions) {
    return api.get<AwaitedReturnType<FriendshipService['findAll']>>(base, data)
}

/**
 * 查找某个好友详情
 */
export function findOne(friendId: string) {
    return api.get<AwaitedReturnType<FriendshipService['findOne']>>(base + "/" + friendId)
}

/**
 * 同意好友请求
 */
export function accept(friendId: string) {
    return api.patch<AwaitedReturnType<FriendshipService['accept']>>(base + `/accept/${friendId}`, {}, {});
}

/**
 * 拒绝好友请求
 */
export function reject(friendId: string) {
    return api.patch<AwaitedReturnType<FriendshipService['update']>>(base + `/reject/${friendId}`, {}, {});
}

/**
 * 拉黑好友
 */
export function block(friendId: string) {
    return api.patch<AwaitedReturnType<FriendshipService['update']>>(base + `/block/${friendId}`, {}, {});
}

/**
 * 解除拉黑好友
 */
export function unblock(friendId: string) {
    return api.patch<AwaitedReturnType<FriendshipService['update']>>(base + `/unblock/${friendId}`, {}, {});
}

/**
 * 更新好友信息（备注等）
 */
export function update(friendId: string, data: { note?: string }) {
    return api.patch<AwaitedReturnType<FriendshipService['update']>>(base + "/" + friendId, data, {});
}

/**
 * 删除好友关系
 */
export function remove(friendId: string) {
    return api.delete<AwaitedReturnType<FriendshipService['remove']>>(base + "/" + friendId)
}

/**
 * 获取拉黑的好友列表
 */
export function findBlocked(pagination: PaginationOptions) {
    return api.get<AwaitedReturnType<FriendshipService['findBlocked']>>(base + "/blocked/list", pagination)
}

export enum FriendshipStatus {
    "PENDING", // 开启
    "ACCEPTED", // 同意
    "REJECTED",  // 拒绝
    "BLOCKED",  // 阻塞
}
