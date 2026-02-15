<script setup lang="ts">
import { ref, onMounted, computed } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import * as UserApi from '~/api/user';
import * as FriendshipApi from '~/api/friendship';
import * as ConversationApi from '~/api/conversation';

definePageMeta({ layout: 'main' });

const emit = defineEmits<{
    (e: 'friend-deleted', friendId: string): void;
    (e: 'friend-blocked', friend: any): void;
}>();

const route = useRoute();
const router = useRouter();
const toast = useToast();

interface UserDetail {
    id: string;
    name: string;
    email: string;
    image?: string;
    role: string;
    accountType?: string;
    createdAt: string;
}

interface FriendshipDetail {
    id: string;
    friendId: string;
    friend: {
        id: string;
        name: string;
        email: string;
        image?: string;
    };
    note?: string;
    isBlocked: boolean;
    status: string;
    updatedAt: string;
}

const loading = ref(true);
const userInfo = ref<UserDetail | null>(null);
const friendshipInfo = ref<FriendshipDetail | null>(null);
const isActionLoading = ref(false);

const contactId = computed(() => route.params.id as string);

const isBlocked = computed(() => friendshipInfo.value?.isBlocked === true);
const isFriend = computed(() => friendshipInfo.value?.status === 'ACCEPTED');

const initData = async () => {
    if (!contactId.value) {
        router.back();
        return;
    }

    loading.value = true;
    try {
        const { data, success, error } = await UserApi.findOne(contactId.value);
        if (success && data) {
            userInfo.value = data as unknown as UserDetail;
        } else {
            toast.error(error || '获取用户信息失败');
            router.back();
            return;
        }

        const friendRes = await FriendshipApi.findOne(contactId.value);
        if (friendRes.success && friendRes.data) {
            friendshipInfo.value = friendRes.data as unknown as FriendshipDetail;
        }
    } catch (err: any) {
        toast.error(err.message || '网络请求异常');
    } finally {
        loading.value = false;
    }
};

const handleSendMessage = async () => {
    if (!userInfo.value) return;

    isActionLoading.value = true;
    try {
        const res = await ConversationApi.create({
            type: 'PRIVATE',
            targetId: userInfo.value.id
        });

        if (res.success && res.data) {
            router.push(`/chat/${res.data.id}`);
        } else {
            toast.error(res.error || '创建会话失败');
        }
    } catch (err: any) {
        toast.error(err.message || '网络错误');
    } finally {
        isActionLoading.value = false;
    }
};

const handleDeleteFriend = async () => {
    if (!userInfo.value) return;

    const dialog = useDialog();
    const confirmed = await dialog.confirm({
        title: '删除联系人',
        content: `确定要删除 ${userInfo.value.name} 吗？删除后需要重新添加好友。`,
        type: 'warning'
    });

    if (!confirmed) return;

    isActionLoading.value = true;
    try {
        const res = await FriendshipApi.remove(userInfo.value.id);
        if (res.success) {
            toast.success('已删除联系人');
            emit('friend-deleted', userInfo.value.id);
            router.push('/contacts');
        } else {
            toast.error(res.error || '删除失败');
        }
    } catch (err: any) {
        toast.error(err.message || '网络错误');
    } finally {
        isActionLoading.value = false;
    }
};

const handleBlock = async () => {
    if (!userInfo.value) return;

    const dialog = useDialog();

    if (isBlocked.value) {
        const confirmed = await dialog.confirm({
            title: '取消拉黑',
            content: `确定要取消拉黑 ${userInfo.value.name} 吗？`,
            type: 'info'
        });

        if (!confirmed) return;

        isActionLoading.value = true;
        try {
            const res = await FriendshipApi.block(userInfo.value.id);
            if (res.success) {
                toast.success('已取消拉黑');
                friendshipInfo.value = { ...friendshipInfo.value!, isBlocked: false } as FriendshipDetail;
            } else {
                toast.error(res.error || '操作失败');
            }
        } catch (err: any) {
            toast.error(err.message || '网络错误');
        } finally {
            isActionLoading.value = false;
        }
    } else {
        const confirmed = await dialog.confirm({
            title: '拉黑联系人',
            content: `确定要拉黑 ${userInfo.value.name} 吗？拉黑后将无法接收对方消息。`,
            type: 'warning'
        });

        if (!confirmed) return;

        isActionLoading.value = true;
        try {
            const res = await FriendshipApi.block(userInfo.value.id);
            if (res.success) {
                toast.success('已拉黑该用户');
                friendshipInfo.value = { ...friendshipInfo.value!, isBlocked: true } as FriendshipDetail;
                emit('friend-blocked', {
                    id: friendshipInfo.value?.id,
                    friend: userInfo.value,
                    note: friendshipInfo.value?.note,
                    updatedAt: new Date().toISOString(),
                    isBlocked: true,
                    type: 'friend'
                });
                router.push('/contacts');
            } else {
                toast.error(res.error || '操作失败');
            }
        } catch (err: any) {
            toast.error(err.message || '网络错误');
        } finally {
            isActionLoading.value = false;
        }
    }
};

