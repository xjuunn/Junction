<script setup lang="ts">
import * as messageApi from '~/api/message';
import * as conversationApi from '~/api/conversation';
import * as friendshipApi from '~/api/friendship';
import { uploadFiles } from '~/api/upload';
import { isTauri } from '~/utils/check';
import type { ComponentPublicInstance, VNodeRef } from 'vue';

const route = useRoute();
const userStore = useUserStore();
const toast = useToast();
const appSocket = useSocket('app');
const { emit: busEmit, on: busOn, off: busOff } = useEmitt();

const conversationId = computed(() => route.params.id as string);
const currentUserId = computed(() => unref(userStore.user)?.id);
type ReadMember = { id: string; name: string; image?: string | null };
type ReadInfo = { isRead: boolean; readCount: number; unreadCount: number; readMembers?: ReadMember[]; unreadMembers?: ReadMember[] };
type MessageItem = NonNullable<NonNullable<Awaited<ReturnType<typeof messageApi.findAll>>['data']>['items']>[number] & {
    readInfo?: ReadInfo;
};

const currentConversation = ref<any>(null);
const messages = ref<MessageItem[]>([]);
const loading = ref(false);
const initialLoading = ref(true);
const sending = ref(false);
const hasMore = ref(true);
const showGroupInfo = ref(false);
const showChatSettings = ref(false);
const lastReportedReadId = ref<string | null>(null);
const lastReportedReadSeq = ref<number>(0);
const messageElementMap = new Map<string, Element>();
const messageObserver = ref<IntersectionObserver | null>(null);

const remarkMap = ref<Record<string, string>>({});

/**
 * ????????????
 */
const ensureRemarks = async (items: MessageItem[]) => {
    const memberIds = items.flatMap(item => {
        const read = item.readInfo?.readMembers?.map((m: ReadMember) => m.id) || [];
        const unread = item.readInfo?.unreadMembers?.map((m: ReadMember) => m.id) || [];
        return [...read, ...unread];
    });
    const ids = Array.from(new Set([
        ...items.map(item => item.senderId).filter((id): id is string => !!id && id !== currentUserId.value),
        ...memberIds.filter((id): id is string => !!id && id !== currentUserId.value)
    ]));
    const missing = ids.filter(id => !remarkMap.value[id]);
    if (!missing.length) return;
    const results = await Promise.all(missing.map(id => friendshipApi.findOne(id).catch(() => null)));
    results.forEach(res => {
        const note = res?.data?.note;
        const friendId = res?.data?.friendId;
        if (friendId && note && note.trim()) {
            remarkMap.value = { ...remarkMap.value, [friendId]: note.trim() };
        }
    });
};

/**
 * ??????????????
 */
const applyRemarks = (items: MessageItem[]) => items.map(item => {
    if (!item.sender || !item.senderId || item.senderId === currentUserId.value) return item;
    const note = remarkMap.value[item.senderId];
    if (!note) return item;
    return { ...item, sender: { ...item.sender, name: note } };
});

const applyRemarksToReadInfo = (items: MessageItem[]) => items.map(item => {
    if (!item.readInfo) return item;
    const mapMember = (member: ReadMember) => {
        if (!member?.id) return member;
        const note = remarkMap.value[member.id];
        if (!note) return member;
        return { ...member, name: note };
    };
    const readMembers = item.readInfo.readMembers?.map(mapMember);
    const unreadMembers = item.readInfo.unreadMembers?.map(mapMember);
    return {
        ...item,
        readInfo: {
            ...item.readInfo,
            readMembers,
            unreadMembers
        }
    };
});

const upsertMessage = (item: MessageItem) => {
    const idx = messages.value.findIndex(m =>
        (m.id && m.id === item.id) ||
        (m.clientMessageId && item.clientMessageId && m.clientMessageId === item.clientMessageId)
    );
    if (idx >= 0) {
        messages.value[idx] = item;
        return;
    }
    messages.value.push(item);
};

// ???????????
const messageJson = ref<any>(null);
const messagePlainText = ref('');
const listRef = ref<any>(null);
const editorRef = ref<any>(null);
const editorContainerRef = ref<HTMLElement | null>(null);
let unlistenTauriDrop: (() => void) | null = null;

// ??????????
const showExtensionsMenu = ref(false);
const isTauriDragOver = ref(false);

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

