<script setup lang="ts">
import * as messageApi from '~/api/message';
import * as conversationApi from '~/api/conversation';

const route = useRoute();
const userStore = useUserStore();
const toast = useToast();
const appSocket = useSocket('app');

const conversationId = computed(() => route.params.id as string);
const currentUserId = computed(() => unref(userStore.user)?.id);
const currentConversation = ref<any>(null);
const messages = ref<any[]>([]);
const loading = ref(false);
const sending = ref(false);
const hasMore = ref(true);
const messageJson = ref<any>(null);
const messagePlainText = ref('');

const listRef = ref<any>(null);
const editorRef = ref<any>(null);

/**
 * 核心滚动函数：通过强制偏移量确保触达滚动极限
 */
const scrollToBottom = (behavior: ScrollBehavior = 'auto') => {
    nextTick(() => {
        const el = listRef.value?.$el;
        if (!el) return;

        // 使用双重渲染帧同步布局状态
        requestAnimationFrame(() => {
            el.scrollTo({
                top: el.scrollHeight + 99999, // 赋予极大值强制触底
                behavior
            });

            // 补偿处理：针对图片或头像加载缓慢导致的后续高度变化
            if (behavior === 'auto') {
                setTimeout(() => {
                    el.scrollTop = el.scrollHeight;
                }, 50);
            }
        });
    });
};

/**
 * 加载历史消息：区分初始化滚动与向上加载位置保持
 */
const fetchMessages = async (isMore = false) => {
    if (loading.value || !conversationId.value) return;
    loading.value = true;
    try {
        const cursor = isMore && messages.value.length > 0 ? messages.value[0].sequence : undefined;
        const res = await messageApi.findAll(conversationId.value, { limit: 30 }, cursor);
        if (res.data) {
            if (isMore) {
                const el = listRef.value?.$el;
                const prevHeight = el?.scrollHeight ?? 0;
                messages.value = [...res.data.items, ...messages.value];
                nextTick(() => {
                    if (el) el.scrollTop = el.scrollHeight - prevHeight;
                });
            } else {
                messages.value = res.data.items;
                scrollToBottom('auto');
            }
            hasMore.value = res.data.items.length === 30;
        }
    } finally {
        loading.value = false;
    }
};

/**
 * 获取会话元数据
 */
const fetchConversation = async () => {
    if (!conversationId.value) return;
    const res = await conversationApi.findOne(conversationId.value);
    if (res.data) currentConversation.value = res.data;
};

/**
 * 发送消息：清空编辑器并强制平滑滚动到底部
 */
const handleSend = async () => {
    const text = messagePlainText.value.trim();
    if (!text || sending.value) return;
    sending.value = true;
    try {
        const res = await messageApi.send({
            conversationId: conversationId.value,
            content: text.length > 200 ? text.substring(0, 197) + '...' : text,
            payload: toRaw(messageJson.value),
            type: 'TEXT',
            clientMessageId: `c_${Date.now()}`
        });
        if (res.data) {
            messages.value.push(res.data);
            editorRef.value?.clear();
            scrollToBottom('smooth');
        }
    } finally {
        sending.value = false;
    }
};

/**
 * 实时消息监听
 */
const setupSocketListeners = () => {
    appSocket.on('new-message', (msg: any) => {
        if (msg.conversationId === conversationId.value) {
            const exists = messages.value.some(m => m.id === msg.id);
            if (!exists) {
                messages.value.push(msg);
                scrollToBottom('smooth');
            }
        }
    });
};

/**
 * 监听会话切换
 */
watch(() => conversationId.value, () => {
    messages.value = [];
    fetchConversation();
    fetchMessages();
}, { immediate: true });

onMounted(setupSocketListeners);
onUnmounted(() => appSocket.off('new-message'));
</script>

