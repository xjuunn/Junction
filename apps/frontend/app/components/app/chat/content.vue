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
const messageJson = ref<any>(null);
const messagePlainText = ref('');

const listRef = ref<any>(null);
const editorRef = ref<any>(null);

// 扩展功能状态
const showExtensionsMenu = ref(false);
const uploadingImages = ref<string[]>([]);
const dragOver = ref(false);

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
    if (!text && !messageJson.value || sending.value) return;

    sending.value = true;
    try {
        // 检查是否包含富文本内容（图片、格式化文本等）
        const hasRichContent = messageJson.value && Object.keys(messageJson.value).length > 0;

        let messageType = messageApi.MessageType.TEXT;
        let content = text;
        let payload = toRaw(messageJson.value);

        // 确定消息类型
        if (hasRichContent) {
            messageType = messageApi.MessageType.RICH_TEXT;
            content = text || '[富文本消息]';
        } else if (text.length > 200) {
            content = text.substring(0, 197) + '...';
        }

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
            scrollToBottom('smooth');
            busEmit('chat:message-sync', res.data);
        }
    } finally {
        sending.value = false;
    }
};

// 图片上传处理（插入到编辑器中）
const handleImageUpload = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.multiple = true;
    input.accept = 'image/*';
    input.onchange = async (e) => {
        const files = (e.target as HTMLInputElement).files;
        if (!files || files.length === 0) return;

        const validFiles = Array.from(files).filter(file => {
            if (file.size > 5 * 1024 * 1024) { // 5MB
                toast.error(`文件 ${file.name} 太大，请选择小于5MB的图片`);
                return false;
            }
            if (!file.type.startsWith('image/')) {
                toast.error(`文件 ${file.name} 不是有效的图片格式`);
                return false;
            }
            return true;
        });

        if (validFiles.length === 0) return;

        // 显示上传状态
        uploadingImages.value = validFiles.map(file => file.name);

        try {
            for (const file of validFiles) {
                // 使用统一的upload API
                const uploadRes = await uploadFiles('message', [file]);

                if (uploadRes.success && uploadRes.data?.files?.[0]) {
                    // 在编辑器中插入图片
                    const imageUrl = uploadRes.data.files[0];
                    // 上传服务返回完整的 /uploads/type/filename 路径
                    const fullImageUrl = `${useRuntimeConfig().public.apiUrl}${imageUrl}`;

                    console.log('插入图片:', fullImageUrl);

                    // 使用编辑器的API插入图片
                    if (editorRef.value?.editor) {
                        // 确保编辑器有焦点并插入图片
                        editorRef.value.editor.chain().focus().setImage({
                            src: fullImageUrl,
                            alt: '上传的图片',
                            title: '图片'
                        }).run();

                        // 强制更新modelValue以确保响应式更新
                        const currentContent = editorRef.value.editor.getJSON();
                        messageJson.value = currentContent;

                        console.log('图片插入成功，当前内容:', currentContent);
                    }
                }
            }

            toast.success(`成功插入 ${validFiles.length} 张图片`);
        } catch (error: any) {
            console.error('图片上传失败:', error);
            toast.error(error.message || '图片上传失败，请重试');
        } finally {
            uploadingImages.value = [];
        }
    };
    input.click();
};

// 扩展功能菜单切换
const toggleExtensionsMenu = () => {
    showExtensionsMenu.value = !showExtensionsMenu.value;
};

