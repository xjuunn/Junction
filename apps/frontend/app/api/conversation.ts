import type { ConversationService } from '@junction/backend/src/resource/conversation/conversation.service'
import type { PrismaTypes } from '@junction/types';

const base = "/conversation"

/**
 * 鍒涘缓鎴栬幏鍙栫幇鏈変細璇?
 * @param data 绉佽亰浼?targetId锛岀兢鑱婁紶 title 鍜?memberIds
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
 * 鍒嗛〉鑾峰彇浼氳瘽鍒楄〃
 */
export function findAll(pagination: PaginationOptions & { type?: 'PRIVATE' | 'GROUP' }) {
    return api.get<AwaitedReturnType<ConversationService['findAll']>>(base, pagination);
}

/**
 * 鑾峰彇鎸囧畾浼氳瘽鐨勫厓鏁版嵁璇︽儏
 */
export function findOne(id: string) {
    return api.get<AwaitedReturnType<ConversationService['findOne']>>(base + "/" + id);
}

/**
 * 鏇存柊褰撳墠鐢ㄦ埛鐨勪細璇濆亸濂借缃紙缃《銆侀潤闊崇瓑锛? */
export function updateSettings(id: string, data: PrismaTypes.Prisma.ConversationMemberUpdateInput) {
    return api.patch<AwaitedReturnType<ConversationService['updateMember']>>(`${base}/${id}/settings`, data, {});
}

/**
 * 转让群主
 */
export function transferOwner(conversationId: string, targetUserId: string) {
    return api.patch<AwaitedReturnType<ConversationService['transferOwner']>>(`${base}/${conversationId}/owner`, { targetUserId }, {});
}
/**
 * 鍦ㄥ垪琛ㄤ腑闅愯棌璇ヤ細璇? */
export function remove(id: string) {
    return api.delete<AwaitedReturnType<ConversationService['remove']>>(base + "/" + id);
}

/**
 * 鑾峰彇缇よ亰鎴愬憳鍒楄〃
 */
export function getMembers(conversationId: string) {
    return api.get<AwaitedReturnType<ConversationService['getMembers']>>(`${base}/${conversationId}/members`);
}

/**
 * 閭€璇锋垚鍛樺姞鍏ョ兢鑱? */
export function addMembers(conversationId: string, memberIds: string[]) {
    return api.post<AwaitedReturnType<ConversationService['addMembers']>>(`${base}/${conversationId}/members`, { memberIds });
}

/**
 * 绉婚櫎缇よ亰鎴愬憳
 */
export function removeMember(conversationId: string, targetUserId: string) {
    return api.delete<AwaitedReturnType<ConversationService['removeMember']>>(`${base}/${conversationId}/members/${targetUserId}`);
}

/**
 * 淇敼鎴愬憳瑙掕壊
 */
export function updateMemberRole(conversationId: string, targetUserId: string, role: 'ADMIN' | 'MEMBER') {
    return api.patch<AwaitedReturnType<ConversationService['updateMemberRole']>>(`${base}/${conversationId}/members/${targetUserId}/role`, { role }, {});
}

/**
 * 鏇存柊缇よ亰淇℃伅
 */
export function updateGroupInfo(conversationId: string, data: { title?: string; avatar?: string }) {
    return api.patch<AwaitedReturnType<ConversationService['updateGroupInfo']>>(`${base}/${conversationId}/info`, data, {});
}

// 浼氳瘽绫诲瀷
export enum ConversationType {
    "PRIVATE", // 绉佽亰
    "GROUP", // 缇よ亰
    "TEMPORARY", // 涓存椂浼氳瘽
    "SYSTEM", // 绯荤粺
}

// 浼氳瘽鐘舵€?
export enum ConversationStatus {
    "ACTIVE", // 婵€娲?
    "ARCHIVED", // 褰掓。
    "DISABLED", // 澶辨晥
}

// 浼氳瘽鎴愬憳瑙掕壊
export enum ConversationMemberRole {
    "OWNER", // 鎷ユ湁鑰?
    "ADMIN",  // 绠＄悊鍛?
    "MEMBER",  //鎴愬憳
}
