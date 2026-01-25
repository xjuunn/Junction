<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue';
import { useRoute } from 'vue-router';
import * as conversationApi from '~/api/conversation';

type ConversationItem = NonNullable<NonNullable<Awaited<ReturnType<typeof conversationApi.findAll>>['data']>['items']>[number];

const route = useRoute();
const searchQuery = ref('');
const activeTab = ref<'all' | 'personal' | 'group'>('all');
const loading = ref(true);
const conversations = ref<ConversationItem[]>([]);
const appSocket = useSocket('app');
const { on: busOn, off: busOff } = useEmitt();

/**
 * 加载会话列表数据
 */
const fetchConversations = async (): Promise<void> => {
    loading.value = true;
    try {
        const res = await conversationApi.findAll({ page: 1, limit: 50 });
        if (res.success && res.data) conversations.value = res.data.items;
    } finally {
        loading.value = false;
    }
};


/**
 * 接收实时在线人数更新
 */
const handleStatusUpdate = (data: { conversationId: string; onlineCount: number }) => {
    const target = conversations.value.find(c => c.id === data.conversationId);
    if (target) target.online = data.onlineCount;
};

/**
 * 直接监听新消息事件，更新会话列表预览
 */
const handleNewMessage = (msg: any) => {
    const target = conversations.value.find(c => c.id === msg.conversationId);
    if (target) {
        target.lastMessage = {
            content: msg.content,
            type: msg.type,
            createdAt: msg.createdAt,
            sender: msg.sender
        };
        target.updatedAt = msg.createdAt;
    }
};

/**
 * 列表过滤与智能排序
 */
const filteredList = computed<ConversationItem[]>(() => {
    return conversations.value.filter(item => {
        const matchesSearch = (item.title || '').toLowerCase().includes(searchQuery.value.toLowerCase());
        const matchesTab = activeTab.value === 'all'
            ? true
            : activeTab.value === 'personal' ? item.type === 'PRIVATE' : item.type === 'GROUP';
        return matchesSearch && matchesTab;
    }).sort((a, b) => {
        const aP = a.mySettings?.pinned ? 1 : 0;
        const bP = b.mySettings?.pinned ? 1 : 0;
        return aP !== bP ? bP - aP : new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
    });
});

/**
 * 响应总线同步事件
 */
const handleMessageSync = (msg: any) => {
    const target = conversations.value.find(c => c.id === msg.conversationId);
    if (target) {
        target.lastMessage = {
            content: msg.content,
            type: msg.type,
            createdAt: msg.createdAt,
            sender: msg.sender
        };
        target.updatedAt = msg.createdAt;
    }
};

onMounted(() => {
    fetchConversations();
    appSocket.on('conversation-status', handleStatusUpdate);
    appSocket.on('new-message', handleNewMessage);
    busOn('chat:message-sync', handleMessageSync);
});

onUnmounted(() => {
    appSocket.off('conversation-status');
    appSocket.off('new-message');
    busOff('chat:message-sync', handleMessageSync);
});
</script>

<template>
    <div class="flex flex-col h-full bg-base-100/50 backdrop-blur-xl border-r border-base-200 overflow-hidden relative">

        <!-- 装饰性光晕 -->
        <div class="absolute -top-20 -left-20 w-40 h-40 bg-primary/5 blur-[80px] pointer-events-none"></div>

        <header class="p-6 pb-2 space-y-5">
            <div class="flex items-center justify-between">
                <div class="flex flex-col">
                    <h1 class="text-2xl font-black tracking-tight flex items-center gap-2">
                        消息
                        <div class="badge badge-ghost badge-sm font-bold opacity-50">{{ filteredList.length }}</div>
                    </h1>
                </div>
                <div class="flex gap-1 bg-base-200 p-1 rounded-full">
                    <button class="btn btn-ghost btn-circle btn-sm" @click="fetchConversations">
                        <Icon name="mingcute:refresh-3-line" size="18" :class="{ 'animate-spin': loading }" />
                    </button>
                    <button class="btn btn-primary btn-circle btn-sm shadow-lg shadow-primary/20">
                        <Icon name="mingcute:add-line" size="20" />
                    </button>
                </div>
            </div>

            <!-- 搜索增强 -->
            <div class="relative group">
                <div
                    class="absolute inset-y-0 left-4 flex items-center pointer-events-none text-base-content/30 group-focus-within:text-primary transition-colors">
                    <Icon name="mingcute:search-line" size="18" />
                </div>
                <input v-model="searchQuery" type="text" placeholder="搜索联系人..."
                    class="input input-sm h-11 w-full pl-11 bg-base-200/50 border-none focus:bg-base-100 rounded-2xl font-medium transition-all focus:ring-4 focus:ring-primary/10" />
            </div>

            <!-- 选项卡导航 -->
            <div class="tabs tabs-boxed bg-transparent p-0 gap-2">
                <button
                    v-for="tab in ([{ k: 'all', l: '全部' }, { k: 'personal', l: '私聊' }, { k: 'group', l: '群组' }] as const)"
                    :key="tab.k"
                    class="flex-1 btn btn-sm h-9 border-none rounded-xl font-bold transition-all no-animation"
                    :class="activeTab === tab.k ? 'bg-base-content text-base-100' : 'bg-base-200/50 text-base-content/50 hover:bg-base-300'"
                    @click="activeTab = tab.k">
                    {{ tab.l }}
                </button>
            </div>
        </header>

        <main class="flex-1 overflow-y-auto no-scrollbar py-2">
            <div v-if="loading && !conversations.length" class="p-6 space-y-6">
                <div v-for="i in 6" :key="i" class="flex items-center gap-4 animate-pulse">
                    <div class="w-14 h-14 bg-base-300 rounded-2xl"></div>
                    <div class="flex-1 space-y-3">
                        <div class="h-4 bg-base-300 rounded w-1/2"></div>
                        <div class="h-3 bg-base-200 rounded w-full"></div>
                    </div>
                </div>
            </div>

            <div v-else-if="!filteredList.length"
                class="h-full flex flex-col items-center justify-center text-center p-12 opacity-20">
                <Icon name="mingcute:ghost-line" size="64" />
                <p class="mt-4 font-black uppercase tracking-widest text-xs">空空如也</p>
            </div>

            <div v-else class="flex flex-col">
                <AppChatItem v-for="chat in filteredList" :key="chat.id" :data="chat" />
            </div>
        </main>
    </div>
</template>