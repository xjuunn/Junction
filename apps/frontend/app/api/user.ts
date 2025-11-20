import { type UserController } from '@junction/backend/src/resource/user/user.controller'
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
    return api.get<AwaitedReturnType<UserController['searchUser']>>('/search', { keyword, ...pagination });
}