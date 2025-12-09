<template>
    <div class="h-full flex flex-col bg-base-100 relative overflow-hidden">
        <div v-if="loading" class="flex-1 p-8 space-y-10 animate-pulse">
            <div class="flex justify-between items-start">
                <div class="flex gap-4">
                    <div class="w-16 h-16 rounded-2xl bg-base-200"></div>
                    <div class="space-y-2 pt-1">
                        <div class="h-6 w-32 bg-base-200 rounded-md"></div>
                        <div class="h-4 w-20 bg-base-200 rounded-md"></div>
                    </div>
                </div>
                <div class="flex gap-2">
                    <div class="w-20 h-8 rounded-lg bg-base-200"></div>
                </div>
            </div>
            <div class="space-y-6">
                <div class="h-4 w-1/4 bg-base-200 rounded"></div>
                <div class="space-y-4">
                    <div class="h-10 w-full bg-base-200 rounded-xl"></div>
                    <div class="h-10 w-full bg-base-200 rounded-xl"></div>
                </div>
            </div>
        </div>

        <div v-else-if="!userInfo" class="flex flex-col items-center justify-center h-full text-base-content/30 gap-3">
            <div class="w-16 h-16 rounded-2xl bg-base-200/50 flex items-center justify-center">
                <Icon name="mingcute:ghost-line" size="32" />
            </div>
            <p class="text-sm font-medium">未选择或未找到用户</p>
        </div>

        <div v-else class="flex-1 overflow-y-auto scroll-smooth">
            <div class="max-w-3xl mx-auto w-full px-8 py-8 space-y-10">

                <div class="flex items-start justify-between">
                    <div class="flex gap-5 min-w-0 flex-1">
                        <div class="relative shrink-0">
                            <div
                                class="w-[72px] h-[72px] rounded-[20px] ring-1 ring-base-content/10 overflow-hidden bg-base-200/50 flex items-center justify-center">
                                <img v-if="userInfo.image" :src="userInfo.image" class="w-full h-full object-cover" />
                                <span v-else class="text-xl font-bold text-base-content/40">{{
                                    userInfo.name?.charAt(0).toUpperCase() }}</span>
                            </div>
                            <div class="absolute -bottom-1 -right-1 bg-base-100 rounded-full p-0.5">
                                <Icon
                                    :name="userInfo.banned ? 'mingcute:close-circle-fill' : 'mingcute:check-circle-fill'"
                                    class="text-[20px]" :class="userInfo.banned ? 'text-error' : 'text-success'" />
                            </div>
                        </div>

                        <div class="flex flex-col pt-1 gap-1 min-w-0">
                            <div class="tooltip tooltip-bottom flex justify-start" :data-tip="userInfo.name">
                                <h1
                                    class="text-2xl font-bold text-base-content tracking-tight truncate max-w-[200px] sm:max-w-[300px]">
                                    {{ userInfo.name }}
                                </h1>
                            </div>
                            <div class="flex items-center gap-2 min-w-0">
                                <div
                                    class="badge badge-sm rounded-md font-medium bg-base-200 text-base-content/70 border-none px-2 h-6 shrink-0">
                                    {{ userInfo.role }}
                                </div>
                                <button
                                    class="text-xs font-mono text-base-content/40 hover:text-primary transition-colors flex items-center gap-1 truncate min-w-0"
                                    @click="copy(userInfo.id)">
                                    <span class="truncate">{{ userInfo.id }}</span>
                                    <Icon name="mingcute:copy-2-line" class="shrink-0" />
                                </button>
                            </div>
                        </div>
                    </div>

                    <div class="flex items-center gap-2 shrink-0 ml-4">
                        <template v-if="userInfo.relation === 'SELF'">
                            <button disabled
                                class="btn btn-sm btn-ghost rounded-xl px-4 gap-2 font-bold cursor-default">
                                <Icon name="mingcute:user-4-fill" />
                                自己
                            </button>
                        </template>

                        <template v-else-if="userInfo.relation === 'FRIEND'">
                            <button @click="handleSendMessage"
                                class="btn btn-sm btn-primary rounded-xl px-4 gap-2 font-bold shadow-sm hover:shadow-md transition-all">
                                <Icon name="mingcute:message-2-fill" />
                                发消息
                            </button>
                        </template>

                        <template v-else-if="userInfo.relation === 'WAITING_ACCEPT'">
                            <button disabled
                                class="btn btn-sm btn-neutral rounded-xl px-4 gap-2 font-bold shadow-sm cursor-not-allowed opacity-70">
                                <Icon name="mingcute:time-line" />
                                等待同意
                            </button>
                        </template>

                        <template v-else-if="userInfo.relation === 'WAITING_CONFIRM'">
                            <button @click="handleAcceptFriend" :disabled="isActionLoading"
                                class="btn btn-sm btn-success text-success-content rounded-xl px-4 gap-2 font-bold shadow-sm hover:shadow-md transition-all">
                                <Icon v-if="isActionLoading" name="mingcute:loading-fill" class="animate-spin" />
                                <Icon v-else name="mingcute:check-circle-fill" />
                                同意请求
                            </button>
                        </template>

                        <template v-else-if="userInfo.relation === 'BLOCKED'">
                            <button disabled class="btn btn-sm btn-error btn-outline rounded-xl px-4 gap-2 font-bold">
                                <Icon name="mingcute:forbid-circle-fill" />
                                已拉黑
                            </button>
                        </template>

                        <template v-else>
                            <button @click="handleAddFriend" :disabled="isActionLoading"
                                class="btn btn-sm btn-neutral rounded-xl px-4 gap-2 font-bold shadow-sm hover:shadow-md transition-all">
                                <Icon v-if="isActionLoading" name="mingcute:loading-fill" class="animate-spin" />
                                <Icon v-else name="mingcute:user-add-2-fill" />
                                加好友
                            </button>
                        </template>

                        <div class="h-4 w-px bg-base-content/10 mx-1"></div>

                        <button
                            class="btn btn-sm btn-square btn-ghost text-base-content/40 hover:bg-base-200 hover:text-base-content rounded-lg"
                            @click="refresh">
                            <Icon name="mingcute:refresh-2-line" size="18" />
                        </button>
                        <button
                            class="btn btn-sm btn-square btn-ghost text-base-content/40 hover:bg-base-200 hover:text-base-content rounded-lg">
                            <Icon name="mingcute:more-2-line" size="18" />
                        </button>
                    </div>
                </div>

                <div>
                    <h3 class="text-[15px] font-bold text-base-content mb-5">基础信息</h3>
                    <div class="grid grid-cols-[100px_1fr] gap-y-5 items-center text-sm">

                        <span class="text-base-content/40 font-medium">邮箱账户</span>
                        <div class="flex items-center gap-2 group min-w-0">
                            <div class="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-base-200/40 border border-base-content/5 group-hover:border-primary/20 group-hover:bg-primary/5 transition-all cursor-pointer min-w-0 max-w-full"
                                @click="copy(userInfo.email)">
                                <Icon name="mingcute:mail-line"
                                    class="text-base-content/40 group-hover:text-primary shrink-0" />
                                <span class="font-medium text-base-content/80 group-hover:text-primary truncate">{{
                                    userInfo.email
                                    }}</span>
                            </div>
                            <div class="tooltip tooltip-right shrink-0"
                                :data-tip="userInfo.emailVerified ? '已验证' : '未验证'">
                                <Icon
                                    :name="userInfo.emailVerified ? 'mingcute:safe-flash-fill' : 'mingcute:alert-line'"
                                    :class="userInfo.emailVerified ? 'text-success' : 'text-warning'" />
                            </div>
                        </div>

                        <span class="text-base-content/40 font-medium">注册时间</span>
                        <div class="flex items-center gap-2 px-1">
                            <Icon name="mingcute:calendar-2-line" class="text-base-content/40" />
                            <span class="font-medium text-base-content/80 tabular-nums">{{
                                formatDate(userInfo.createdAt) }}</span>
                        </div>

                        <!-- <span class="text-base-content/40 font-medium">最后活跃</span>
                        <div class="flex items-center gap-2 px-1">
                            <Icon name="mingcute:time-line" class="text-base-content/40" />
                            <span class="font-medium text-base-content/80 tabular-nums">{{
                                formatDate(userInfo.updatedAt) }}</span>
                        </div> -->

                    </div>
                </div>

                <div class="h-px bg-base-content/5 w-full"></div>

                <div>
                    <div class="flex items-center justify-between mb-5">
                        <h3 class="text-[15px] font-bold text-base-content">关联钱包</h3>
                        <span class="text-xs font-bold bg-base-200/60 text-base-content/50 px-2 py-0.5 rounded-md">{{
                            userInfo.wallets.length }}</span>
                    </div>

                    <div v-if="userInfo.wallets.length > 0" class="space-y-3">
                        <div v-for="wallet in userInfo.wallets" :key="wallet.id"
                            class="group relative flex items-center gap-4 p-4 rounded-2xl border border-base-content/5 bg-base-100 hover:border-base-content/10 hover:shadow-sm hover:bg-base-200/30 transition-all duration-200">
                            <div
                                class="w-10 h-10 rounded-xl bg-base-200/60 flex items-center justify-center text-base-content/60 group-hover:bg-base-100 group-hover:text-primary group-hover:scale-105 transition-all shrink-0">
                                <Icon name="mingcute:wallet-4-line" size="20" />
                            </div>

                            <div class="flex-1 min-w-0">
                                <div class="flex items-center gap-2 mb-0.5 min-w-0">
                                    <div class="tooltip tooltip-top before:max-w-[200px] before:break-all"
                                        :data-tip="wallet.address">
                                        <span
                                            class="font-mono text-[13px] font-medium text-base-content/80 truncate block max-w-[180px] sm:max-w-[240px] group-hover:text-primary transition-colors">
                                            {{ wallet.address }}
                                        </span>
                                    </div>
                                    <Icon name="mingcute:copy-line"
                                        class="text-base-content/0 group-hover:text-base-content/30 hover:!text-primary cursor-pointer transition-all shrink-0"
                                        size="12" @click="copy(wallet.address)" />
                                </div>
                                <div class="flex items-center gap-3 text-xs text-base-content/40">
                                    <span class="flex items-center gap-1">
                                        <Icon name="mingcute:link-line" size="10" /> Chain ID: {{ wallet.chainId }}
                                    </span>
                                    <span>{{ formatDate(wallet.createdAt, true) }}</span>
                                </div>
                            </div>

                            <div v-if="wallet.isPrimary" class="shrink-0">
                                <span
                                    class="badge badge-sm border-transparent bg-primary/10 text-primary font-bold gap-1 pl-1 pr-2">
                                    <Icon name="mingcute:star-fill" size="10" /> 主钱包
                                </span>
                            </div>
                        </div>
                    </div>

                    <div v-else
                        class="p-6 rounded-2xl border border-dashed border-base-content/10 bg-base-50 flex flex-col items-center justify-center text-base-content/40 gap-2">
                        <Icon name="mingcute:wallet-line" size="24" />
                        <span class="text-xs">暂无绑定钱包</span>
                    </div>
                </div>

                <div class="pt-4">
                    <div class="relative">
                        <input type="text" placeholder="添加备注..."
                            class="w-full h-12 pl-4 pr-10 rounded-xl bg-base-200/40 border border-transparent focus:bg-base-100 focus:border-base-content/10 focus:outline-none focus:ring-2 focus:ring-base-content/5 transition-all text-sm placeholder:text-base-content/30 text-base-content">
                        <button
                            class="absolute right-2 top-1/2 -translate-y-1/2 btn btn-xs btn-square btn-primary rounded-lg">
                            <Icon name="mingcute:arrow-up-line" />
                        </button>
                    </div>
                </div>

            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
