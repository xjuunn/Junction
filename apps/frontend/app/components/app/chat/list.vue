<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue';
import * as conversationApi from '~/api/conversation';

type ConversationItem = NonNullable<
    NonNullable<Awaited<ReturnType<typeof conversationApi.findAll>>['data']>['items']
>[number];

const searchQuery = ref('');
const activeTab = ref<'all' | 'personal' | 'group'>('all');
const loading = ref(true);
const conversations = ref<ConversationItem[]>([]);

/**
 * 获取 Socket 实例
 */
const appSocket = useSocket('app');

/**
 * 异步获取会话列表并同步状态
 */
const fetchConversations = async (): Promise<void> => {
    loading.value = true;
    try {
        const res = await conversationApi.findAll({ page: 1, limit: 50 });
        if (res.success && res.data) {
            conversations.value = res.data.items;
        } else {
            conversations.value = [];
        }
    } catch (e) {
        conversations.value = [];
    } finally {
        loading.value = false;
    }
};

/**
 * 实时同步在线状态核心逻辑
 */
const handleStatusUpdate = (data: { conversationId: string; onlineCount: number }) => {
    const target = conversations.value.find(c => c.id === data.conversationId);
    if (target) {
        target.online = data.onlineCount;
    }
};

/**
 * 计算最终显示列表
 */
const filteredList = computed<ConversationItem[]>(() => {
    return conversations.value.filter(item => {
        const title = item.title || '';
        const matchesSearch = title.toLowerCase().includes(searchQuery.value.toLowerCase());
        const matchesTab = activeTab.value === 'all'
            ? true
            : activeTab.value === 'personal' ? item.type === 'PRIVATE' : item.type === 'GROUP';
        return matchesSearch && matchesTab;
    }).sort((a, b) => {
        const aWeight = a.mySettings?.pinned ? 1 : 0;
        const bWeight = b.mySettings?.pinned ? 1 : 0;
        if (aWeight !== bWeight) return bWeight - aWeight;
        return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
    });
});

onMounted(() => {
    fetchConversations();
    // 监听服务端推送的在线人数变更
    appSocket.on('conversation-status', handleStatusUpdate);
});

onUnmounted(() => {
    // 销毁监听器，防止内存泄漏
    appSocket.off('conversation-status');
});
</script>

<template>
    <div class="flex flex-col h-full bg-base-100 overflow-hidden border-r border-base-200/50 select-none">

        <!-- 头部搜索与操作 -->
        <div class="px-6 pt-8 pb-4 space-y-4 shrink-0">
            <div class="flex items-center justify-between">
                <h1 class="text-2xl font-black tracking-tighter text-base-content">消息</h1>
                <div class="flex gap-1">
                    <button class="btn btn-ghost btn-circle btn-sm" @click="fetchConversations">
                        <Icon name="mingcute:refresh-3-line" size="18" :class="{ 'animate-spin': loading }" />
                    </button>
                    <button class="btn btn-ghost btn-circle btn-sm">
                        <Icon name="mingcute:add-line" size="18" />
                    </button>
                </div>
            </div>

            <div class="relative group">
                <div
                    class="input input-sm h-10 w-full bg-base-200 border-none focus:bg-base-100 text-base-content/50 group-focus-within:text-base-content/80 focus:ring-2 focus:ring-primary/20 transition-all text-[13px] rounded-xl">
                    <Icon name="mingcute:search-line" size="18" />
                    <input v-model="searchQuery" type="text" placeholder="搜索联系人或群组..." class="" />
                </div>
            </div>
        </div>

        <!-- 过滤标签卡片组 -->
        <div class="px-4 flex gap-1.5 mb-3 shrink-0 overflow-x-auto no-scrollbar">
            <button
                v-for="tab in ([{ k: 'all', l: '全部' }, { k: 'personal', l: '私人' }, { k: 'group', l: '群组' }] as const)"
                :key="tab.k" class="btn btn-xs h-8 px-4 border-none rounded-lg font-bold transition-all" :class="activeTab === tab.k
                    ? 'bg-primary text-primary-content shadow-md shadow-primary/10'
                    : 'bg-base-200 hover:bg-base-300 text-base-content/50'" @click="activeTab = tab.k">
                {{ tab.l }}
            </button>
        </div>

        <!-- 滚动列表容器 -->
        <div class="flex-1 overflow-y-auto pb-8 scroll-smooth custom-scrollbar">
            <!-- 加载骨架屏 -->
            <div v-if="loading && conversations.length === 0" class="p-4 space-y-3">
                <div v-for="i in 8" :key="i" class="flex items-center gap-4 animate-pulse px-2">
                    <div class="w-12 h-12 bg-base-300 rounded-[18px]"></div>
                    <div class="flex-1 space-y-2.5">
                        <div class="h-4 bg-base-300 rounded-md w-1/3"></div>
                        <div class="h-3 bg-base-300 rounded-md w-5/6"></div>
                    </div>
                </div>
            </div>

            <!-- 空状态 -->
            <div v-else-if="filteredList.length === 0"
                class="h-full flex flex-col items-center justify-center opacity-20 p-12 text-center">
                <Icon name="mingcute:chat-4-line" size="56" class="mb-4" />
                <p class="text-sm font-bold tracking-tight">暂无相关会话</p>
            </div>

            <!-- 渲染会话项 -->
            <div v-else class="space-y-0.5 py-1">
                <AppChatItem v-for="chat in filteredList" :key="chat.id" :data="chat" />
            </div>
        </div>
    </div>
</template>

<style scoped>
.custom-scrollbar::-webkit-scrollbar {
    width: 4px;
}

.custom-scrollbar::-webkit-scrollbar-thumb {
    background: hsl(var(--bc) / 0.1);
    border-radius: 10px;
}

.custom-scrollbar::-webkit-scrollbar-track {
    background: transparent;
}

.no-scrollbar::-webkit-scrollbar {
    display: none;
}
</style>