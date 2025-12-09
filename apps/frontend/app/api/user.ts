import type { UserController } from '@junction/backend/src/resource/user/user.controller'
const base = '/user'

/** 我的信息 */
export function me() {
    return api.get<AwaitedReturnType<UserController['getProfile']>>('/me');
}

/** 判断登录状态 */
export function isAuthenticated() {
    return api.get<AwaitedReturnType<UserController['isAuthenticated']>>('/isauthenticated');
}

/** 搜索用户 */
export function search(keyword: string, pagination: PaginationOptions) {
    return api.get<AwaitedReturnType<UserController['searchUser']>>(base + '/search', { keyword, ...pagination });
}

/**
 * 获取用户详细信息
 * @param id 用户ID
 */
export function findOne(id: string) {
    return api.get<AwaitedReturnType<UserController['findOne']>>(base + '/findOne/' + id);
}