import * as User from '~/api/user';
import * as FriendShip from '~/api/friendship';
type RelationStatus = 'SELF' | 'FRIEND' | 'WAITING_ACCEPT' | 'WAITING_CONFIRM' | 'BLOCKED' | 'NONE';

interface Wallet {
    id: string;
    address: string;
    chainId: number;
    createdAt: string | Date;
    isPrimary: boolean;
}

interface UserDetail {
    id: string;
    name: string | null;
    role: string;
    image: string | null;
    email: string;
    banned: boolean;
    createdAt: string | Date;
    updatedAt: string | Date;
    emailVerified: boolean | string | null;
    wallets: Wallet[];
    relation: RelationStatus;
}

const route = useRoute();
const router = useRouter();
const toast = useToast();
const { copy: copyToClipboard } = useClipboard();

const loading = ref(false);
const isActionLoading = ref(false);
const userInfo = ref<UserDetail | null>(null);

onMounted(() => {
    initData();
});

watch(() => route.params.id, (newId) => {
    if (newId) initData();
});

async function initData() {
    const id = route.params.id as string;
    if (!id) return;

    loading.value = true;
    try {
        const { data, success, error } = await User.findOne(id);
        if (success && data) {
            userInfo.value = data as unknown as UserDetail;
        } else {
            toast.error(error || '获取用户信息失败');
        }
    } catch (err) {
        console.error(err);
        toast.error('网络请求异常');
    } finally {
        loading.value = false;
    }
}