const updateReadInfoForUser = (userId: string, sequence: number) => {
    const updatedMessages = messages.value.map(message => {
        if (!message.readInfo || message.sequence > sequence) return message;

        const readInfo: ReadInfo = {
            ...message.readInfo,
            readMembers: message.readInfo.readMembers ? [...message.readInfo.readMembers] : message.readInfo.readMembers,
            unreadMembers: message.readInfo.unreadMembers ? [...message.readInfo.unreadMembers] : message.readInfo.unreadMembers
        };

        if (message.senderId === currentUserId.value) {
            if (readInfo.readMembers && readInfo.unreadMembers) {
                const index = readInfo.unreadMembers.findIndex(member => member?.id === userId);
                if (index !== -1) {
                    const [member] = readInfo.unreadMembers.splice(index, 1);
                    if (member) readInfo.readMembers.push(member);
                }
                readInfo.readCount = readInfo.readMembers.length;
                readInfo.unreadCount = readInfo.unreadMembers.length;
                readInfo.isRead = readInfo.unreadCount === 0;
            } else if (userId !== currentUserId.value) {
                readInfo.readCount = Math.max(readInfo.readCount, 1);
                readInfo.unreadCount = 0;
                readInfo.isRead = true;
            }
        } else if (userId === currentUserId.value) {
            readInfo.isRead = true;
        }

        return { ...message, readInfo };
    });
    messages.value = applyRemarksToReadInfo(updatedMessages);
};

/**
 * 标记消息为已读
 */
const markMessageAsRead = async (message: MessageItem) => {
    if (!message || !conversationId.value || !currentUserId.value) return;
    if (!canMarkRead()) return;
    if (message.senderId === currentUserId.value) return;
    if (message.readInfo?.isRead) return;
    if (message.sequence <= lastReportedReadSeq.value) return;

    try {
        lastReportedReadId.value = message.id;
        lastReportedReadSeq.value = message.sequence;
        await messageApi.markAsRead(conversationId.value, message.id);
        updateReadInfoForUser(currentUserId.value, message.sequence);
        busEmit('chat:conversation-read', conversationId.value);
    } catch {
        lastReportedReadId.value = null;
    }
};

/**
 * 判断是否允许标记已读
 */
const canMarkRead = () => {
    const el = listRef.value?.$el as HTMLElement | undefined;
    if (!el) return false;
    if (document.visibilityState !== 'visible') return false;
    if (el.offsetParent === null) return false;
    if (el.clientHeight === 0) return false;
    return true;
};

/**
 * 上报当前会话已读进度
 */
const reportReadIfNeeded = async () => {
    const lastMessage = messages.value[messages.value.length - 1];
    if (!lastMessage) return;
    if (lastReportedReadId.value === lastMessage.id) return;
    await markMessageAsRead(lastMessage);
};

/**
 * 监听消息可见性变化
 */
const handleMessageVisibility = (entries: IntersectionObserverEntry[]) => {
    if (!canMarkRead()) return;
    entries.forEach(entry => {
        if (!entry.isIntersecting) return;
        const target = entry.target as HTMLElement;
        const messageId = target.dataset.messageId;
        if (!messageId) return;
        const message = messages.value.find(item => item.id === messageId);
        if (!message || message.readInfo?.isRead) return;
        markMessageAsRead(message);
    });
};

/**
 * 绑定消息元素引用
 */
/**
 * 绑定消息元素引用
 */
const setMessageRef = (message: MessageItem): VNodeRef => (el: Element | ComponentPublicInstance | null) => {
    const id = message.id;
    const existing = messageElementMap.get(id);
    if (existing) {
        messageObserver.value?.unobserve(existing);
        messageElementMap.delete(id);
    }
    const element = el && '$el' in el ? (el.$el as Element | null) : el;
    if (element) {
        messageElementMap.set(id, element);
        messageObserver.value?.observe(element);
    }
};