<template>
    <div class="flex flex-col h-full bg-base-100 overflow-hidden relative">
        <header class="navbar h-16 min-h-0 px-6 border-b border-base-200 bg-base-100/80 backdrop-blur-xl z-20 shrink-0">
            <div class="flex-1 flex items-center gap-4">
                <button class="btn btn-ghost btn-circle btn-sm md:hidden" @click="navigateTo('/chat')">
                    <Icon name="mingcute:left-line" size="20" />
                </button>
                <div class="relative">
                    <BaseAvatar :text="currentConversation?.title" :src="currentConversation?.avatar" :height="40"
                        :placeholder-length="2" :width="40" :radius="12" />
                    <div v-if="currentConversation?.type === 'PRIVATE' && currentConversation?.online"
                        class="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-success border-2 border-base-100 rounded-full">
                    </div>
                </div>
                <div class="flex flex-col min-w-0">
                    <h2 class="text-sm font-black tracking-tight truncate">{{ currentConversation?.title || '加载中...' }}
                    </h2>
                    <span class="text-[10px] font-bold opacity-40 uppercase tracking-widest">
                        {{ currentConversation?.type === 'PRIVATE' ? (currentConversation.online ? '在线' : '离线') :
                            `${currentConversation?.memberCount} 成员` }}
                    </span>
                </div>
            </div>
            <div class="flex-none">
                <button class="btn btn-ghost btn-circle btn-sm opacity-40 hover:opacity-100">
                    <Icon name="mingcute:search-2-line" size="18" />
                </button>
                <button class="btn btn-ghost btn-circle btn-sm opacity-40 hover:opacity-100">
                    <Icon name="mingcute:more-1-line" size="18" />
                </button>
            </div>
        </header>

        <!-- 关键修复：增加 overflow-anchor 并在 List 组件上直接应用滚动样式 -->
        <AppMessageList ref="listRef" :loading="loading" :has-more="hasMore" @load-more="fetchMessages(true)"
            class="flex-1 overflow-y-auto overscroll-contain px-4 md:px-6 py-4 [overflow-anchor:none]">
            <div v-for="(msg, index) in messages" :key="msg.id" class="py-1">
                <div v-if="index === 0 || new Date(msg.createdAt).toDateString() !== new Date(messages[index - 1].createdAt).toDateString()"
                    class="divider divider-center my-8 opacity-20 font-black text-[10px] uppercase tracking-widest">
                    {{ new Date(msg.createdAt).toLocaleDateString([], { month: 'short', day: 'numeric' }) }}
                </div>
                <AppMessageItem :message="msg" :is-me="msg.senderId === currentUserId" />
            </div>
            <div v-if="sending" class="chat chat-end animate-pulse opacity-50">
                <div class="chat-bubble chat-bubble-primary">...</div>
            </div>
        </AppMessageList>

        <footer class="p-4 md:p-6 bg-gradient-to-t from-base-100 via-base-100 to-transparent z-10">
            <div class="max-w-4xl mx-auto">
                <div
                    class="bg-base-200/80 backdrop-blur-lg border border-base-content/5 rounded-[24px] p-2 shadow-2xl transition-all focus-within:ring-4 focus-within:ring-primary/5">
                    <BaseEditor ref="editorRef" v-model="messageJson" :disabled="sending" @send="handleSend"
                        @textChange="val => messagePlainText = val" class="px-4 py-2" />
                    <div class="flex items-center justify-between px-2 pt-2 border-t border-base-content/5">
                        <div class="flex gap-1">
                            <button class="btn btn-ghost btn-circle btn-sm opacity-40 hover:text-primary">
                                <Icon name="mingcute:emoji-line" size="20" />
                            </button>
                            <button class="btn btn-ghost btn-circle btn-sm opacity-40 hover:text-primary">
                                <Icon name="mingcute:pic-line" size="20" />
                            </button>
                            <button class="btn btn-ghost btn-circle btn-sm opacity-40 hover:text-primary">
                                <Icon name="mingcute:attachment-2-line" size="20" />
                            </button>
                        </div>
                        <button class="btn btn-primary btn-sm px-6 rounded-xl font-black shadow-lg shadow-primary/20"
                            :disabled="!messagePlainText.trim() || sending" @click="handleSend">
                            发送
                            <Icon name="mingcute:send-plane-fill" size="16" class="ml-1" />
                        </button>
                    </div>
                </div>
            </div>
        </footer>
    </div>
</template>

<style scoped>
/* 确保自定义滚动条不影响容器高度计算 */
.custom-scrollbar {
    scrollbar-gutter: stable;
}
</style>