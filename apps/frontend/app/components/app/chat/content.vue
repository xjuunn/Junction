<script setup lang="ts">
import * as messageApi from '~/api/message';

const route = useRoute();
const userStore = useUserStore();
const toast = useToast();
const dialog = useDialog();

const conversationId = computed(() => route.params.id as string);
const currentUserId = computed(() => unref(userStore.user)?.id);

const messages = ref<any[]>([]);
const messageJson = ref<any>(null);
const messagePlainText = ref('');
const loading = ref(false);
const sending = ref(false);
const hasMore = ref(true);

const listRef = ref<{ scrollToBottom: () => void } | null>(null);
const editorRef = ref<{ clear: () => void } | null>(null);

/**
 * 格式化时间线分割
 * @param date 时间字符串
 */
const formatDivider = (date: string) => {
    return new Date(date).toLocaleDateString('zh-CN', { month: 'long', day: 'numeric', weekday: 'short' });
};

/**
 * 加载历史消息
 * @param isMore 是否为分页加载
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
        toast.error('同步失败');
    } finally {
        loading.value = false;
    }
};

/**
 * 执行发送逻辑
 */
const handleSend = async () => {
    if (!messagePlainText.value.trim() || sending.value) return;

    sending.value = true;
    const payload = toRaw(messageJson.value);
    const fullText = messagePlainText.value;

    // 企业级规范：content 存储截断的纯文本用于预览/搜索，payload 存储完整结构
    const truncatedContent = fullText.length > 200 ? fullText.substring(0, 197) + '...' : fullText;

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
            nextTick(() => listRef.value?.scrollToBottom());
        }
    } catch (e) {
        toast.error('发送失败');
    } finally {
        sending.value = false;
    }
};

/**
 * 撤回消息
 * @param id 消息ID
 */
const handleRevoke = async (id: string) => {
    const ok = await dialog.confirm({ content: '确定要撤回吗？', type: 'warning' });
    if (!ok) return;

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
 * 监听编辑器文本变化
 * @param text 纯文本
 */
const onEditorTextChange = (text: string) => {
    messagePlainText.value = text;
};

watch(() => conversationId.value, () => {
    messages.value = [];
    fetchMessages();
}, { immediate: true });
</script>

<template>
    <div class="flex flex-col h-full bg-base-100 overflow-hidden relative">
        <header
            class="navbar h-14 min-h-0 px-6 border-b border-base-content/5 bg-base-100/80 backdrop-blur-md z-30 shrink-0">
            <div class="flex-1 flex items-center gap-3">
                <div class="avatar online size-9 rounded-full bg-base-300">
                    <img src="https://picsum.photos/100" alt="Avatar" />
                </div>
                <div>
                    <h1 class="text-sm font-bold tracking-tight">协作会话</h1>
                    <div class="text-[10px] opacity-40 uppercase tracking-widest flex items-center gap-1">
                        <span class="status status-success size-1.5"></span>
                        Active
                    </div>
                </div>
            </div>
        </header>

        <AppMessageList ref="listRef" :loading="loading" :has-more="hasMore" @load-more="fetchMessages(true)">
            <div v-for="(msg, index) in messages" :key="msg.id">
                <div v-if="index === 0 || new Date(msg.createdAt).toDateString() !== new Date(messages[index - 1].createdAt).toDateString()"
                    class="divider divider-center my-8 opacity-30">
                    <span class="badge badge-sm badge-soft font-bold text-[10px] uppercase">
                        {{ formatDivider(msg.createdAt) }}
                    </span>
                </div>
                <AppMessageItem :message="msg" :is-me="msg.senderId === currentUserId" @revoke="handleRevoke" />
            </div>
        </AppMessageList>

        <footer class="p-4 md:p-6 bg-base-100 border-t border-base-content/5 shrink-0">
            <div class="max-w-4xl mx-auto flex flex-col gap-3">
                <div
                    class="flex flex-col gap-2 p-3 bg-base-200/50 focus-within:bg-base-100 focus-within:ring-2 focus-within:ring-primary/10 border border-base-content/5 rounded-2xl transition-all shadow-sm">
                    <!-- 编辑器主体 -->
                    <BaseEditor ref="editorRef" v-model="messageJson" :disabled="sending" @send="handleSend"
                        @textChange="onEditorTextChange" />

                    <!-- 工具栏与外部发送按钮 -->
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
                        </div>

                        <button @click="handleSend" :disabled="!messagePlainText.trim() || sending"
                            class="btn btn-sm btn-primary px-5 rounded-xl font-bold shadow-lg shadow-primary/20 transition-all active:scale-95">
                            发送
                            <Icon v-if="!sending" name="mingcute:send-plane-fill" size="16" />
                            <span v-else class="loading loading-spinner loading-xs"></span>
                        </button>
                    </div>
                </div>
            </div>
        </footer>
    </div>
</template>