const fetchMessages = async (isMore = false) => {
    if (loading.value || !conversationId.value || (isMore && !hasMore.value)) return;

    const el = listRef.value?.$el;
    const prevHeight = el?.scrollHeight ?? 0;
    const prevTop = el?.scrollTop ?? 0;

    if (!isMore) initialLoading.value = true;
    loading.value = true;

    try {
        const cursor = isMore && messages.value.length > 0 ? messages.value[0]?.sequence : undefined;
        const res = await messageApi.findAll(conversationId.value, { limit: 40 }, cursor);

        if (res.data) {
            const incoming = res.data.items as MessageItem[];
            await ensureRemarks(incoming);
            const merged = applyRemarksToReadInfo(applyRemarks(incoming));
            if (isMore) {
                messages.value = [...merged, ...messages.value];
                nextTick(() => {
                    if (el) {
                        el.style.scrollBehavior = 'auto';
                        el.scrollTop = el.scrollHeight - prevHeight + prevTop;
                    }
                });
            } else {
                messages.value = merged;
                scrollToBottom('auto');
                await reportReadIfNeeded();
            }
            hasMore.value = res.data.items.length === 40;
        }
    } finally {
        loading.value = false;
        if (!isMore) {
            setTimeout(() => {
                initialLoading.value = false;
                scrollToBottom('auto');
            }, 100);
        }
    }
};

const handleScroll = (e: Event) => {
    const el = e.target as HTMLElement;
    if (el.scrollTop < 400 && !loading.value && hasMore.value && !initialLoading.value) {
        fetchMessages(true);
    }
    if (el.scrollHeight - (el.scrollTop + el.clientHeight) < 200) {
        reportReadIfNeeded();
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
            const patched = applyRemarksToReadInfo(applyRemarks([res.data as MessageItem]))[0] || (res.data as MessageItem);
            upsertMessage(patched);
            editorRef.value?.clear();
            messagePlainText.value = '';
            messageJson.value = null;
            scrollToBottom('smooth');
            busEmit('chat:message-sync', patched);
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

/**
 * 触发文件上传并插入编辑器
 */
const handleFileUploadTrigger = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.multiple = true;
    input.onchange = async (e) => {
        const files = (e.target as HTMLInputElement).files;
        if (!files) return;

        const editor = editorRef.value?.editor;
        const view = editor?.view;
        if (!editor || !view) return;

        for (const file of Array.from(files)) {
            try {
                await editorRef.value?.processAndInsertFile(view, file);
            } catch {
                toast.error(`文件 ${file.name} 插入失败`);
            }
        }
    };
    input.click();
};

const getFileNameFromPath = (path: string) => {
    const normalized = path.replace(/\\/g, '/');
    return normalized.split('/').pop() || 'file';
};

const getMimeTypeByName = (name: string) => {
    const ext = name.split('.').pop()?.toLowerCase();
    if (!ext) return '';
    const map: Record<string, string> = {
        jpg: 'image/jpeg',
        jpeg: 'image/jpeg',
        png: 'image/png',
        gif: 'image/gif',
        webp: 'image/webp',
        bmp: 'image/bmp',
        svg: 'image/svg+xml',
    };
    return map[ext] || '';
};

const createFileFromPath = async (path: string) => {
    const { readFile } = await import('@tauri-apps/plugin-fs');
    const bytes = await readFile(path);
    const name = getFileNameFromPath(path);
    const type = getMimeTypeByName(name);
    return type ? new File([bytes], name, { type }) : new File([bytes], name);
};

const isPointInEditor = (position?: { x: number; y: number }, fallback = false) => {
    if (!position || !editorContainerRef.value) return fallback;
    const rect = editorContainerRef.value.getBoundingClientRect();
    return position.x >= rect.left && position.x <= rect.right && position.y >= rect.top && position.y <= rect.bottom;
};

const handleTauriFileDrop = async (paths: string[], position?: { x: number; y: number }) => {
    if (sending.value || !paths.length) return;
    if (!isPointInEditor(position, true)) return;

    const editor = editorRef.value?.editor;
    const view = editor?.view;
    if (!editor || !view) return;

    const files = (await Promise.all(paths.map(path => createFileFromPath(path).catch(() => null))))
        .filter((file): file is File => !!file);
    if (!files.length) return;

    const imageFiles = files.filter(file => file.type.startsWith('image/'));
    const otherFiles = files.filter(file => !file.type.startsWith('image/'));
    const pos = position
        ? (view.posAtCoords({ left: position.x, top: position.y })?.pos ?? view.state.selection.from)
        : view.state.selection.from;

    for (const file of imageFiles) {
        await editorRef.value?.processAndInsertImage(view, file, pos);
    }
    for (const file of otherFiles) {
        await editorRef.value?.processAndInsertFile(view, file, pos);
    }
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

const handleConversationUpdated = (payload: { id: string; title: string }) => {
    if (!payload?.id || payload.id !== conversationId.value) return;
    if (!messages.value.length) return;
    messages.value = applyRemarksToReadInfo(applyRemarks(messages.value));
};

const handleNewMessage = async (msg: MessageItem) => {
    if (msg.conversationId === conversationId.value) {
        await ensureRemarks([msg]);
        const patched = applyRemarksToReadInfo(applyRemarks([msg]))[0] || msg;
        upsertMessage(patched);
        scrollToBottom('smooth');
        busEmit('chat:message-sync', patched);
        reportReadIfNeeded();
    }
};

const handleMessageRead = (payload: { conversationId: string; userId: string; sequence?: number | string }) => {
    if (payload.conversationId !== conversationId.value || payload.sequence === undefined) return;
    const sequence = Number(payload.sequence);
    if (Number.isNaN(sequence)) return;
    updateReadInfoForUser(payload.userId, sequence);
};

const setupSocketListeners = () => {
    appSocket.off('new-message');
    appSocket.off('message-read');
    appSocket.on('new-message', handleNewMessage);
    appSocket.on('message-read', handleMessageRead);
};

watch(() => conversationId.value, () => {
    messages.value = [];
    currentConversation.value = null;
    showChatSettings.value = false;
    lastReportedReadId.value = null;
    lastReportedReadSeq.value = 0;
    messageObserver.value?.disconnect();
    messageObserver.value = new IntersectionObserver(handleMessageVisibility, {
        root: listRef.value?.$el ?? null,
        threshold: 0.6
    });
    messageElementMap.clear();
    fetchConversation();
    fetchMessages();
}, { immediate: true });

onMounted(async () => {
    setupSocketListeners();
    busOn('chat:conversation-updated', handleConversationUpdated);
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') showExtensionsMenu.value = false;
    });
    messageObserver.value = new IntersectionObserver(handleMessageVisibility, {
        root: listRef.value?.$el ?? null,
        threshold: 0.6
    });
    messages.value.forEach(message => {
        const el = messageElementMap.get(message.id);
        if (el) messageObserver.value?.observe(el);
    });

    if (isTauri()) {
        const { getCurrentWebview } = await import('@tauri-apps/api/webview');
        const webview = getCurrentWebview();
        unlistenTauriDrop = await webview.onDragDropEvent(async (event) => {
            const payload = event?.payload as any;
            if (!payload) return;

            if (payload.type === 'over' || payload.type === 'enter') {
                const position = 'position' in payload ? payload.position : undefined;
                isTauriDragOver.value = isPointInEditor(position, false);
            }

            if (payload.type === 'leave' || payload.type === 'drop' || payload.type === 'cancel') {
                isTauriDragOver.value = false;
            }

            if (payload.type === 'drop') {
                const position = 'position' in payload ? payload.position : undefined;
                const paths = Array.isArray(payload.paths) ? payload.paths : [];
                await handleTauriFileDrop(paths, position);
            }
        });
    }
});

