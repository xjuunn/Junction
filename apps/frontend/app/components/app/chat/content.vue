<script setup lang="ts">
import * as messageApi from '~/api/message';
import * as conversationApi from '~/api/conversation';
import { uploadFiles } from '~/api/upload';

const route = useRoute();
const userStore = useUserStore();
const toast = useToast();
const appSocket = useSocket('app');
const { emit: busEmit } = useEmitt();

const conversationId = computed(() => route.params.id as string);
const currentUserId = computed(() => unref(userStore.user)?.id);
const currentConversation = ref<any>(null);
const messages = ref<any[]>([]);
const loading = ref(false);
const initialLoading = ref(true);
const sending = ref(false);
const hasMore = ref(true);

// 编辑器相关状态
const messageJson = ref<any>(null);
const messagePlainText = ref('');
const listRef = ref<any>(null);
const editorRef = ref<any>(null);

// 扩展功能状态
const showExtensionsMenu = ref(false);

const scrollToBottom = (behavior: ScrollBehavior = 'auto') => {
    nextTick(() => {
        const el = listRef.value?.$el;
        if (!el) return;
        if (behavior === 'smooth') {
            el.scrollTo({ top: el.scrollHeight + 10000, behavior: 'smooth' });
        } else {
            el.scrollTop = el.scrollHeight + 10000;
        }
    });
};

const fetchMessages = async (isMore = false) => {
    if (loading.value || !conversationId.value || (isMore && !hasMore.value)) return;

    const el = listRef.value?.$el;
    const prevHeight = el?.scrollHeight ?? 0;
    const prevTop = el?.scrollTop ?? 0;

    if (!isMore) initialLoading.value = true;
    loading.value = true;

    try {
        const cursor = isMore && messages.value.length > 0 ? messages.value[0].sequence : undefined;
        const res = await messageApi.findAll(conversationId.value, { limit: 40 }, cursor);

        if (res.data) {
            if (isMore) {
                messages.value = [...res.data.items, ...messages.value];
                nextTick(() => {
                    if (el) {
                        el.style.scrollBehavior = 'auto';
                        el.scrollTop = el.scrollHeight - prevHeight + prevTop;
                    }
                });
            } else {
                messages.value = res.data.items;
                scrollToBottom('auto');
            }
            hasMore.value = res.data.items.length === 40;
        }
    } finally {
        loading.value = false;
        if (!isMore) setTimeout(() => { initialLoading.value = false; }, 100);
    }
};

const handleScroll = (e: Event) => {
    const el = e.target as HTMLElement;
    if (el.scrollTop < 400 && !loading.value && hasMore.value && !initialLoading.value) {
        fetchMessages(true);
    }
};

const fetchConversation = async () => {
    if (!conversationId.value) return;
    const res = await conversationApi.findOne(conversationId.value);
    if (res.data) currentConversation.value = res.data;
};

// 发送消息
const handleSend = async () => {
    const text = messagePlainText.value.trim();
    const hasJson = messageJson.value && messageJson.value.content && messageJson.value.content.length > 0;

    if ((!text && !hasJson) || sending.value) return;

    sending.value = true;
    try {
        const isRichText = messageJson.value?.content?.some((n: any) => n.type === 'image' || n.type === 'codeBlock');

        let messageType = isRichText ? messageApi.MessageType.RICH_TEXT : messageApi.MessageType.TEXT;
        let content = text || '[富文本消息]';
        let payload = toRaw(messageJson.value);

        const res = await messageApi.send({
            conversationId: conversationId.value,
            content,
            payload,
            type: messageType,
            clientMessageId: `c_${Date.now()}`
        });

        if (res.data) {
            messages.value.push(res.data);
            editorRef.value?.clear();
            messagePlainText.value = '';
            messageJson.value = null;
            scrollToBottom('smooth');
            busEmit('chat:message-sync', res.data);
        }
    } catch (e: any) {
        toast.error(e.message || '发送失败');
    } finally {
        sending.value = false;
    }
};

