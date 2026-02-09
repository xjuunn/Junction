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
            <div class="max-w-3xl mx-auto w-full px-4 sm:px-8 py-8 space-y-10 min-w-0">
                <div class="flex flex-col sm:flex-row items-start justify-between gap-6 min-w-0">
                    <div class="flex gap-5 min-w-0 flex-1 w-full">
                        <div class="relative shrink-0">
                            <div
                                class="w-20 h-20 sm:w-[72px] sm:h-[72px] rounded-[22px] ring-4 ring-base-200 overflow-hidden bg-base-200 flex items-center justify-center transition-transform hover:scale-105">
                                <img v-if="userInfo.image" :src="resolveAssetUrl(userInfo.image)"
                                    class="w-full h-full object-cover" />
                                <span v-else class="text-2xl font-black text-base-content/20">{{
                                    userInfo.name?.charAt(0).toUpperCase() }}</span>
                            </div>
                            <div class="absolute -bottom-1 -right-1 bg-base-100/80 backdrop-blur-md rounded-full p-1 shadow-sm">
                                <Icon
                                    :name="userInfo.banned ? 'mingcute:close-circle-fill' : 'mingcute:check-circle-fill'"
                                    class="text-[20px]" :class="userInfo.banned ? 'text-error' : 'text-success'" />
                            </div>
                        </div>

                        <div class="flex flex-col pt-1 gap-1 min-w-0 flex-1">
                            <h1 class="text-2xl font-black text-base-content tracking-tight truncate w-full">
                                {{ userInfo.name }}
                            </h1>
                            <div class="flex items-center gap-2 mt-0.5 min-w-0">
                                <div
                                    class="badge badge-sm rounded-lg font-bold bg-primary/10 text-primary border-none px-2.5 h-6 shrink-0 uppercase tracking-wider text-[10px]">
                                    {{ userInfo.role }}
                                </div>
                                <button
                                    class="text-xs font-mono text-base-content/40 hover:text-primary transition-colors flex items-center gap-1 group min-w-0 flex-1"
                                    @click="copy(userInfo.id)">
                                    <span class="truncate block w-full text-left">{{ userInfo.id }}</span>
                                    <Icon name="mingcute:copy-2-line"
                                        class="shrink-0 opacity-0 group-hover:opacity-100" />
                                </button>
                            </div>
                        </div>
                    </div>

                    <div class="flex items-center gap-2 shrink-0 w-full sm:w-auto">
                        <template v-if="userInfo.relation === 'SELF'">
                            <button disabled
                                class="btn btn-sm btn-ghost rounded-xl px-4 gap-2 font-bold flex-1 sm:flex-none">
                                <Icon name="mingcute:user-4-fill" /> 自己
                            </button>
                        </template>

                        <template v-else-if="userInfo.relation === 'FRIEND'">
                            <button @click="handleSendMessage" :disabled="isActionLoading"
                                class="btn btn-sm btn-primary rounded-xl px-5 gap-2 font-bold shadow-lg shadow-primary/20 flex-1 sm:flex-none">
                                <Icon v-if="isActionLoading" name="mingcute:loading-fill" class="animate-spin" />
                                <Icon v-else name="mingcute:message-2-fill" /> 发消息
                            </button>
                        </template>

                        <template v-else-if="userInfo.relation === 'WAITING_ACCEPT'">
                            <button @click="openAddFriendModal" :disabled="isActionLoading"
                                class="btn btn-sm btn-neutral rounded-xl px-4 gap-2 font-bold flex-1 sm:flex-none">
                                再次发送
                            </button>
                        </template>

                        <template v-else-if="userInfo.relation === 'WAITING_CONFIRM'">
                            <button @click="handleAcceptFriend" :disabled="isActionLoading"
                                class="btn btn-sm btn-success text-success-content rounded-xl px-5 gap-2 font-bold shadow-lg shadow-success/20 flex-1 sm:flex-none">
                                同意请求
                            </button>
                        </template>

                        <template v-else-if="userInfo.relation === 'BLOCKED'">
                            <button disabled
                                class="btn btn-sm btn-error btn-outline rounded-xl px-4 gap-2 font-bold flex-1 sm:flex-none">
                                已拉黑
                            </button>
                        </template>

                        <template v-else>
                            <button @click="openAddFriendModal" :disabled="isActionLoading"
                                class="btn btn-sm btn-neutral rounded-xl px-5 gap-2 font-bold shadow-md flex-1 sm:flex-none">
                                加好友
                            </button>
                        </template>

                        <div class="hidden sm:block h-4 w-px bg-base-content/10 mx-1"></div>

                        <button
                            class="btn btn-sm btn-square btn-ghost text-base-content/40 hover:bg-base-200 rounded-lg shrink-0"
                            @click="refresh">
                            <Icon name="mingcute:refresh-2-line" size="18" />
                        </button>
                    </div>
                </div>

                <div class="card bg-base-200/40 border border-base-content/5 rounded-[24px] min-w-0">
                    <div class="card-body p-6 space-y-6 min-w-0">
                        <h3 class="text-xs font-black uppercase tracking-[0.2em] text-base-content/40">基础信息</h3>
                        <div
                            class="grid grid-cols-1 sm:grid-cols-[120px_1fr] gap-y-4 sm:gap-y-6 items-center text-sm min-w-0">
                            <span class="text-base-content/40 font-bold shrink-0">电子邮件</span>
                            <div class="flex items-center gap-3 min-w-0 w-full overflow-hidden">
                                <span class="font-bold text-base-content/80 truncate flex-1">{{ userInfo.email }}</span>
                                <div class="badge badge-sm shrink-0"
                                    :class="userInfo.emailVerified ? 'badge-success' : 'badge-warning'">
                                    {{ userInfo.emailVerified ? '已验证' : '未验证' }}
                                </div>
                            </div>

                            <span class="text-base-content/40 font-bold shrink-0">注册日期</span>
                            <div class="flex items-center gap-2 min-w-0 overflow-hidden">
                                <Icon name="mingcute:calendar-line" class="text-base-content/30 shrink-0" />
                                <span class="font-mono font-medium text-base-content/70 truncate">{{
                                    formatDate(userInfo.createdAt) }}</span>
                            </div>
                        </div>
                    </div>
                </div>

                <div class="space-y-4 min-w-0">
                    <div class="flex items-center justify-between px-2">
                        <h3 class="text-[15px] font-black text-base-content">关联钱包</h3>
                        <span
                            class="text-[10px] font-black bg-base-300 text-base-content/50 px-2 py-0.5 rounded-md uppercase shrink-0">
                            Total {{ userInfo.wallets.length }}
                        </span>
                    </div>

                    <div v-if="userInfo.wallets.length > 0" class="grid grid-cols-1 gap-3 min-w-0">
                        <div v-for="wallet in userInfo.wallets" :key="wallet.id"
                            class="group flex items-center gap-4 p-4 rounded-2xl border border-base-content/5 bg-base-200/30 hover:bg-base-200/60 transition-all cursor-default min-w-0 w-full overflow-hidden">
                            <div
                                class="w-10 h-10 rounded-xl bg-base-100 flex items-center justify-center text-primary shadow-sm group-hover:scale-110 transition-transform shrink-0">
                                <Icon name="mingcute:wallet-4-line" size="20" />
                            </div>

                            <div class="flex-1 min-w-0">
                                <div class="flex items-center gap-2 mb-0.5 min-w-0 w-full">
                                    <span
                                        class="font-mono text-[13px] font-bold text-base-content/80 truncate block group-hover:text-primary transition-colors flex-1">
                                        {{ wallet.address }}
                                    </span>
                                    <button @click.stop="copy(wallet.address)"
                                        class="opacity-0 group-hover:opacity-100 hover:text-primary transition-all shrink-0">
                                        <Icon name="mingcute:copy-line" size="14" />
                                    </button>
                                </div>
                                <div
                                    class="flex items-center gap-3 text-[10px] font-bold uppercase text-base-content/30 tracking-widest min-w-0">
                                    <span class="shrink-0">Chain {{ wallet.chainId }}</span>
                                    <span v-if="wallet.isPrimary"
                                        class="text-primary flex items-center gap-1 min-w-0 truncate">
                                        <Icon name="mingcute:star-fill" class="shrink-0" /> <span
                                            class="truncate">主钱包</span>
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div v-else
                        class="py-12 rounded-3xl border border-dashed border-base-content/10 flex flex-col items-center justify-center text-base-content/30 gap-3">
                        <Icon name="mingcute:wallet-line" size="32" class="opacity-20" />
                        <span class="text-xs font-bold uppercase tracking-widest">暂无绑定钱包</span>
                    </div>
                </div>
            </div>
        </div>

        <BaseModal v-model="addFriendModal.show" title="申请加好友" box-class="max-w-sm w-full border-none shadow-xl">
            <div class="flex flex-col gap-5 min-w-0">
                <div class="flex items-center gap-3 p-3 bg-base-200/50 rounded-xl border border-base-content/5 min-w-0">
                    <BaseAvatar :src="userInfo?.image ? resolveAssetUrl(userInfo.image) : null" :text="userInfo?.name"
                        :size="44" :radius="12" class="shrink-0" />
                    <div class="flex flex-col min-w-0 flex-1">
                        <span class="text-sm font-bold text-base-content truncate">{{ userInfo?.name }}</span>
                        <span class="text-[10px] font-mono opacity-40 truncate uppercase">ID: {{ userInfo?.id }}</span>
                    </div>
                </div>

                <div class="space-y-4">
                    <fieldset class="fieldset p-0">
                        <legend
                            class="fieldset-legend py-0 mb-1 text-[11px] font-bold uppercase opacity-40 tracking-wider">
                            备注姓名
                        </legend>
                        <input v-model="addFriendModal.form.note" type="text" placeholder="对方的备注"
                            class="input input-sm input-bordered w-full rounded-lg focus-within:outline-0 bg-base-100 focus:input-primary text-sm h-9" />
                    </fieldset>

                    <fieldset class="fieldset p-0">
                        <legend
                            class="fieldset-legend py-0 mb-1 text-[11px] font-bold uppercase opacity-40 tracking-wider">
                            申请信息
                        </legend>
                        <textarea v-model="addFriendModal.form.requestMsg"
                            class="textarea textarea-sm textarea-bordered focus-within:outline-0 w-full rounded-lg bg-base-100 focus:textarea-primary h-20 text-sm leading-snug resize-none"
                            placeholder="自我介绍..."></textarea>
                    </fieldset>
                </div>
            </div>

            <template #actions>
                <div class="flex gap-2 w-full">
                    <button class="btn btn-sm btn-ghost flex-1 rounded-lg font-medium"
                        @click="addFriendModal.show = false">
                        取消
                    </button>
                    <button class="btn btn-sm btn-primary flex-1 rounded-lg font-bold" :disabled="isActionLoading"
                        @click="submitAddFriend">
                        <span v-if="isActionLoading" class="loading loading-spinner loading-xs"></span>
                        发送申请
                    </button>
                </div>
            </template>
        </BaseModal>
    </div>
