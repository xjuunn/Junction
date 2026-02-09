<script setup lang="ts">
import * as NotificationApi from '~/api/notification';
import type { PrismaTypes } from '@junction/types';

definePageMeta({ layout: "main" });

const route = useRoute();
const router = useRouter();

/** 筛选类型定义 */
type FilterType = 'ALL' | 'UNREAD';

const activeFilter = ref<FilterType>('ALL');
const notifications = ref<PrismaTypes.Notification[]>([]);
const isLoading = ref(false);
const totalUnread = ref(0);

const pagination = reactive({
    page: 1,
    limit: 20,
    hasMore: true,
    total: 0
});

// 计算详情页是否打开
const isDetailOpen = computed(() => {
    return route.name === 'notification-friend-request-id' || route.name === 'notification-id';
});

// 当前选中的ID
const activeItemId = computed(() => route.params.id as string);

const filteredList = computed(() => {
    if (activeFilter.value === 'ALL') return notifications.value;
    return notifications.value.filter(n => n.status === 'UNREAD');
});

const filterTabs: { key: FilterType; label: string }[] = [
    { key: 'ALL', label: '全部' },
    { key: 'UNREAD', label: '未读' },
];

onMounted(() => {
    initialize();
});

watch(activeFilter, () => {
    resetPagination();
    fetchNotifications();
});

// 监听路由变化，如果进入详情页且该通知未读，则标记已读
watch(
    () => route.params.id,
    (newId) => {
        if (newId) handleReadSideEffect(newId as string);
    }
);

/** 初始化数据 */
async function initialize() {
    await Promise.all([
        fetchNotifications(),
        fetchUnreadCount()
    ]);
}

/** 重置分页状态 */
function resetPagination() {
    pagination.page = 1;
    pagination.hasMore = true;
    notifications.value = [];
}

/** 获取通知列表 */
async function fetchNotifications() {
    if (isLoading.value || !pagination.hasMore) return;

    isLoading.value = true;
    try {
        const whereInput: any = activeFilter.value === 'UNREAD' ? { status: 'UNREAD' } : {};

        const { data, success } = await NotificationApi.findAll({
            page: pagination.page,
            limit: pagination.limit,
            ...whereInput
        });

        if (success && data) {
            notifications.value = [...notifications.value, ...data.items];
            pagination.total = data.meta.total;
            pagination.hasMore = data.items.length === pagination.limit;
            if (pagination.hasMore) pagination.page++;
        }
    } catch (error) {
        console.error(error);
    } finally {
        isLoading.value = false;
    }
}

/** 获取未读数量 */
async function fetchUnreadCount() {
    const { data } = await NotificationApi.findUnreadCount();
    totalUnread.value = data || 0;
}

/** 处理列表项点击 */
async function handleItemClick(item: PrismaTypes.Notification) {
    if (item.status === 'UNREAD') {
        handleReadSideEffect(item.id);
        await NotificationApi.markAsRead(item.id);
    }
    if (item.type === 'FRIEND_REQUEST') {
        router.push(`/notification/friend-request/${item.id}`);
        return;
    }
    router.push(`/notification/${item.id}`);
}

/** 乐观更新已读状态 */
function handleReadSideEffect(id: string) {
    const index = notifications.value.findIndex(n => n.id === id);
    if (index !== -1 && notifications.value[index] && notifications.value[index].status === 'UNREAD') {
        notifications.value[index].status = 'READ';
        if (totalUnread.value > 0) totalUnread.value--;
    }
}

/** 全部已读 */
async function markAllRead() {
    const unreadItems = notifications.value.filter(n => n.status === 'UNREAD');
    if (unreadItems.length === 0) return;

    unreadItems.forEach(n => n.status = 'READ');
    totalUnread.value = 0;

    await NotificationApi.markAllAsRead();
}

/** 清空通知 */
async function clearAll() {
    notifications.value = [];
    totalUnread.value = 0;
    await NotificationApi.removeAll();
    if (route.name === 'notification-id') {
        router.push('/notification');
    }
}

/** 返回列表 (移动端) */
function handleBack() {
    router.push('/notification');
}

/** 根据类型获取图标 */
function getIconByType(type: string): string {
    const map: Record<string, string> = {
        SYSTEM: 'mingcute:computer-line',
        MESSAGE: 'mingcute:chat-4-line',
        FRIEND_REQUEST: 'mingcute:user-add-2-line',
        MODULE_UPDATE: 'mingcute:upload-2-line',
        DOWNLOAD: 'mingcute:download-2-line',
        WARNING: 'mingcute:alert-line',
        CUSTOM: 'mingcute:notification-line'
    };
    return map[type] || 'mingcute:notification-line';
}

