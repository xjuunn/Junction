import { FriendshipService } from '@junction/backend/src/resource/friendship/friendship.service'
import { type PrismaTypes } from '@junction/types'
const base = "/friendship"

/**
 * 创建好友关系
 */
export function create(data: Omit<PrismaTypes.Prisma.FriendshipUncheckedCreateInput, 'senderId'>) {
    return api.post<AwaitedReturnType<FriendshipService['create']>>(base, data);
}

/**
 * 查找好友关系
 */
export function findAll(data: Omit<PrismaTypes.Prisma.FriendshipWhereInput, 'senderId'> & PaginationOptions) {
    return api.get<AwaitedReturnType<FriendshipService['findAll']>>(base, data)
}

/**
 * 查找某个好友关系
 */
export function findOne(receiverId: string) {
    return api.get<AwaitedReturnType<FriendshipService['findOne']>>(base + "/" + receiverId)
}

/**
 * 同意好友请求
 */
export function accept(friendId: string) {
    return api.patch<AwaitedReturnType<FriendshipService['update']>>(base + `/accept/${friendId}`);
}

/**
 * 拒绝好友请求
 */
export function reject(friendId: string) {
    return api.patch<AwaitedReturnType<FriendshipService['update']>>(base + `/reject/${friendId}`);
}

/**
 * 拉黑好友
 */
export function block(id: string) {
    return api.patch<AwaitedReturnType<FriendshipService['update']>>(base + `/block/${id}`);
}

/**
 * 删除好友关系
 */
export function remove(receiverId: string) {
    return api.delete<AwaitedReturnType<FriendshipService['remove']>>(base + "/" + receiverId)
}