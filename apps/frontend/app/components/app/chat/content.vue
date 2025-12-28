<script setup lang="ts">
import * as messageApi from '~/api/message';

const route = useRoute();
const userStore = useUserStore();
const toast = useToast();
const dialog = useDialog();

const conversationId = computed(() => route.params.id as string);
const currentUserId = computed(() => unref(userStore.user)?.id);

const messages = ref<any[]>([]);
const replyText = ref('');
const loading = ref(false);
const sending = ref(false);
const hasMore = ref(true);

/**
 * 消息列表引用的显式类型标注
 */
const listRef = ref<{ scrollToBottom: () => void } | null>(null);

/**
 * 格式化消息的时间轴分割线
 * @param date 消息时间戳
 */
const formatDivider = (date: string) => {
    return new Date(date).toLocaleDateString('zh-CN', { month: 'long', day: 'numeric', weekday: 'short' });
};

/**
 * 获取消息列表数据
 * @param isMore 是否为加载更多历史记录
 */
const fetchMessages = async (isMore = false) => {
    if (loading.value || !conversationId.value) return;
    loading.value = true;

    try {
        const cursor = isMore && messages.value.length > 0 ? messages.value[0].sequence : undefined;
        const res = await messageApi.findAll(conversationId.value, { limit: 30 }, cursor);

        if (res.data) {
            if (isMore) {
                messages.value = [...res.data.items, ...messages.value];
            } else {
                messages.value = res.data.items;
                nextTick(() => listRef.value?.scrollToBottom());
            }
            hasMore.value = res.data.items.length === 30;
        }
    } catch (e) {
        toast.error('历史消息同步失败');
    } finally {
        loading.value = false;
    }
};

/**
 * 发送当前编辑的消息
 */
const handleSend = async () => {
    if (!replyText.value.trim() || sending.value) return;

    const content = replyText.value;
    replyText.value = '';
    sending.value = true;

    try {
        const res = await messageApi.send({
            conversationId: conversationId.value,
            content,
            type: 'TEXT',
            clientMessageId: `c_${Date.now()}`
        });

        if (res.data) {
            messages.value.push(res.data);
            nextTick(() => listRef.value?.scrollToBottom());
        }
    } catch (e) {
        replyText.value = content;
        toast.error('消息发送失败');
    } finally {
        sending.value = false;
    }
};

/**
 * 撤回一条已发送的消息
 * @param id 消息唯一标识
 */
const handleRevoke = async (id: string) => {
    const confirmed = await dialog.confirm({ content: '确定要撤回这条消息吗？', type: 'warning' });
    if (!confirmed) return;

    try {
        const res = await messageApi.revoke(id);
        if (res.data) {
            const idx = messages.value.findIndex(m => m.id === id);
            if (idx !== -1) messages.value[idx] = res.data;
        }
    } catch (e) {
        toast.error('撤回失败');
    }
};

/**
 * 监听路由 ID 变化，重置并刷新会话
 */
watch(() => conversationId.value, () => {
    messages.value = [];
    fetchMessages();
}, { immediate: true });
</script>

<template>
    <div class="flex flex-col h-full bg-base-100 overflow-hidden relative">
        <!-- 顶部状态导航 -->
        <header
            class="navbar h-14 min-h-0 px-4 md:px-6 border-b border-base-content/5 bg-base-100/80 backdrop-blur-md sticky top-0 z-30 shrink-0">
            <div class="flex-1 flex items-center gap-3">
                <div class="avatar online size-9 rounded-full bg-base-300">
                    <img src="https://picsum.photos/100" alt="Room" />
                </div>
                <div>
                    <h1 class="text-sm font-bold tracking-tight text-base-content">讨论组</h1>
                    <div class="text-[10px] font-medium opacity-40 uppercase tracking-widest flex items-center gap-1">
                        <span class="status status-success size-1.5"></span>
                        活跃中
                    </div>
                </div>
            </div>

            <div class="flex-none">
                <button class="btn btn-sm btn-ghost btn-circle text-base-content/40">
                    <Icon name="mingcute:more-2-line" size="18" />
                </button>
            </div>
        </header>

        <!-- 核心消息列表 -->
        <AppMessageList ref="listRef" :loading="loading" :has-more="hasMore" @load-more="fetchMessages(true)">
            <div v-for="(msg, index) in messages" :key="msg.id">
                <!-- 时间日期分割线 -->
                <div v-if="index === 0 || new Date(msg.createdAt).toDateString() !== new Date(messages[index - 1].createdAt).toDateString()"
                    class="divider divider-center my-8 opacity-30">
                    <span class="badge badge-sm badge-soft font-bold text-[10px] uppercase tracking-tighter">
                        {{ formatDivider(msg.createdAt) }}
                    </span>
                </div>

                <AppMessageItem :message="msg" :is-me="msg.senderId === currentUserId" @revoke="handleRevoke" />
            </div>

            <!-- 发送中临时占位 -->
            <div v-if="sending" class="chat chat-end opacity-40">
                <div class="chat-bubble chat-bubble-primary loading loading-dots loading-sm min-h-0 py-4 px-6"></div>
            </div>
        </AppMessageList>

        <!-- 底部编辑器区 -->
        <footer class="p-4 md:p-6 bg-gradient-to-t from-base-100 via-base-100 to-transparent shrink-0">
            <div class="max-w-4xl mx-auto">
                <BaseEditor v-model="replyText" :disabled="sending" @send="handleSend" />
            </div>
        </footer>
    </div>
</template>

<style scoped>
/* 隐藏原生滚动条 */
::-webkit-scrollbar {
    width: 4px;
}

::-webkit-scrollbar-thumb {
    background: color-mix(in srgb, var(--fallback-bc, oklch(var(--bc))), transparent 90%);
    border-radius: 10px;
}
</style>