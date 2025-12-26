<script setup lang="ts">
import * as NotificationApi from '~/api/notification';
import * as FriendshipApi from '~/api/friendship';

/**
 * 修复类型定义：
 * 使用联合类型覆盖 findOne 和 accept/reject 可能返回的所有结构
 */
type FriendshipData =
    | NonNullable<Awaited<ReturnType<typeof FriendshipApi.findOne>>['data']>
    | NonNullable<Awaited<ReturnType<typeof FriendshipApi.accept>>['data']>;

const route = useRoute();
const router = useRouter();
const toast = useToast();

const loading = ref(true);
const actionLoading = ref(false);
const friendship = ref<FriendshipData | null>(null);
const notificationId = route.params.id as string;

const statusConfig = {
    PENDING: { label: '等待验证', class: 'text-warning', icon: 'mingcute:time-line', bg: 'bg-warning/10' },
    ACCEPTED: { label: '已添加', class: 'text-success', icon: 'mingcute:check-circle-fill', bg: 'bg-success/10' },
    REJECTED: { label: '已拒绝', class: 'text-error', icon: 'mingcute:close-circle-fill', bg: 'bg-error/10' },
    BLOCKED: { label: '已拉黑', class: 'text-base-content/50', icon: 'mingcute:forbid-circle-fill', bg: 'bg-base-content/10' }
};

const currentStatus = computed(() => {
    const status = (friendship.value?.status || 'PENDING') as keyof typeof statusConfig;
    return statusConfig[status];
});

onMounted(() => {
    initData();
});

/**
 * 获取初始数据
 */
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
            await NotificationApi.markAsRead(notificationId);
        }

        const payload = notiRes.data.payload as { id: string };
        if (!payload?.id) return;

        const friendRes = await FriendshipApi.findOne(payload.id);

        if (friendRes.success && friendRes.data) {
            // 显式断言或确保后端返回结构一致
            friendship.value = friendRes.data as FriendshipData;
        }
    } catch (e) {
        toast.error('网络请求失败');
    } finally {
        loading.value = false;
    }
}

/**
 * 处理接受或拒绝动作
 */
async function handleAction(action: 'accept' | 'reject') {
    if (!friendship.value?.friend?.id) return;

    const targetUserId = friendship.value.friend.id;
    actionLoading.value = true;
    try {
        const apiCall = action === 'accept' ? FriendshipApi.accept : FriendshipApi.reject;
        const res = await apiCall(targetUserId);

        if (res.success && res.data) {
            toast.success(action === 'accept' ? '已通过申请' : '已拒绝请求');
            // 修复：此时 res.data 的类型通过后端 include 的补全已能匹配 FriendshipData
            friendship.value = res.data as FriendshipData;
        } else {
            toast.error(res.error || '操作失败');
        }
    } catch (e) {
        toast.error('网络错误');
    } finally {
        actionLoading.value = false;
    }
}

function formatDate(date: string | Date) {
    if (!date) return '';
    return new Date(date).toLocaleString('zh-CN', {
        year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false
    });
}
</script>

<template>
    <div class="h-full flex flex-col bg-base-100 overflow-y-auto relative select-none">
        <div v-if="loading" class="flex-1 flex flex-col items-center justify-center gap-4">
            <span class="loading loading-spinner loading-lg text-primary opacity-20"></span>
        </div>

        <div v-else-if="friendship" class="flex-1 flex flex-col">
            <div class="relative w-full h-56 overflow-hidden shrink-0">
                <div class="absolute inset-0 bg-gradient-to-t from-base-100 via-base-100/40 to-transparent"></div>
                <div class="absolute bottom-0 left-0 w-full p-8 flex flex-col items-center">
                    <BaseAvatar :src="friendship.friend?.image" :text="friendship.friend?.name" :size="96" :radius="32"
                        class="shadow-2xl ring-4 ring-base-100" />
                </div>
            </div>

            <div class="flex-1 px-8 pb-8 flex flex-col items-center max-w-lg mx-auto w-full">
                <div class="text-center space-y-1 mb-10">
                    <h1 class="text-2xl font-black text-base-content tracking-tight">{{ friendship.friend?.name }}</h1>
                    <div
                        class="flex items-center justify-center gap-2 text-[11px] font-mono text-base-content/40 uppercase tracking-widest">
                        <Icon name="mingcute:mail-line" />
                        <span>{{ friendship.friend?.email }}</span>
                    </div>
                </div>

                <div class="w-full space-y-6">
                    <div class="relative w-full">
                        <div
                            class="absolute -top-2.5 left-5 z-10 bg-base-100 px-2 text-[10px] font-black uppercase tracking-widest text-primary flex items-center gap-1">
                            验证消息
                        </div>
                        <div
                            class="w-full bg-base-200/50 rounded-2xl p-6 text-center border border-base-content/5 relative group transition-all">
                            <Icon name="mingcute:quote-left-fill" class="absolute top-4 left-4 text-base-content/5"
                                size="32" />
                            <p class="text-sm font-medium leading-relaxed text-base-content/80 relative z-10">
                                {{ friendship.requestMsg || "请求添加你为好友" }}
                            </p>
                        </div>
                        <div class="text-center mt-3 text-[10px] text-base-content/30 font-mono">
                            {{ formatDate(friendship.createdAt) }}
                        </div>
                    </div>

                    <div v-if="friendship.status !== 'PENDING'"
                        class="w-full py-4 rounded-xl flex items-center justify-center gap-2 font-bold transition-all border border-base-content/5"
                        :class="currentStatus.bg">
                        <div class="flex items-center gap-2" :class="currentStatus.class">
                            <Icon :name="currentStatus.icon" size="18" />
                            <span class="text-xs">{{ currentStatus.label }}</span>
                        </div>
                    </div>
                </div>

                <div v-if="friendship.status === 'PENDING'" class="mt-auto w-full pt-12 pb-6 flex gap-3">
                    <button @click="handleAction('reject')" :disabled="actionLoading"
                        class="btn btn-ghost flex-1 h-12 rounded-xl bg-base-200 hover:bg-base-300 border-none text-xs font-bold">
                        忽略
                    </button>
                    <button @click="handleAction('accept')" :disabled="actionLoading"
                        class="btn btn-primary flex-1 h-12 rounded-xl shadow-lg shadow-primary/20 text-xs font-bold">
                        <span v-if="actionLoading" class="loading loading-spinner loading-xs"></span>
                        <span v-else>通过申请</span>
                    </button>
                </div>
            </div>
        </div>
    </div>
</template>