/** 根据类型获取颜色 */
function getColorByType(type: string): string {
    const map: Record<string, string> = {
        SYSTEM: 'text-info',
        MESSAGE: 'text-success',
        FRIEND_REQUEST: 'text-primary',
        MODULE_UPDATE: 'text-secondary',
        DOWNLOAD: 'text-accent',
        WARNING: 'text-warning',
        CUSTOM: 'text-neutral-content'
    };
    return map[type] || 'text-base-content';
}

function getTypeLabel(type: string): string {
    const map: Record<string, string> = {
        SYSTEM: '系统',
        MESSAGE: '消息',
        FRIEND_REQUEST: '好友请求',
        MODULE_UPDATE: '模块更新',
        DOWNLOAD: '下载',
        WARNING: '警告',
        CUSTOM: '自定义'
    };
    return map[type] || type;
}

function getLevelLabel(level: string): string {
    const map: Record<string, string> = {
        LOW: '低',
        NORMAL: '普通',
        HIGH: '高',
        URGENT: '紧急'
    };
    return map[level] || level;
}

function getLevelBadgeClass(level: string): string {
    const map: Record<string, string> = {
        LOW: 'badge-ghost',
        NORMAL: 'badge-ghost',
        HIGH: 'badge-warning',
        URGENT: 'badge-error'
    };
    return map[level] || 'badge-ghost';
}

function getProcessLabel(status: string): string {
    const map: Record<string, string> = {
        PENDING: '待处理',
        PROCESSED: '已处理',
        EXPIRED: '已过期',
        CANCELED: '已取消'
    };
    return map[status] || status;
}
</script>

