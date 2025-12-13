<script setup lang="ts">
import * as NotificationApi from '~/api/notification';
import type { PrismaTypes } from '@junction/types';

const route = useRoute();
const router = useRouter();
const notification = ref<PrismaTypes.Notification | null>(null);
const isLoading = ref(true);

onMounted(() => {
    fetchDetail();
});

watch(() => route.params.id, (newId) => {
    if (newId) fetchDetail();
});

/** 获取通知详情 */
async function fetchDetail() {
    const id = route.params.id as string;
    if (!id) return;

    isLoading.value = true;
    try {
        const { success, data } = await NotificationApi.findOne(id);
        if (success && data) {
            notification.value = data;
        }
    } catch (error) {
        console.error("Failed to fetch notification detail", error);
    } finally {
        isLoading.value = false;
    }
}

/** 删除当前通知 */
async function handleDelete() {
    if (!notification.value) return;
    if (confirm('确定要删除这条通知吗？')) {
        const success = await NotificationApi.remove(notification.value.id);
        if (success) {
            router.replace('/notification');
        }
    }
}

/** 执行通知动作 */
function handleAction() {
    if (notification.value?.actionPath) {
        router.push(notification.value.actionPath);
    }
}

/** 格式化完整时间 */
function formatFullTime(dateStr?: Date | string) {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    return date.toLocaleString('zh-CN', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
    });
}

/** 映射图标 */
function getIcon(type: string) {
    const map: Record<string, string> = {
        SYSTEM: 'mingcute:macbook-line',
        WARNING: 'mingcute:alert-line',
        MESSAGE: 'mingcute:chat-4-line',
        FRIEND_REQUEST: 'mingcute:user-add-2-line'
    };
    return map[type] || 'mingcute:notification-line';
}
</script>

<template>
    <div class="h-full flex flex-col bg-base-100 overflow-y-auto">
        <!-- 加载中 -->
        <div v-if="isLoading" class="flex flex-col items-center justify-center h-full gap-4">
            <span class="loading loading-spinner loading-md text-base-content/30"></span>
        </div>

        <!-- 内容区域 -->
        <div v-else-if="notification" class="flex-1 min-h-0">
            <!-- 头部 Banner -->
            <div class="px-8 pt-10 pb-6 border-b border-base-200/50">
                <div class="flex items-start gap-5">
                    <div
                        class="w-16 h-16 rounded-3xl bg-base-200/50 flex items-center justify-center shrink-0 shadow-sm">
                        <img v-if="notification.icon && notification.icon.startsWith('http')" :src="notification.icon"
                            class="w-full h-full object-cover rounded-3xl" />
                        <Icon v-else :name="getIcon(notification.type)" size="32" class="text-primary" />
                    </div>
                    <div class="flex-1 space-y-2 pt-1">
                        <h1 class="text-2xl font-bold text-base-content leading-tight">
                            {{ notification.title }}
                        </h1>
                        <div class="flex items-center gap-3 text-sm">
                            <span class="badge badge-sm badge-ghost font-medium">
                                {{ notification.type }}
                            </span>
                            <span class="text-base-content/40 font-mono">
                                {{ formatFullTime(notification.createdAt) }}
                            </span>
                        </div>
                    </div>
                </div>
            </div>

            <!-- 正文 -->
            <div class="px-8 py-8 space-y-8">
                <div class="prose prose-base max-w-none text-base-content/80 leading-relaxed">
                    <p>{{ notification.content }}</p>
                </div>

                <!-- 动作按钮 -->
                <div v-if="notification.actionPath" class="flex items-center gap-3">
                    <button @click="handleAction" class="btn btn-primary btn-sm px-6 rounded-xl font-medium">
                        查看详情
                        <Icon name="mingcute:arrow-right-line" />
                    </button>
                </div>

                <!-- 附加信息 (开发者调试用或特定模块数据) -->
                <div v-if="notification.extra || notification.actionPayload"
                    class="collapse collapse-arrow bg-base-200/30 rounded-2xl border border-base-200">
                    <input type="checkbox" />
                    <div class="collapse-title text-sm font-medium text-base-content/60">
                        <div class="flex items-center gap-2">
                            <Icon name="mingcute:code-line" />
                            详细信息
                        </div>
                    </div>
                    <div class="collapse-content">
                        <pre
                            class="text-xs font-mono bg-base-100 p-4 rounded-xl overflow-x-auto text-base-content/70">{{ JSON.stringify({ payload: notification.actionPayload, extra: notification.extra }, null, 2) }}</pre>
                    </div>
                </div>
            </div>
        </div>

        <!-- 底部工具栏 -->
        <div v-if="notification"
            class="p-4 border-t border-base-200 flex justify-end gap-3 bg-base-100/80 backdrop-blur sticky bottom-0">
            <button @click="handleDelete" class="btn btn-ghost btn-sm text-error hover:bg-error/10">
                <Icon name="mingcute:delete-2-line" size="16" />
                删除通知
            </button>
        </div>

        <!-- 未找到 -->
        <div v-else class="flex flex-col items-center justify-center h-full text-base-content/30 gap-4">
            <Icon name="mingcute:file-unknown-line" size="48" />
            <span class="text-sm">通知不存在或已被删除</span>
        </div>
    </div>
</template>