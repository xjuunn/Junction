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
export function search(params: { query?: string; keyword?: string; page?: number; limit?: number }) {
    const queryParams = {
        keyword: params.query || params.keyword || '',
        page: params.page || 1,
        limit: params.limit || 20,
        ...params
    };
    return api.get<AwaitedReturnType<UserController['searchUser']>>(base + '/search', queryParams);
}

/**
 * 获取用户详细信息
 * @param id 用户ID
 */
export function findOne(id: string) {
    return api.get<AwaitedReturnType<UserController['findOne']>>(base + '/findOne/' + id);
}

/** 我的钱包列表 */
export function listMyWallets() {
    return api.get<AwaitedReturnType<UserController['listMyWallets']>>(base + '/wallets');
}

/** 生成钱包绑定签名挑战 */
export function createWalletBindNonce(data: { walletAddress: string; chainId?: number }) {
    return api.post<AwaitedReturnType<UserController['createWalletBindNonce']>>(base + '/wallets/nonce', data);
}

/** 绑定钱包 */
export function bindWallet(data: { walletAddress: string; chainId?: number; message: string; signature: string }) {
    return api.post<AwaitedReturnType<UserController['bindWallet']>>(base + '/wallets/bind', data);
}

/** 设为主钱包 */
export function setPrimaryWallet(walletId: string) {
    return api.patch<AwaitedReturnType<UserController['setPrimaryWallet']>>(`${base}/wallets/${walletId}/primary`);
}

/** 解绑钱包 */
export function unbindWallet(walletId: string) {
    return api.delete<AwaitedReturnType<UserController['unbindWallet']>>(`${base}/wallets/${walletId}`);
}
