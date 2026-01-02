<script setup lang="ts">
import * as messageApi from '~/api/message';
import * as conversationApi from '~/api/conversation';

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
const messageJson = ref<any>(null);
const messagePlainText = ref('');

const listRef = ref<any>(null);
const editorRef = ref<any>(null);

const scrollToBottom = (behavior: ScrollBehavior = 'auto') => {
    nextTick(() => {
        const el = listRef.value?.$el;
        if (!el) return;

        const perform = () => {
            el.scrollTop = el.scrollHeight + 10000;
        };

        if (behavior === 'smooth') {
            el.scrollTo({ top: el.scrollHeight + 10000, behavior: 'smooth' });
        } else {
            el.style.scrollBehavior = 'auto';
            perform();
            requestAnimationFrame(perform);
            setTimeout(perform, 64);
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
            busEmit('chat:message-sync', res.data);
        }
    } finally {
        sending.value = false;
    }
};

const setupSocketListeners = () => {
    appSocket.on('new-message', (msg: any) => {
        if (msg.conversationId === conversationId.value) {
            const el = listRef.value?.$el;
            const isAtBottom = el ? (el.scrollHeight - el.scrollTop - el.clientHeight < 300) : true;
            if (!messages.value.some(m => m.id === msg.id)) {
                messages.value.push(msg);
                if (isAtBottom) scrollToBottom('smooth');
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

onMounted(setupSocketListeners);
onUnmounted(() => appSocket.off('new-message'));
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
                    <div class="relative shrink-0">
                        <BaseAvatar :text="currentConversation.title" :src="currentConversation.avatar" :height="44"
                            :width="44" :radius="14" :placeholder-length="2" />
                        <span v-if="currentConversation.type === 'PRIVATE' && currentConversation.online"
                            class="absolute bottom-0 right-0 w-3.5 h-3.5 bg-success border-[3px] border-base-100 rounded-full"></span>
                    </div>
                    <div class="flex flex-col min-w-0">
                        <h2 class="text-[15px] font-black tracking-tight truncate leading-tight">{{
                            currentConversation.title }}</h2>
                        <div
                            class="flex items-center gap-1.5 mt-0.5 text-[10px] font-bold opacity-40 uppercase tracking-widest truncate">
                            {{ currentConversation.type === 'PRIVATE' ? (currentConversation.online ? 'Online' :
                                'Offline') : `${currentConversation.memberCount} Members` }}
                        </div>
                    </div>
                </div>
                <div v-else class="flex items-center gap-4 animate-pulse">
                    <div class="w-11 h-11 bg-base-200 rounded-[14px]"></div>
                    <div class="flex flex-col gap-2">
                        <div class="h-3 w-24 bg-base-200 rounded"></div>
                        <div class="h-2 w-16 bg-base-200 rounded"></div>
                    </div>
                </div>
            </div>
            <div class="flex-none gap-1">
                <button class="btn btn-ghost btn-circle btn-sm opacity-40 hover:opacity-100">
                    <Icon name="mingcute:search-3-line" size="20" />
                </button>
                <button class="btn btn-ghost btn-circle btn-sm opacity-40 hover:opacity-100">
                    <Icon name="mingcute:more-2-line" size="20" />
                </button>
            </div>
        </header>

        <div class="flex-1 relative overflow-hidden bg-base-100">
            <div v-if="initialLoading"
                class="absolute inset-0 z-20 bg-base-100 flex flex-col items-center justify-center animate-in fade-in duration-300">
                <div class="loading loading-ring loading-lg text-primary/20"></div>
            </div>

            <AppMessageList ref="listRef" :loading="false" :has-more="false" @scroll="handleScroll"
                class="h-full overflow-y-auto overscroll-contain px-4 md:px-10 py-6 [overflow-anchor:none] custom-scrollbar"
                :class="{ 'opacity-0': initialLoading, 'opacity-100 transition-opacity duration-500': !initialLoading }">
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

                <div v-if="sending" class="chat chat-end animate-in fade-in slide-in-from-bottom-2 duration-300">
                    <div
                        class="chat-bubble chat-bubble-primary bg-primary/10 border border-primary/20 text-primary min-h-0 py-2 px-4 shadow-none">
                        <span class="loading loading-dots loading-xs"></span>
                    </div>
                </div>
            </AppMessageList>
        </div>

        <footer class="p-4 md:p-8 bg-gradient-to-t from-base-100 via-base-100 to-transparent z-20">
            <div class="max-w-5xl mx-auto relative">
                <div
                    class="bg-base-200/40 backdrop-blur-3xl border border-base-content/5 rounded-[28px] p-2.5 shadow-[0_20px_50px_-20px_rgba(0,0,0,0.1)] focus-within:bg-base-100/80 transition-all">
                    <BaseEditor ref="editorRef" v-model="messageJson" :disabled="sending" @send="handleSend"
                        @textChange="val => messagePlainText = val" class="px-4 py-2 min-h-[44px]" />
                    <div class="flex items-center justify-between px-2 pt-2.5 border-t border-base-content/5">
                        <div class="flex gap-0.5">
                            <button class="btn btn-ghost btn-circle btn-sm opacity-30 hover:opacity-100">
                                <Icon name="mingcute:emoji-line" size="22" />
                            </button>
                            <button class="btn btn-ghost btn-circle btn-sm opacity-30 hover:opacity-100">
                                <Icon name="mingcute:folder-2-line" size="22" />
                            </button>
                            <button class="btn btn-ghost btn-circle btn-sm opacity-30 hover:opacity-100">
                                <Icon name="mingcute:plugin-2-line" size="22" />
                            </button>
                        </div>
                        <button
                            class="btn btn-primary btn-sm h-10 px-6 rounded-2xl font-black shadow-xl shadow-primary/20 active:scale-95 disabled:opacity-20 transition-all"
                            :disabled="!messagePlainText.trim() || sending" @click="handleSend">
                            <span>SEND</span>
                            <Icon name="mingcute:send-plane-fill" size="18" class="ml-1.5" />
                        </button>
                    </div>
                </div>
            </div>
        </footer>
    </div>
</template>

<style scoped>
.custom-scrollbar::-webkit-scrollbar {
    width: 4px;
}

.custom-scrollbar::-webkit-scrollbar-thumb {
    background: hsl(var(--bc) / 0.1);
    border-radius: 20px;
}
</style>