// 扩展功能处理
const handleExtensionAction = (action: string) => {
    showExtensionsMenu.value = false;

    switch (action) {
        case 'bold':
            editorRef.value?.editor?.chain().focus().toggleBold().run();
            break;
        case 'italic':
            editorRef.value?.editor?.chain().focus().toggleItalic().run();
            break;
        case 'code':
            editorRef.value?.editor?.chain().focus().toggleCode().run();
            break;
        case 'link':
            const url = prompt('请输入链接URL:');
            if (url) {
                editorRef.value?.editor?.chain().focus().setLink({ href: url }).run();
            }
            break;
        case 'list':
            editorRef.value?.editor?.chain().focus().toggleBulletList().run();
            break;
        case 'ordered-list':
            editorRef.value?.editor?.chain().focus().toggleOrderedList().run();
            break;
        case 'blockquote':
            editorRef.value?.editor?.chain().focus().toggleBlockquote().run();
            break;
        case 'code-block':
            editorRef.value?.editor?.chain().focus().toggleCodeBlock().run();
            break;
        default:
            toast.info(`功能 ${action} 开发中`);
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

// 点击外部关闭扩展菜单
const handleClickOutside = (event: MouseEvent) => {
    const target = event.target as HTMLElement;
    if (!target.closest('.extensions-menu') && !target.closest('[data-tip="plugin"]')) {
        showExtensionsMenu.value = false;
    }
};

// 拖放处理
const handleDragOver = (event: DragEvent) => {
    event.preventDefault();
    dragOver.value = true;
};

const handleDragLeave = (event: DragEvent) => {
    event.preventDefault();
    dragOver.value = false;
};

const handleDrop = async (event: DragEvent) => {
    event.preventDefault();
    dragOver.value = false;

    const files = event.dataTransfer?.files;
    if (!files || files.length === 0) return;

    const imageFiles = Array.from(files).filter(file => file.type.startsWith('image/'));

    if (imageFiles.length === 0) return;

    // 复用图片上传逻辑
    const validFiles = imageFiles.filter(file => {
        if (file.size > 5 * 1024 * 1024) {
            toast.error(`文件 ${file.name} 太大，请选择小于5MB的图片`);
            return false;
        }
        return true;
    });

    if (validFiles.length === 0) return;

    uploadingImages.value = validFiles.map(file => file.name);

    try {
        for (const file of validFiles) {
            // 使用统一的upload API
            const uploadRes = await uploadFiles('message', [file]);

            if (uploadRes.success && uploadRes.data?.files?.[0]) {
                // 在编辑器中插入图片
                const imageUrl = uploadRes.data.files[0];
                const fullImageUrl = `${useRuntimeConfig().public.apiUrl}${imageUrl}`;

                console.log('拖放插入图片:', fullImageUrl);

                // 使用编辑器的API插入图片
                if (editorRef.value?.editor) {
                    editorRef.value.editor.chain().focus().setImage({
                        src: fullImageUrl,
                        alt: '上传的图片',
                        title: '图片'
                    }).run();

                    // 强制更新modelValue
                    const currentContent = editorRef.value.editor.getJSON();
                    messageJson.value = currentContent;
                }
            }
        }

        toast.success(`成功插入 ${validFiles.length} 张图片`);
    } catch (error: any) {
        console.error('拖放图片上传失败:', error);
        toast.error(error.message || '图片上传失败，请重试');
    } finally {
        uploadingImages.value = [];
    }
};

// 键盘事件处理
const handleKeyDown = (event: KeyboardEvent) => {
    if (event.key === 'Escape') {
        showExtensionsMenu.value = false;
    }

    // Ctrl+Enter 发送消息
    if (event.ctrlKey && event.key === 'Enter') {
        event.preventDefault();
        handleSend();
    }
};

onMounted(() => {
    setupSocketListeners();
    document.addEventListener('click', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
});

onUnmounted(() => {
    appSocket.off('new-message');
    document.removeEventListener('click', handleClickOutside);
    document.removeEventListener('keydown', handleKeyDown);
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
                    <div class="relative shrink-0">
                        <BaseAvatar :text="currentConversation.title" :src="currentConversation.avatar" :height="44"
                            :width="44" :radius="14" :placeholder-length="2" />
                        <span v-if="currentConversation.type === 'PRIVATE' && currentConversation.online"
                            class="absolute bottom-0 right-0 w-3.5 h-3.5 bg-success border-[3px] border-base-100 rounded-full"></span>
                    </div>
                    <div class="flex flex-col min-w-0">
                        <h2 class="text-[15px] font-black tracking-tight truncate leading-tight max-w-40">{{
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
                <div class="bg-base-200/40 backdrop-blur-3xl border border-base-content/5 rounded-[28px] p-2.5 shadow-[0_20px_50px_-20px_rgba(0,0,0,0.1)] focus-within:bg-base-100/80 transition-all relative overflow-hidden"
                    :class="{ 'border-primary border-dashed bg-primary/5': dragOver }" @dragover="handleDragOver"
                    @dragleave="handleDragLeave" @drop="handleDrop">

                    <!-- 拖放提示 -->
                    <div v-if="dragOver"
                        class="absolute inset-0 bg-primary/10 backdrop-blur-sm flex items-center justify-center z-10 rounded-[28px]">
                        <div class="flex items-center gap-2 text-primary font-bold">
                            <Icon name="mingcute:image-add-line" size="24" />
                            <span>释放鼠标上传图片</span>
                        </div>
                    </div>

                    <BaseEditor ref="editorRef" v-model="messageJson" :disabled="sending" @send="handleSend"
                        @textChange="val => messagePlainText = val" class="px-4 py-2 min-h-[44px]" />
                    <!-- 图片上传状态 -->
                    <div v-if="uploadingImages.length > 0" class="px-2 py-1 text-xs text-primary opacity-70">
                        <Icon name="mingcute:loading-3-fill" size="12" class="inline animate-spin mr-1" />
                        正在上传 {{ uploadingImages.length }} 张图片...
                    </div>

                    <div class="flex items-center justify-between px-2 pt-2.5 border-t border-base-content/5">
                        <div class="flex gap-0.5 relative">
                            <button class="btn btn-ghost btn-circle btn-sm opacity-30 hover:opacity-100"
                                @click="toast.info('表情功能开发中')" :disabled="uploadingImages.length > 0">
                                <Icon name="mingcute:emoji-line" size="22" />
                            </button>
                            <button class="btn btn-ghost btn-circle btn-sm opacity-30 hover:opacity-100 relative"
                                @click="handleImageUpload" :disabled="uploadingImages.length > 0"
                                :class="{ 'loading': uploadingImages.length > 0 }">
                                <Icon v-if="uploadingImages.length === 0" name="mingcute:folder-2-line" size="22" />
                                <Icon v-else name="mingcute:loading-3-fill" size="22" class="animate-spin" />
                            </button>
                            <button class="btn btn-ghost btn-circle btn-sm opacity-30 hover:opacity-100 extensions-menu"
                                @click="toggleExtensionsMenu"
                                :class="{ 'btn-primary btn-outline': showExtensionsMenu }">
                                <Icon name="mingcute:plugin-2-line" size="22" />
                            </button>

                            <!-- 扩展功能菜单 -->
                            <div v-if="showExtensionsMenu"
                                class="extensions-menu absolute bottom-full left-0 mb-2 bg-base-100 border border-base-300 rounded-lg shadow-xl p-2 min-w-48 z-50">
                                <div class="grid grid-cols-4 gap-1">
                                    <button @click="handleExtensionAction('bold')" class="btn btn-ghost btn-sm tooltip"
                                        data-tip="粗体">
                                        <Icon name="mingcute:bold-line" size="18" />
                                    </button>
                                    <button @click="handleExtensionAction('italic')"
                                        class="btn btn-ghost btn-sm tooltip" data-tip="斜体">
                                        <Icon name="mingcute:italic-line" size="18" />
                                    </button>
                                    <button @click="handleExtensionAction('code')" class="btn btn-ghost btn-sm tooltip"
                                        data-tip="代码">
                                        <Icon name="mingcute:code-line" size="18" />
                                    </button>
                                    <button @click="handleExtensionAction('link')" class="btn btn-ghost btn-sm tooltip"
                                        data-tip="链接">
                                        <Icon name="mingcute:link-2-line" size="18" />
                                    </button>
                                    <button @click="handleExtensionAction('list')" class="btn btn-ghost btn-sm tooltip"
                                        data-tip="列表">
                                        <Icon name="mingcute:list-check-line" size="18" />
                                    </button>
                                    <button @click="handleExtensionAction('ordered-list')"
                                        class="btn btn-ghost btn-sm tooltip" data-tip="有序列表">
                                        <Icon name="mingcute:list-ordered-line" size="18" />
                                    </button>
                                    <button @click="handleExtensionAction('blockquote')"
                                        class="btn btn-ghost btn-sm tooltip" data-tip="引用">
                                        <Icon name="mingcute:quote-left-line" size="18" />
                                    </button>
                                    <button @click="handleExtensionAction('code-block')"
                                        class="btn btn-ghost btn-sm tooltip" data-tip="代码块">
                                        <Icon name="mingcute:code-block-line" size="18" />
                                    </button>
                                </div>
                            </div>
                        </div>
                        <div class="flex items-center gap-2">
                            <span class="text-xs text-base-content/40 hidden sm:inline">
                                Ctrl+Enter 发送
                            </span>
                            <button
                                class="btn btn-primary btn-sm h-10 px-6 rounded-2xl font-black shadow-xl shadow-primary/20 active:scale-95 disabled:opacity-20 transition-all"
                                :disabled="(!messagePlainText.trim() && !messageJson) || sending" @click="handleSend">
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

<style scoped>
.custom-scrollbar::-webkit-scrollbar {
    width: 4px;
}

.custom-scrollbar::-webkit-scrollbar-thumb {
    background: hsl(var(--bc) / 0.1);
    border-radius: 20px;
}
</style>