// 触发图片上传
const handleImageUploadTrigger = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.multiple = true;
    input.accept = 'image/*';
    input.onchange = async (e) => {
        const files = (e.target as HTMLInputElement).files;
        if (!files) return;

        const editor = editorRef.value?.editor;
        if (!editor) return;

        for (const file of Array.from(files)) {
            try {
                const response = await uploadFiles('message', [file]);
                if (response.success && response.data?.files?.[0]) {
                    const imageUrl = `${useRuntimeConfig().public.apiUrl}${response.data.files[0]}`;
                    editor.chain().focus().setImage({ src: imageUrl }).run();
                }
            } catch (err) {
                toast.error(`图片 ${file.name} 上传失败`);
            }
        }
    };
    input.click();
};

const toggleExtensionsMenu = () => {
    showExtensionsMenu.value = !showExtensionsMenu.value;
};

const handleExtensionAction = (action: string) => {
    const editor = editorRef.value?.editor;
    if (!editor) return;

    editor.chain().focus();

    switch (action) {
        case 'bold': editor.toggleBold().run(); break;
        case 'italic': editor.toggleItalic().run(); break;
        case 'code': editor.toggleCode().run(); break;
        case 'link':
            const url = prompt('请输入链接URL:');
            if (url) editor.setLink({ href: url }).run();
            break;
        case 'list': editor.toggleBulletList().run(); break;
        case 'ordered-list': editor.toggleOrderedList().run(); break;
        case 'blockquote': editor.toggleBlockquote().run(); break;
        case 'code-block': editor.toggleCodeBlock().run(); break;
    }
    showExtensionsMenu.value = false;
};

const setupSocketListeners = () => {
    appSocket.on('new-message', (msg: any) => {
        if (msg.conversationId === conversationId.value) {
            if (!messages.value.some(m => m.id === msg.id)) {
                messages.value.push(msg);
                scrollToBottom('smooth');
                busEmit('chat:message-sync', msg);
            }
        }
    });
};

watch(() => conversationId.value, () => {
    messages.value = [];
    currentConversation.value = null;
    fetchConversation();
    fetchMessages();
}, { immediate: true });

onMounted(() => {
    setupSocketListeners();
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') showExtensionsMenu.value = false;
    });
});
</script>