</template>

<script setup lang="ts">
import * as User from '~/api/user';
import * as FriendShip from '~/api/friendship';
import * as Conversation from '~/api/conversation';

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
const dialog = useDialog();
const { copy: copyToClipboard } = useClipboard();

const loading = ref(false);
const isActionLoading = ref(false);
const userInfo = ref<UserDetail | null>(null);

const addFriendModal = reactive({
    show: false,
    form: {
        requestMsg: '你好，请求添加为好友',
        note: '',
        source: '搜索'
    }
});

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
        toast.error('网络请求异常');
    } finally {
        loading.value = false;
    }
}

function refresh() {
    initData();
}

function openAddFriendModal() {
    addFriendModal.form.note = userInfo.value?.name || '';
    addFriendModal.show = true;
}

async function submitAddFriend() {
    if (!userInfo.value) return;

    isActionLoading.value = true;
    try {
        const { success, error } = await FriendShip.create({
            receiverId: userInfo.value.id,
            requestMsg: addFriendModal.form.requestMsg,
            note: addFriendModal.form.note,
            source: addFriendModal.form.source
        });

        if (success) {
            toast.success('好友请求已发送');
            addFriendModal.show = false;
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
            toast.success('已同意好友申请');
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

async function handleSendMessage() {
    if (!userInfo.value) return;

    isActionLoading.value = true;
    try {
        const res = await Conversation.create({
            type: 'PRIVATE',
            targetId: userInfo.value.id
        });

        if (res.success && res.data) {
            router.push(`/chat/${res.data.id}`);
        } else {
            toast.error(res.error || '创建会话失败');
        }
    } catch (err: any) {
        toast.error(err.message || '操作失败');
    } finally {
        isActionLoading.value = false;
    }
}

function copy(text: string) {
    if (!text) return;
    copyToClipboard(text);
    toast.success('已复制到剪贴板');
}

function formatDate(dateStr: string | Date | null, short = false) {
    if (!dateStr) return '-';
    const date = new Date(dateStr);
    if (short) return date.toLocaleDateString('zh-CN');
    return date.toLocaleString('zh-CN', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false
    });
}
</script>

<style scoped>
.custom-scrollbar::-webkit-scrollbar {
    width: 4px;
}

.custom-scrollbar::-webkit-scrollbar-thumb {
    background: hsl(var(--bc) / 0.1);
    border-radius: 10px;
}

.tooltip:before {
    font-size: 10px;
    padding: 4px 8px;
    border-radius: 8px;
    font-weight: bold;
}
</style>
