<script setup lang="ts">
import * as messageApi from '~/api/message';
import * as conversationApi from '~/api/conversation';
import { PrismaValues } from '@junction/types';

/**
 * 消息协作中心核心组件
 * 负责会话状态管理、消息流调度、富文本编辑器交互及实时状态同步逻辑
 */
const route = useRoute();
const userStore = useUserStore();
const toast = useToast();
const dialog = useDialog();

// 基础状态定义
const conversationId = computed(() => route.params.id as string);
const currentUserId = computed(() => unref(userStore.user)?.id);
const currentConversation = ref<any>(null);

// 消息流状态
const messages = ref<any[]>([]);
const loading = ref(false);
const sending = ref(false);
const hasMore = ref(true);

// 编辑器数据状态
const messageJson = ref<any>(null);
const messagePlainText = ref('');

// 模板引用
const listRef = ref<{ scrollToBottom: () => void } | null>(null);
const editorRef = ref<{ clear: () => void } | null>(null);

/**
 * 格式化时间线分割标签
 * @param date 时间字符串
 */
const formatDivider = (date: string) => {
    return new Date(date).toLocaleDateString('zh-CN', {
        month: 'long',
        day: 'numeric',
        weekday: 'short'
    });
};

/**
 * 分页加载历史消息
 * @param isMore 是否为追加历史模式
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
                // 首次加载或切换会话时，滚动到底部
                nextTick(() => listRef.value?.scrollToBottom());
                // 自动上报已读进度
                if (messages.value.length > 0) {
                    reportReadStatus(messages.value[messages.value.length - 1].id);
                }
            }
            hasMore.value = res.data.items.length === 30;
        }
    } catch (e) {
        toast.error('同步消息失败');
    } finally {
        loading.value = false;
    }
};

/**
 * 获取会话元数据详情
 */
const fetchConversation = async () => {
    if (!conversationId.value) return;
    try {
        const res = await conversationApi.findOne(conversationId.value);
        if (res.data) {
            currentConversation.value = res.data;
        }
    } catch (e) {
        toast.error('获取会话详情失败');
    }
};

/**
 * 统一数据加载调度
 */
const fetchData = async () => {
    if (!conversationId.value) return;
    await Promise.all([
        fetchConversation(),
        fetchMessages()
    ]);
};

/**
 * 上报已读状态
 * @param lastMessageId 最后一条可见消息ID
 */
const reportReadStatus = async (lastMessageId: string) => {
    try {
        await messageApi.markAsRead(conversationId.value, lastMessageId);
    } catch (e) {
        // 静默处理上报失败
    }
};

/**
 * 执行消息发送逻辑
 */
const handleSend = async () => {
    const text = messagePlainText.value.trim();
    if (!text || sending.value) return;

    sending.value = true;
    const payload = toRaw(messageJson.value);

    // 生成摘要内容供预览使用
    const truncatedContent = text.length > 200 ? text.substring(0, 197) + '...' : text;

    try {
        const res = await messageApi.send({
            conversationId: conversationId.value,
            content: truncatedContent,
            payload: payload as any,
            type: 'TEXT',
            clientMessageId: `c_${Date.now()}`
        });

        if (res.data) {
            messages.value.push(res.data);
            editorRef.value?.clear();
            messagePlainText.value = '';
            nextTick(() => listRef.value?.scrollToBottom());
            // 更新本地会话最后更新时间，用于优化体验
            if (currentConversation.value) currentConversation.value.updatedAt = new Date();
        }
    } catch (e) {
        toast.error('发送失败，请重试');
    } finally {
        sending.value = false;
    }
};

/**
 * 消息撤回二次确认与处理
 * @param id 消息ID
 */
const handleRevoke = async (id: string) => {
    const ok = await dialog.confirm({
        content: '确定要撤回这条消息吗？',
        type: 'warning',
        confirmText: '撤回',
        cancelText: '取消'
    });
    if (!ok) return;

    try {
        const res = await messageApi.revoke(id);
        if (res.data) {
            const idx = messages.value.findIndex(m => m.id === id);
            if (idx !== -1) messages.value[idx] = res.data;
        }
    } catch (e) {
        toast.error('撤回失败，可能已超过时限');
    }
};

/**
 * 监听编辑器纯文本内容变化
 * @param text 剥离HTML后的纯文本
 */
const onEditorTextChange = (text: string) => {
    messagePlainText.value = text;
};

/**
 * 监听路由切换，重置并刷新会话数据
 */
watch(() => conversationId.value, () => {
    messages.value = [];
    currentConversation.value = null;
    messageJson.value = null;
    messagePlainText.value = '';
    fetchData();
}, { immediate: true });
</script>

