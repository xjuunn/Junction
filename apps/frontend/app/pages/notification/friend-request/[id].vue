<script setup lang="ts">
import * as NotificationApi from '~/api/notification';
import * as FriendshipApi from '~/api/friendship';

const route = useRoute();
const router = useRouter();
const toast = useToast();

const loading = ref(true);
const actionLoading = ref(false);
const friendship = ref<any>(null);
const notificationId = route.params.id as string;

const statusConfig = {
    PENDING: { label: '等待验证', class: 'text-warning', icon: 'mingcute:time-line', bg: 'bg-warning/10' },
    ACCEPTED: { label: '已添加', class: 'text-success', icon: 'mingcute:check-circle-fill', bg: 'bg-success/10' },
    REJECTED: { label: '已拒绝', class: 'text-error', icon: 'mingcute:close-circle-fill', bg: 'bg-error/10' },
    BLOCKED: { label: '已拉黑', class: 'text-base-content/50', icon: 'mingcute:forbid-circle-fill', bg: 'bg-base-content/10' }
};

const currentStatus = computed(() => {
    const status = friendship.value?.status as keyof typeof statusConfig;
    return statusConfig[status] || statusConfig.PENDING;
});

onMounted(() => {
    initData();
});

async function initData() {
    loading.value = true;
    try {
        const notiRes = await NotificationApi.findOne(notificationId);
        if (!notiRes.success || !notiRes.data) {
            toast.error('无法加载通知信息');
            router.back();
            return;
        }

        if (notiRes.data.status === 'UNREAD') {
            NotificationApi.markAsRead(notificationId);
        }

        const payload = notiRes.data.payload as { id: string };
        if (!payload?.id) {
            return;
        }

        const friendRes = await FriendshipApi.findOne(payload.id);

        if (friendRes.success && friendRes.data) {
            friendship.value = friendRes.data;
        }
    } catch (e) {
        toast.error('网络请求失败');
    } finally {
        loading.value = false;
    }
}

async function handleAction(action: 'accept' | 'reject') {
    if (!friendship.value) return;

    const targetUserId = friendship.value.friend.id;
    actionLoading.value = true;
    try {
        const apiCall = action === 'accept' ? FriendshipApi.accept : FriendshipApi.reject;
        const { success, error } = await apiCall(targetUserId);

        if (success) {
            toast.success(action === 'accept' ? '已添加好友' : '已拒绝请求');
            friendship.value.status = action === 'accept' ? 'ACCEPTED' : 'REJECTED';
        } else {
            toast.error(error || '操作失败');
        }
    } catch (e) {
        toast.error('网络错误');
    } finally {
        actionLoading.value = false;
    }
}

function handleGoBack() {
    router.back();
}

function formatDate(date: string) {
    return new Date(date).toLocaleString('zh-CN', {
        year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit'
    });
}
</script>

<template>
    <div class="h-full flex flex-col bg-base-100 overflow-y-auto relative">
        <div v-if="loading" class="flex-1 flex flex-col items-center justify-center gap-4">
            <span class="loading loading-spinner loading-lg text-primary"></span>
        </div>

        <div v-else-if="friendship" class="flex-1 flex flex-col">
            <div class="relative w-full h-64 overflow-hidden shrink-0">
                <div class="absolute inset-0 bg-gradient-to-t from-base-100 via-base-100/50 to-transparent"></div>

                <div class="absolute bottom-0 left-0 w-full p-8 flex flex-col items-center">
                    <div class="avatar mb-4">
                        <div
                            class="w-28 h-28 rounded-[2rem] shadow-2xl ring-4 ring-base-100 bg-base-100 flex items-center justify-center overflow-hidden">
                            <img v-if="friendship.friend?.image" :src="friendship.friend.image"
                                class="object-cover w-full h-full" />
                            <span v-else class="text-5xl font-bold text-base-content/20">
                                {{ friendship.friend?.name?.charAt(0).toUpperCase() }}
                            </span>
                        </div>
                    </div>
                </div>
            </div>

            <div class="flex-1 px-8 pb-8 flex flex-col items-center max-w-lg mx-auto w-full">
                <div class="text-center space-y-1 mb-8">
                    <h1 class="text-3xl font-black text-base-content tracking-tight">{{ friendship.friend?.name }}</h1>
                    <div class="flex items-center justify-center gap-2 text-base-content/50 font-medium">
                        <Icon name="mingcute:mail-line" />
                        <span>{{ friendship.friend?.email }}</span>
                    </div>
                </div>

                <div class="w-full space-y-6">
                    <div class="relative w-full">
                        <div
                            class="absolute -top-3 left-6 z-10 bg-base-100 px-2 text-xs font-bold text-primary flex items-center gap-1">
                            <Icon name="mingcute:message-3-fill" />
                            验证消息
                        </div>
                        <div
                            class="w-full bg-base-200/50 rounded-2xl p-6 text-center border border-base-200 relative group transition-all hover:bg-base-200/80">
                            <Icon name="mingcute:quote-left-fill"
                                class="absolute top-4 left-4 text-base-content/10 group-hover:text-primary/20 transition-colors"
                                size="32" />
                            <p class="text-base-content/80 text-lg font-medium leading-relaxed py-2">
                                {{ friendship.requestMsg || "请求添加你为好友" }}
                            </p>
                            <Icon name="mingcute:quote-right-fill"
                                class="absolute bottom-4 right-4 text-base-content/10 group-hover:text-primary/20 transition-colors"
                                size="32" />
                        </div>
                        <div class="text-center mt-3 text-xs text-base-content/30 font-medium">
                            {{ formatDate(friendship.createdAt) }}
                        </div>
                    </div>

                    <div v-if="friendship.status !== 'PENDING'"
                        class="w-full py-6 rounded-2xl flex items-center justify-center gap-2 font-bold transition-all"
                        :class="currentStatus.bg">
                        <div class="flex items-center gap-2" :class="currentStatus.class">
                            <Icon :name="currentStatus.icon" size="20" />
                            <span>{{ currentStatus.label }}</span>
                        </div>
                    </div>
                </div>

                <div v-if="friendship.status === 'PENDING'" class="mt-auto w-full pt-10 pb-6 grid grid-cols-2 gap-4">
                    <button @click="handleAction('reject')" :disabled="actionLoading"
                        class="btn btn-lg h-14 rounded-2xl bg-base-200 hover:bg-base-300 border-none text-base-content font-bold">
                        拒绝
                    </button>
                    <button @click="handleAction('accept')" :disabled="actionLoading"
                        class="btn btn-lg h-14 rounded-2xl btn-primary shadow-xl shadow-primary/20 font-bold text-primary-content">
                        <span v-if="actionLoading" class="loading loading-spinner"></span>
                        <span v-else>同意申请</span>
                    </button>
                </div>
            </div>
        </div>

        <div v-else class="flex-1 flex flex-col items-center justify-center text-base-content/30 gap-4">
            <Icon name="mingcute:file-unknown-line" size="64" />
            <p class="font-medium">无法找到该请求</p>
        </div>
    </div>
</template>