onMounted(() => {
    initData();
});
</script>

<template>
    <div class="h-full w-full overflow-y-auto custom-scrollbar">
        <!-- Loading State -->
        <div v-if="loading" class="flex flex-col items-center justify-center h-full min-h-[400px] space-y-8 animate-pulse">
            <div class="w-32 h-32 rounded-full bg-base-content/10"></div>
            <div class="flex flex-col items-center gap-3 w-full max-w-xs">
                <div class="h-8 w-3/4 bg-base-content/10 rounded-lg"></div>
                <div class="h-4 w-1/2 bg-base-content/10 rounded-lg"></div>
            </div>
            <div class="w-full max-w-md px-8 space-y-4">
                <div class="h-12 w-full bg-base-content/10 rounded-xl"></div>
                <div class="h-12 w-full bg-base-content/10 rounded-xl"></div>
            </div>
        </div>

        <!-- Error State -->
        <div v-else-if="!userInfo" v-motion-fade class="flex flex-col items-center justify-center h-full min-h-[400px] text-base-content/50 gap-6">
            <div class="p-6 bg-base-200/50 rounded-full">
                <Icon name="mingcute:user-x-line" size="48" />
            </div>
            <div class="text-center">
                <h3 class="text-lg font-bold text-base-content">未找到用户</h3>
                <p class="text-sm mt-1">该用户可能已被删除或不存在</p>
            </div>
            <button @click="router.back()" class="btn btn-ghost btn-sm">
                返回上一页
            </button>
        </div>

        <!-- Content -->
        <div v-else class="min-h-full w-full max-w-3xl mx-auto p-4 sm:p-6 lg:p-10 flex flex-col gap-6" v-motion-slide-bottom>
            <!-- Header Card -->
            <div class="relative overflow-hidden rounded-3xl bg-base-100 backdrop-blur-xl border border-base-content/5 shadow-sm">
                <!-- Decorative Background -->
                <div class="absolute top-0 left-0 w-full h-32"></div>
                
                <div class="relative px-6 pt-12 pb-8 flex flex-col items-center text-center">
                    <!-- Avatar with Status Ring -->
                    <div class="relative group">
                        <BaseAvatar 
                            :text="userInfo.name" 
                            :src="userInfo.image || undefined"
                            :alt="userInfo.name" 
                            :width="120" 
                            :height="120"
                            :radius="40" 
                            :placeholder-length="2" 
                            class="shadow-xl ring-4 ring-base-100/50 backdrop-blur-sm transition-transform duration-300 group-hover:scale-105" 
                        />
                        <div v-if="userInfo.accountType === 'BOT'" 
                            class="absolute -bottom-1 -right-1 bg-primary text-primary-content text-[10px] font-bold px-2 py-0.5 rounded-full shadow-sm border-2 border-base-100">
                            BOT
                        </div>
                    </div>

                    <!-- Name & Identity -->
                    <div class="mt-5 space-y-1">
                        <h1 class="text-2xl sm:text-3xl font-black tracking-tight text-base-content flex items-center justify-center gap-2">
                            {{ userInfo.name }}
                            <Icon v-if="userInfo.role === 'ADMIN'" name="mingcute:badge-fill" class="text-warning text-xl" title="管理员" />
                        </h1>
                        <div class="flex items-center justify-center gap-2 text-sm text-base-content/60">
                            <span>ID: {{ userInfo.id.slice(0, 8) }}...</span>
                            <button @click="useClipboard().copy(userInfo.id); toast.success('ID已复制')" class="hover:text-primary transition-colors">
                                <Icon name="mingcute:copy-2-line" size="14" />
                            </button>
                        </div>
                    </div>

                    <!-- Tags/Badges -->
                    <div class="mt-4 flex flex-wrap gap-2 justify-center">
                        <div class="badge badge-lg badge-ghost gap-1.5 pl-1.5 pr-3 h-8">
                            <div class="w-1.5 h-1.5 rounded-full bg-success"></div>
                            {{ userInfo.accountType || '用户' }}
                        </div>
                        <div class="badge badge-lg badge-ghost gap-1.5 pl-1.5 pr-3 h-8">
                            <Icon name="mingcute:user-3-line" size="14" />
                            {{ userInfo.role }}
                        </div>
                    </div>

                    <!-- Note Display -->
                    <div v-if="friendshipInfo?.note" class="mt-6 max-w-sm w-full">
                        <div class="bg-base-200/50 backdrop-blur-sm rounded-xl px-4 py-3 text-sm text-base-content/70 border border-base-content/5 flex items-start gap-3 text-left">
                            <Icon name="mingcute:edit-2-line" class="shrink-0 mt-0.5 opacity-50" size="16" />
                            <div class="flex-1 min-w-0 break-words">
                                <span class="block text-xs font-bold text-base-content/40 mb-0.5">备注</span>
                                {{ friendshipInfo.note }}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Main Actions -->
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <button @click="handleSendMessage" :disabled="isActionLoading"
                    class="btn btn-primary btn-lg w-full shadow-lg shadow-primary/10 border-none transform active:scale-[0.98] transition-all">
                    <span v-if="isActionLoading" class="loading loading-spinner loading-md"></span>
                    <template v-else>
                        <Icon name="mingcute:chat-4-fill" size="22" />
                        <span class="font-bold">发送消息</span>
                    </template>
                </button>
                
                <div class="grid grid-cols-2 gap-3">
                    <button @click="handleBlock" :disabled="isActionLoading"
                        class="btn btn-lg w-full bg-base-100/80 backdrop-blur-md border border-base-content/10 hover:bg-base-200 hover:border-base-content/20 transform active:scale-[0.98] transition-all">
                        <Icon :name="isBlocked ? 'mingcute:eye-line' : 'mingcute:eye-close-line'" size="20" 
                            :class="isBlocked ? 'text-base-content' : 'text-warning'" />
                        <span class="text-sm font-medium">{{ isBlocked ? '取消拉黑' : '拉黑' }}</span>
                    </button>
                    
                    <button @click="handleDeleteFriend" :disabled="isActionLoading"
                        class="btn btn-lg w-full bg-base-100/80 backdrop-blur-md border border-base-content/10 hover:bg-error/10 hover:border-error/30 hover:text-error transform active:scale-[0.98] transition-all">
                        <Icon name="mingcute:delete-2-line" size="20" />
                        <span class="text-sm font-medium">删除</span>
                    </button>
                </div>
            </div>

            <!-- Information Grid -->
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <!-- Info Card: Contact -->
                <div class="bg-base-100/60 backdrop-blur-md rounded-2xl p-5 border border-base-content/5 flex flex-col gap-4 hover:bg-base-100/80 transition-colors">
                    <h3 class="text-sm font-bold text-base-content/40 uppercase tracking-wider">联系信息</h3>
                    
                    <div class="flex items-center gap-4">
                        <div class="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
                            <Icon name="mingcute:mail-line" size="20" />
                        </div>
                        <div class="flex-1 min-w-0">
                            <div class="text-xs text-base-content/50 mb-0.5">电子邮箱</div>
                            <div class="text-sm font-medium truncate select-all">{{ userInfo.email }}</div>
                        </div>
                    </div>
                </div>

                <!-- Info Card: Meta -->
                <div class="bg-base-100/60 backdrop-blur-md rounded-2xl p-5 border border-base-content/5 flex flex-col gap-4 hover:bg-base-100/80 transition-colors">
                    <h3 class="text-sm font-bold text-base-content/40 uppercase tracking-wider">数据档案</h3>
                    
                    <div class="flex items-center gap-4">
                        <div class="w-10 h-10 rounded-xl bg-secondary/10 text-secondary flex items-center justify-center shrink-0">
                            <Icon name="mingcute:time-line" size="20" />
                        </div>
                        <div class="flex-1 min-w-0">
                            <div class="text-xs text-base-content/50 mb-0.5">注册时间</div>
                            <div class="text-sm font-medium">{{ formatTimeAgo(userInfo.createdAt) }}</div>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Footer Info -->
            <div class="text-center pb-8 opacity-30 text-xs">
                Junction Contact Profile
            </div>
        </div>
    </div>
</template>