function refresh() {
    initData();
}

async function handleAddFriend() {
    if (!userInfo.value) return;

    isActionLoading.value = true;
    try {
        const { success, error } = await FriendShip.create({
            receiverId: userInfo.value.id
        });

        if (success) {
            toast.success('好友请求已发送');
            userInfo.value.relation = 'WAITING_ACCEPT';
        } else {
            toast.error(error || '请求发送失败');
        }
    } catch (err: any) {
        toast.error(err.message || '操作失败');
    } finally {
        isActionLoading.value = false;
    }
}

async function handleAcceptFriend() {
    if (!userInfo.value) return;

    isActionLoading.value = true;
    try {
        const { success, error } = await FriendShip.accept(userInfo.value.id);

        if (success) {
            toast.success('已添加好友');
            userInfo.value.relation = 'FRIEND';
        } else {
            toast.error(error || '操作失败');
        }
    } catch (err: any) {
        toast.error(err.message || '操作失败');
    } finally {
        isActionLoading.value = false;
    }
}

function handleSendMessage() {
    if (!userInfo.value) return;
    router.push(`/chat/${userInfo.value.id}`);
}

function copy(text: string) {
    if (!text) return;
    copyToClipboard(text);
    toast.success('已复制');
}

function formatDate(dateStr: string | Date | null, short = false) {
    if (!dateStr) return '-';
    const date = new Date(dateStr);
    if (short) {
        return date.toLocaleDateString('zh-CN');
    }
    return date.toLocaleString('zh-CN', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
    });
}
</script>