<template>
    <div class="flex flex-col h-full bg-base-100 overflow-hidden relative">
        <header
            class="navbar h-16 min-h-0 px-6 border-b border-base-200 bg-base-100/60 backdrop-blur-2xl z-30 shrink-0">
            <div class="flex-1 flex items-center gap-4 min-w-0">
                <button class="btn btn-ghost btn-circle btn-sm md:hidden" @click="navigateTo('/chat')">
                    <Icon name="mingcute:left-line" size="20" />
                </button>
                <div v-if="currentConversation" class="flex items-center gap-4 min-w-0 animate-in fade-in duration-500">
                    <BaseAvatar :text="currentConversation.title" :src="currentConversation.avatar" :height="44"
                        :width="44" :radius="14" />
                    <div class="flex flex-col min-w-0">
                        <h2 class="text-[15px] font-black tracking-tight truncate leading-tight">{{
                            currentConversation.title }}</h2>
                        <div
                            class="flex items-center gap-1.5 mt-0.5 text-[10px] font-bold opacity-40 uppercase tracking-widest">
                            {{ currentConversation.type === 'PRIVATE' ? (currentConversation.online ? 'Online' :
                                'Offline') : `${currentConversation.memberCount} Members` }}
                        </div>
                    </div>
                </div>
            </div>
        </header>

        <div class="flex-1 relative overflow-hidden bg-base-100">
            <div v-if="initialLoading" class="absolute inset-0 z-20 bg-base-100 flex items-center justify-center">
                <div class="loading loading-ring loading-lg text-primary/20"></div>
            </div>

            <AppMessageList ref="listRef" @scroll="handleScroll"
                class="h-full overflow-y-auto px-4 md:px-10 py-6 custom-scrollbar">
                <div v-for="(msg, index) in messages" :key="msg.id">
                    <div v-if="index === 0 || new Date(msg.createdAt).toDateString() !== new Date(messages[index - 1].createdAt).toDateString()"
                        class="flex items-center justify-center my-10 opacity-20">
                        <span
                            class="px-4 py-1 rounded-full border border-base-content text-[10px] font-black uppercase tracking-[0.2em]">
                            {{ new Date(msg.createdAt).toLocaleDateString([], { month: 'short', day: 'numeric' }) }}
                        </span>
                    </div>
                    <AppMessageItem :message="msg" :is-me="msg.senderId === currentUserId" class="mb-1" />
                </div>
                <div v-if="sending" class="chat chat-end animate-in fade-in slide-in-from-bottom-2">
                    <div
                        class="chat-bubble chat-bubble-primary bg-primary/10 border border-primary/20 text-primary py-2 px-4 shadow-none">
                        <span class="loading loading-dots loading-xs"></span>
                    </div>
                </div>
            </AppMessageList>
        </div>

        <footer class="p-4 md:p-8 bg-gradient-to-t from-base-100 via-base-100 to-transparent z-20">
            <div class="max-w-5xl mx-auto relative">
                <div
                    class="bg-base-200/40 backdrop-blur-3xl border border-base-content/5 rounded-[28px] p-2.5 shadow-lg focus-within:bg-base-100/80 transition-all">

                    <BaseEditor ref="editorRef" v-model="messageJson" :disabled="sending" @send="handleSend"
                        @textChange="val => messagePlainText = val" class="px-4 py-2 min-h-[44px]" />

                    <div class="flex items-center justify-between px-2 pt-2.5 border-t border-base-content/5">
                        <div class="flex gap-0.5 relative">
                            <button class="btn btn-ghost btn-circle btn-sm opacity-30 hover:opacity-100"
                                @click="toast.info('表情功能开发中')">
                                <Icon name="mingcute:emoji-line" size="22" />
                            </button>

                            <button class="btn btn-ghost btn-circle btn-sm opacity-30 hover:opacity-100"
                                @click="handleImageUploadTrigger">
                                <Icon name="mingcute:folder-2-line" size="22" />
                            </button>

                            <button class="btn btn-ghost btn-circle btn-sm opacity-30 hover:opacity-100"
                                @click="toggleExtensionsMenu"
                                :class="{ 'text-primary opacity-100': showExtensionsMenu }">
                                <Icon name="mingcute:plugin-2-line" size="22" />
                            </button>

                            <div v-if="showExtensionsMenu"
                                class="absolute bottom-full left-0 mb-4 bg-base-100 border border-base-200 rounded-2xl shadow-2xl p-3 grid grid-cols-4 gap-2 z-50 animate-in fade-in slide-in-from-bottom-2 min-w-[200px]">
                                <button
                                    v-for="action in ['bold', 'italic', 'code', 'link', 'list', 'ordered-list', 'blockquote', 'code-block']"
                                    :key="action" @click="handleExtensionAction(action)"
                                    class="btn btn-ghost btn-sm btn-square hover:bg-primary hover:text-white transition-colors">
                                    <Icon :name="`mingcute:${action.replace('ordered-', '')}-line`" size="18" />
                                </button>
                            </div>
                        </div>

                        <div class="flex items-center gap-2">
                            <span class="text-[10px] font-bold opacity-20 hidden sm:inline uppercase tracking-tighter">
                                Ctrl + Enter to send
                            </span>
                            <button
                                class="btn btn-primary btn-sm h-10 px-6 rounded-2xl font-black shadow-xl shadow-primary/20 active:scale-95 transition-all"
                                :disabled="(!messagePlainText.trim() && !messageJson?.content?.length) || sending"
                                @click="handleSend">
                                <span>SEND</span>
                                <Icon name="mingcute:send-plane-fill" size="18" class="ml-1.5" />
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </footer>
    </div>
</template>