onUnmounted(() => {
    busOff('chat:conversation-updated', handleConversationUpdated);
    appSocket.off('new-message');
    appSocket.off('message-read');
    messageObserver.value?.disconnect();
    messageObserver.value = null;
    messageElementMap.clear();
    isTauriDragOver.value = false;
    if (unlistenTauriDrop) {
        unlistenTauriDrop();
        unlistenTauriDrop = null;
    }
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

            <!-- 群聊信息按钮 -->
            <div v-if="currentConversation && currentConversation.type === 'GROUP'" class="flex items-center gap-2">
                <button class="btn btn-ghost btn-circle btn-sm" @click="showGroupInfo = true">
                    <Icon name="mingcute:information-line" size="20" />
                </button>
            </div>
            <!-- 设置按钮 -->
            <div class="flex items-center gap-2">
                <button class="btn btn-ghost btn-circle btn-sm" @click="showChatSettings = true">
                    <Icon name="mingcute:settings-3-line" size="20" />
                </button>
            </div>
        </header>
        <div class="flex-1 relative overflow-hidden bg-base-100">
            <div v-if="initialLoading" class="absolute inset-0 z-20 bg-base-100 flex items-center justify-center">
                <div class="loading loading-ring loading-lg text-primary/20"></div>
            </div>

            <AppMessageList ref="listRef" @scroll="handleScroll"
                class="h-full overflow-y-auto px-4 md:px-10 py-6 custom-scrollbar">
                <div v-for="(msg, index) in messages" :key="msg.id" :ref="setMessageRef(msg)" :data-message-id="msg.id">
                    <div v-if="index === 0 || new Date(msg.createdAt).toDateString() !== new Date(messages[index - 1]?.createdAt ?? msg.createdAt).toDateString()"
                        class="flex items-center justify-center my-10 opacity-20">
                        <span
                            class="px-4 py-1 rounded-full border border-base-content text-[10px] font-black uppercase tracking-[0.2em]">
                            {{ new Date(msg.createdAt).toLocaleDateString([], { month: 'short', day: 'numeric' }) }}
                        </span>
                    </div>
                    <AppMessageItem :message="msg" :is-me="msg.senderId === currentUserId"
                        :is-read="msg.readInfo?.isRead" :read-info="msg.readInfo"
                        :is-group="currentConversation?.type === 'GROUP'" class="mb-1" />
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
                <div ref="editorContainerRef"
                    class="relative bg-base-200/40 backdrop-blur-3xl border border-base-content/5 rounded-[28px] p-2.5 shadow-lg focus-within:bg-base-100/80 transition-all">

                    <BaseEditor ref="editorRef" v-model="messageJson" :disabled="sending" @send="handleSend"
                        @textChange="val => messagePlainText = val" class="px-4 py-2 min-h-[44px]" />

                    <div v-show="isTauriDragOver"
                        class="absolute inset-2 bg-primary/10 backdrop-blur-sm flex items-center justify-center rounded-[24px] border-2 border-dashed border-primary z-50 pointer-events-none">
                        <div class="flex items-center gap-2 text-primary font-medium">
                            <Icon name="mingcute:add-line" size="24" />
                            <span>释放鼠标上传文件</span>
                        </div>
                    </div>

                    <div class="flex items-center justify-between px-2 pt-2.5 border-t border-base-content/5">
                        <div class="flex gap-0.5 relative">
                            <button class="btn btn-ghost btn-circle btn-sm opacity-30 hover:opacity-100"
                                @click="toast.info('表情功能开发中')">
                                <Icon name="mingcute:emoji-line" size="22" />
                            </button>

                            <button class="btn btn-ghost btn-circle btn-sm opacity-30 hover:opacity-100"
                                @click="handleFileUploadTrigger">
                                <Icon name="mingcute:folder-2-line" size="22" />
                            </button>

                            <button class="btn btn-ghost btn-circle btn-sm opacity-30 hover:opacity-100"
                                @click="handleImageUploadTrigger">
                                <Icon name="mingcute:pic-2-line" size="22" />
                            </button>

                            <button class="btn btn-ghost btn-circle btn-sm opacity-30 hover:opacity-100"
                                @click="toggleExtensionsMenu"
                                :class="{ 'text-primary opacity-100': showExtensionsMenu }">
                                <Icon name="mingcute:plugin-2-line" size="22" />
                            </button>

                            <div v-if="showExtensionsMenu"
                                class="absolute bottom-full left-0 mb-4 bg-base-100 border border-base-200 rounded-2xl shadow-2xl p-3 grid grid-cols-4 gap-2 z-50 animate-in fade-in slide-in-from-bottom-2 min-w-[200px]">
                                <button
                                    v-for="action in ['bold', 'italic', 'code', 'link', 'list-check', 'list-ordered', 'blockquote', 'code']"
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

        <!-- 群聊信息对话框 -->
        <AppDialogGroupInfo v-if="currentConversation && currentConversation.type === 'GROUP'" :show="showGroupInfo"
            :conversation-id="conversationId" @update:show="showGroupInfo = $event" @updated="fetchConversation" />

        <!-- 聊天设置对话框 -->
        <AppChatDialogChatSettings :show="showChatSettings" :conversation="currentConversation"
            @update:show="showChatSettings = $event" @conversation-deleted="fetchConversation" />
    </div>
</template>
