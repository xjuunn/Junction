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
    <div class="flex flex-col h-full bg-base-100">
        <div class="flex-1 overflow-y-auto">
            <div v-if="loading" class="flex flex-col items-center justify-center h-[60vh] space-y-6">
                <div class="w-24 h-24 rounded-full bg-base-200 animate-pulse"></div>
                <div class="h-6 w-32 bg-base-200 rounded animate-pulse"></div>
                <div class="h-4 w-48 bg-base-200 rounded animate-pulse"></div>
            </div>

            <div v-else-if="userInfo" class="flex flex-col">
                <div class="p-8 pb-4 flex flex-col items-center">
                    <BaseAvatar :text="userInfo.name" :height="100" :width="100" :radius="20" :src="userInfo.image || undefined"
                        :alt="userInfo.name" :placeholder-length="2" class="ring-2 ring-base-200" />

                    <h2 class="mt-4 text-2xl font-black tracking-tight flex items-center gap-2">
                        <span>{{ userInfo.name }}</span>
                        <span v-if="userInfo.accountType === 'BOT'" class="badge badge-outline badge-xs">机器人</span>
                    </h2>

                    <div class="mt-2 flex items-center gap-2 text-sm opacity-50">
                        <Icon name="mingcute:mail-line" size="14" />
                        <span>{{ userInfo.email }}</span>
                    </div>

                    <div v-if="friendshipInfo?.note" class="mt-4 px-4 py-2 bg-base-200 rounded-xl text-sm opacity-70">
                        备注：{{ friendshipInfo.note }}
                    </div>
                </div>

                <div class="px-6 py-4 space-y-2">
                    <div class="flex items-center justify-between px-4 py-3 bg-base-200/50 rounded-xl">
                        <div class="flex items-center gap-3">
                            <Icon name="mingcute:ai-line" size="18" class="opacity-50" />
                            <span class="text-sm font-medium">备注</span>
                        </div>
                        <span class="badge badge-ghost badge-sm">{{ userInfo.accountType || 'USER' }}</span>
                    </div>


                    <div class="flex items-center justify-between px-4 py-3 bg-base-200/50 rounded-xl">
                        <div class="flex items-center gap-3">
                            <Icon name="mingcute:calendar-line" size="18" class="opacity-50" />
                            <span class="text-sm font-medium">添加时间</span>
                        </div>
                        <span class="text-sm opacity-50">{{ formatTimeAgo(userInfo.createdAt) }}</span>
                    </div>

                    <div class="flex items-center justify-between px-4 py-3 bg-base-200/50 rounded-xl">
                        <div class="flex items-center gap-3">
                            <Icon name="mingcute:star-line" size="18" class="opacity-50" />
                            <span class="text-sm font-medium">用户角色</span>
                        </div>
                        <span class="badge badge-ghost badge-sm">{{ userInfo.role }}</span>
                    </div>
                </div>

                <div class="px-6 py-4 space-y-3">
                    <button @click="handleSendMessage" :disabled="isActionLoading"
                        class="btn btn-primary w-full shadow-lg shadow-primary/20">
                        <span v-if="isActionLoading" class="loading loading-spinner loading-sm"></span>
                        <Icon v-else name="mingcute:chat-4-line" size="18" />
                        发送消息
                    </button>

                    <div class="grid grid-cols-2 gap-3">
                        <button @click="handleBlock" :disabled="isActionLoading"
                            class="btn btn-warning btn-outline">
                            <Icon :name="isBlocked ? 'mingcute:eye-line' : 'mingcute:eye-close-line'" size="18" />
                            {{ isBlocked ? '取消拉黑' : '拉黑' }}
                        </button>
                        <button @click="handleDeleteFriend" :disabled="isActionLoading"
                            class="btn btn-error btn-outline">
                            <Icon name="mingcute:close-circle-line" size="18" />
                            删除
                        </button>
                    </div>
                </div>
            </div>

            <div v-else class="flex flex-col items-center justify-center h-[60vh] text-base-content/30 gap-4">
                <Icon name="mingcute:error-line" size="48" />
                <p class="text-sm font-medium">用户信息加载失败</p>
            </div>
        </div>
    </div>
</template>