<template>
    <div class="flex flex-col h-full bg-base-100 overflow-hidden relative">
        <!-- 会话头部导航 -->
        <header
            class="navbar h-14 min-h-0 px-6 border-b border-base-content/5 bg-base-100/80 backdrop-blur-md z-30 shrink-0">
            <div class="flex-1 flex items-center gap-3 overflow-hidden">
                <div class="avatar online size-9 rounded-full bg-base-300 shrink-0">
                    <img v-if="currentConversation?.avatar" :src="resolveAssetUrl(currentConversation.avatar)" />
                    <div v-else
                        class="flex items-center justify-center h-full w-full uppercase font-bold text-xs bg-primary text-primary-content">
                        {{ currentConversation?.title?.charAt(0) || 'C' }}
                    </div>
                </div>
                <div class="flex flex-col overflow-hidden">
                    <h1 class="text-sm font-bold tracking-tight truncate text-base-content">
                        {{ currentConversation?.title || '正在载入...' }}
                    </h1>
                    <div class="text-[10px] opacity-40 uppercase tracking-widest flex items-center gap-1">
                        <template v-if="currentConversation">
                            <span class="status status-success size-1.5"></span>
                            {{ currentConversation.type === 'PRIVATE' ? '在线' : `${currentConversation.memberCount} 位成员`
                            }}
                        </template>
                        <span v-else>正在同步...</span>
                    </div>
                </div>
            </div>
            <div class="flex-none gap-2">
                <button class="btn btn-sm btn-ghost btn-circle text-base-content/40 hover:text-primary">
                    <Icon name="mingcute:phone-line" size="18" />
                </button>
                <button class="btn btn-sm btn-ghost btn-circle text-base-content/40 hover:text-primary">
                    <Icon name="mingcute:more-2-line" size="18" />
                </button>
            </div>
        </header>

        <!-- 消息列表滚动区 -->
        <AppMessageList ref="listRef" :loading="loading" :has-more="hasMore" @load-more="fetchMessages(true)">
            <div v-for="(msg, index) in messages" :key="msg.id">
                <!-- 日期分割线逻辑 -->
                <div v-if="index === 0 || new Date(msg.createdAt).toDateString() !== new Date(messages[index - 1].createdAt).toDateString()"
                    class="divider divider-center my-8 opacity-30 px-10">
                    <span class="badge badge-sm badge-soft font-bold text-[10px] uppercase tracking-tighter">
                        {{ formatDivider(msg.createdAt) }}
                    </span>
                </div>

                <AppMessageItem :message="msg" :is-me="msg.senderId === currentUserId" @revoke="handleRevoke" />
            </div>

            <!-- 发送中临时反馈 -->
            <div v-if="sending" class="chat chat-end opacity-40 animate-in fade-in slide-in-from-bottom-2">
                <div class="chat-bubble chat-bubble-primary loading loading-dots loading-sm min-h-0 py-4 px-6"></div>
            </div>
        </AppMessageList>

        <!-- 底部输入编辑区 -->
        <footer class="p-4 md:p-6 bg-base-100 border-t border-base-content/5 shrink-0 transition-all">
            <div class="max-w-4xl mx-auto flex flex-col gap-3">
                <div
                    class="flex flex-col gap-2 p-3 bg-base-200/50 focus-within:bg-base-100 focus-within:ring-2 focus-within:ring-primary/10 border border-base-content/5 rounded-2xl transition-all shadow-sm">
                    <!-- Tiptap 富文本编辑器 -->
                    <BaseEditor ref="editorRef" v-model="messageJson" :disabled="sending" @send="handleSend"
                        @textChange="onEditorTextChange"
                        :placeholder="currentConversation ? `发消息给 ${currentConversation.title}...` : '请输入内容'" />

                    <!-- 编辑器功能扩展栏 -->
                    <div class="flex items-center justify-between border-t border-base-content/5 pt-2">
                        <div class="flex items-center gap-1">
                            <button
                                class="btn btn-sm btn-circle btn-ghost text-base-content/40 hover:text-primary transition-colors">
                                <Icon name="mingcute:emoji-line" size="20" />
                            </button>
                            <button
                                class="btn btn-sm btn-circle btn-ghost text-base-content/40 hover:text-primary transition-colors">
                                <Icon name="mingcute:attachment-line" size="20" />
                            </button>
                            <button
                                class="btn btn-sm btn-circle btn-ghost text-base-content/40 hover:text-primary transition-colors">
                                <Icon name="mingcute:ai-line" size="20" />
                            </button>
                        </div>

                        <!-- 独立发送动作按钮 -->
                        <button @click="handleSend" :disabled="!messagePlainText.trim() || sending"
                            class="btn btn-sm btn-primary px-5 rounded-xl font-bold shadow-lg shadow-primary/20 transition-all active:scale-95 disabled:opacity-30">
                            <span class="mr-1">发送</span>
                            <Icon v-if="!sending" name="mingcute:send-plane-fill" size="16" />
                            <span v-else class="loading loading-spinner loading-xs"></span>
                        </button>
                    </div>
                </div>
            </div>
        </footer>
    </div>
</template>

<style scoped>
::-webkit-scrollbar {
    width: 4px;
}

::-webkit-scrollbar-thumb {
    background: color-mix(in srgb, var(--fallback-bc, oklch(var(--bc))), transparent 92%);
    border-radius: 10px;
    transition: background 0.2s;
}

::-webkit-scrollbar-thumb:hover {
    background: color-mix(in srgb, var(--fallback-bc, oklch(var(--bc))), transparent 80%);
}
</style>