<template>
    <LayoutListDetail :show-detail="isDetailOpen" @back="handleBack">
        <template #list>
            <div class="flex flex-col h-full bg-base-100 select-none border-r border-base-content/5">
                <!-- 头部区域 -->
                <div class="px-5 pt-8 pb-4 shrink-0 space-y-5">
                    <div class="flex items-center justify-between px-1">
                        <div class="flex items-center gap-2">
                            <h1 class="text-2xl font-extrabold tracking-tight text-base-content">通知</h1>
                            <div v-if="totalUnread > 0"
                                class="h-5 min-w-[20px] px-1.5 rounded-full bg-error/10 text-error text-xs font-bold flex items-center justify-center">
                                {{ totalUnread > 99 ? '99+' : totalUnread }}
                            </div>
                        </div>
                        <div class="flex items-center gap-1">
                            <button @click="markAllRead" class="btn btn-ghost btn-sm btn-circle tooltip tooltip-bottom"
                                data-tip="全部已读">
                                <Icon name="mingcute:check-circle-line" size="18" class="text-base-content/60" />
                            </button>
                            <button @click="clearAll" class="btn btn-ghost btn-sm btn-circle tooltip tooltip-bottom"
                                data-tip="清空通知">
                                <Icon name="mingcute:delete-2-line" size="18" class="text-base-content/60" />
                            </button>
                        </div>
                    </div>

                    <!-- 筛选标签 -->
                    <div class="flex items-center gap-1.5 overflow-x-auto no-scrollbar mask-linear-fade py-1">
                        <button v-for="tab in filterTabs" :key="tab.key" @click="activeFilter = tab.key"
                            class="px-3.5 py-1.5 rounded-xl text-[13px] font-semibold transition-all whitespace-nowrap"
                            :class="activeFilter === tab.key
                                ? 'bg-base-content text-base-100 shadow-sm'
                                : 'bg-transparent text-base-content/50 hover:bg-base-200/60 hover:text-base-content'">
                            {{ tab.label }}
                        </button>
                    </div>
                </div>

                <!-- 列表区域 -->
                <div class="flex-1 overflow-y-auto px-3 py-2 scroll-smooth">
                    <!-- 加载状态 -->
                    <div v-if="isLoading && notifications.length === 0" class="space-y-3 px-1">
                        <div v-for="i in 6" :key="i" class="flex items-center gap-4 px-3 py-3.5">
                            <div class="w-11 h-11 rounded-2xl bg-base-200/70 animate-pulse shrink-0"></div>
                            <div class="flex-1 space-y-2">
                                <div class="h-4 bg-base-200/70 rounded w-1/3 animate-pulse"></div>
                                <div class="h-3 bg-base-200/50 rounded w-2/3 animate-pulse"></div>
                            </div>
                        </div>
                    </div>

                    <!-- 列表内容 -->
                    <div v-else-if="filteredList.length > 0" class="space-y-1 pb-10">
                        <div v-for="item in filteredList" :key="item.id" @click="handleItemClick(item)"
                            class="group relative flex items-center gap-4 px-3 py-3.5 rounded-2xl cursor-pointer transition-all duration-200"
                            :class="[
                                activeItemId === item.id
                                    ? 'bg-base-200/80'
                                    : 'hover:bg-base-200/40 bg-transparent'
                            ]">

                            <div class="relative shrink-0">
                                <div class="w-11 h-11 rounded-2xl flex items-center justify-center transition-all duration-300 overflow-hidden"
                                    :class="[
                                        activeItemId === item.id
                                            ? 'bg-base-100 shadow-sm scale-100'
                                            : 'bg-base-200/50 group-hover:bg-base-200 group-hover:scale-105'
                                    ]">
                                    <img v-if="item.cover && item.cover.startsWith('http')" :src="item.cover"
                                        class="w-full h-full object-cover" />
                                    <Icon v-else :name="getIconByType(item.type)" size="22" class="transition-colors"
                                        :class="activeItemId === item.id ? 'text-primary' : getColorByType(item.type)" />
                                </div>
                                <div v-if="item.status === 'UNREAD'"
                                    class="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 bg-primary rounded-full ring-2 ring-base-100 shadow-sm">
                                </div>
                            </div>

                            <div class="flex-1 min-w-0 flex flex-col justify-center gap-1">
                                <div class="flex items-center justify-between">
                                    <span class="font-semibold text-[15px] truncate leading-tight transition-colors"
                                        :class="[
                                            item.status === 'UNREAD' ? 'text-base-content' : 'text-base-content/70',
                                            activeItemId === item.id ? 'text-base-content' : ''
                                        ]">
                                        {{ item.title }}
                                    </span>
                                    <span class="text-[11px] font-medium text-base-content/30 whitespace-nowrap ml-2">
                                        {{ formatTimeAgo(item.createdAt) }}
                                    </span>
                                </div>
                                <div class="flex items-center gap-1.5 text-[11px] text-base-content/50">
                                    <span class="badge badge-xs badge-ghost">{{ getTypeLabel(item.type) }}</span>
                                    <span v-if="item.level" class="badge badge-xs" :class="getLevelBadgeClass(item.level)">{{ getLevelLabel(item.level) }}</span>
                                    <span v-if="item.processStatus" class="badge badge-xs badge-ghost">{{ getProcessLabel(item.processStatus) }}</span>
                                </div>
                                <div class="flex items-center justify-between h-4">
                                    <span class="text-[13px] truncate w-full leading-tight"
                                        :class="activeItemId === item.id ? 'text-base-content/60' : 'text-base-content/40'">
                                        {{ item.content }}
                                    </span>
                                </div>
                            </div>
                        </div>

                        <div v-if="pagination.hasMore" class="py-4 flex justify-center w-full">
                            <button @click="fetchNotifications"
                                class="btn btn-ghost btn-xs text-base-content/40 hover:text-base-content"
                                :disabled="isLoading">
                                <span v-if="isLoading" class="loading loading-spinner loading-xs"></span>
                                <span v-else>加载更多</span>
                            </button>
                        </div>
                    </div>

                    <!-- 空状态 -->
                    <div v-else class="flex flex-col items-center justify-center h-[60vh] text-base-content/20 gap-4">
                        <div class="w-20 h-20 rounded-3xl bg-base-200/30 flex items-center justify-center">
                            <Icon name="mingcute:notification-off-line" size="40" />
                        </div>
                        <p class="text-sm font-medium">暂无通知</p>
                    </div>
                </div>
            </div>
        </template>

        <template #detail>
            <NuxtPage />
        </template>

        <template #empty>
            <div class="flex flex-col items-center justify-center h-full text-base-content/30 gap-4">
                <div class="w-24 h-24 rounded-full bg-base-200/50 flex items-center justify-center">
                    <Icon name="mingcute:inbox-line" size="40" />
                </div>
                <span class="text-sm font-medium tracking-wide">选择一条通知查看详情</span>
            </div>
        </template>
    </LayoutListDetail>
</template>

<style scoped>
.no-scrollbar::-webkit-scrollbar {
    display: none;
}

.no-scrollbar {
    -ms-overflow-style: none;
    scrollbar-width: none;
}

.mask-linear-fade {
    mask-image: linear-gradient(to right, transparent 0%, black 5%, black 95%, transparent 100%);
    -webkit-mask-image: linear-gradient(to right, transparent 0%, black 5%, black 95%, transparent 100%);
}
</style>
