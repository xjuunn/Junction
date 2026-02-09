<script setup lang="ts">
import * as messageApi from '~/api/message';
import * as conversationApi from '~/api/conversation';
import * as friendshipApi from '~/api/friendship';
import { uploadFiles } from '~/api/upload';
import * as emojiApi from '~/api/emoji';
import { isTauri } from '~/utils/check';
import { normalizeUploadPath, resolveAssetUrl } from '~/utils/format';
import { normalizeMessageImagePayload } from '~/utils/message';
import type { ComponentPublicInstance, VNodeRef } from 'vue';
import type { PrismaTypes } from '@junction/types';
import gsap from 'gsap';

const route = useRoute();
const userStore = useUserStore();
const toast = useToast();
const dialog = useDialog();
const appSocket = useSocket('app');
const { emit: busEmit, on: busOn, off: busOff } = useEmitt();

const conversationId = computed(() => route.params.id as string);
const currentUserId = computed(() => unref(userStore.user)?.id);
type ReadMember = { id: string; name: string; image?: string | null; accountType?: string | null };
type ReadInfo = { isRead: boolean; readCount: number; unreadCount: number; readMembers?: ReadMember[]; unreadMembers?: ReadMember[] };
type MessageItem = NonNullable<NonNullable<Awaited<ReturnType<typeof messageApi.findAll>>['data']>['items']>[number] & {
    readInfo?: ReadInfo;
};
type EmojiItem = PrismaTypes.Emoji;
type EmojiCategoryItem = PrismaTypes.EmojiCategory;

const currentConversation = ref<any>(null);
const messages = ref<MessageItem[]>([]);
const loading = ref(false);
const initialLoading = ref(true);
const sending = ref(false);
const hasMore = ref(true);
const hasMoreAfter = ref(false);
const showGroupInfo = ref(false);
const showChatSettings = ref(false);
const lastReportedReadId = ref<string | null>(null);
const lastReportedReadSeq = ref<number>(0);
const messageElementMap = new Map<string, Element>();
const messageObserver = ref<IntersectionObserver | null>(null);
const mentionMembers = ref<Array<{ id: string; name: string; image?: string | null; accountType?: string | null }>>([]);
const memberTypeMap = ref<Record<string, string>>({});
const autoScrollEnabled = ref(true);
let streamScrollRaf: number | null = null;
let streamSyncTimer: ReturnType<typeof setTimeout> | null = null;
const pendingStreamIds = new Set<string>();
const pendingStreamContent = new Map<string, string>();
let socketDisposers: Array<() => void> = [];
const loadingAfter = ref(false);

const remarkMap = ref<Record<string, string>>({});
const quotedMessage = ref<{ messageId: string; senderName: string; content: string; sequence?: number | null } | null>(null);
const isJumpingToMessage = ref(false);
const suppressScrollFetchUntil = ref(0);
const showEmojiPanel = ref(false);
const emojiManageMode = ref(false);
const emojiKeyword = ref('');
const emojiCategories = ref<EmojiCategoryItem[]>([]);
const emojiItems = ref<EmojiItem[]>([]);
const emojiLoading = ref(false);
const emojiGridRef = ref<HTMLElement | null>(null);
const emojiDraggingId = ref<string | null>(null);
const emojiPanelRef = ref<HTMLElement | null>(null);
const emojiButtonRef = ref<HTMLElement | null>(null);
const emojiAddDialogVisible = ref(false);
const emojiAddSource = reactive({ messageId: '', imageUrl: '' });
const emojiUploadLoading = ref(false);
const emojiForm = reactive({
    name: '',
    categoryId: '',
    description: '',
    keywords: ''
});
const emojiNewCategoryName = ref('');
const emojiNewCategoryDesc = ref('');
let emojiSearchTimer: ReturnType<typeof setTimeout> | null = null;

/**
 * 获取备注信息
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
 * 应用备注名称
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
        const accountType = memberTypeMap.value[member.id] || member.accountType;
        if (!note) return { ...member, accountType };
        return { ...member, name: note, accountType };
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

// 消息内容
const messageJson = ref<any>(null);
const messagePlainText = ref('');
const listRef = ref<any>(null);
const editorRef = ref<any>(null);
const editorContainerRef = ref<HTMLElement | null>(null);
let unlistenTauriDrop: (() => void) | null = null;

// 扩展菜单
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

const updateAutoScrollState = () => {
    const el = listRef.value?.$el as HTMLElement | undefined;
    if (!el) return;
    const distance = el.scrollHeight - (el.scrollTop + el.clientHeight);
    autoScrollEnabled.value = distance < 160;
};

const scheduleStreamScroll = () => {
    if (!autoScrollEnabled.value) return;
    if (streamScrollRaf) cancelAnimationFrame(streamScrollRaf);
    streamScrollRaf = requestAnimationFrame(() => {
        scrollToBottom('auto');
        streamScrollRaf = null;
    });
};

const scheduleStreamSync = () => {
    if (streamSyncTimer) return;
    streamSyncTimer = setTimeout(() => {
        streamSyncTimer = null;
        pendingStreamIds.clear();
        fetchMessages(false);
    }, 600);
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
            const merged = applyRemarksToReadInfo(applyRemarks(incoming)).map(item => {
                const pending = pendingStreamContent.get(item.id);
                if (pending === undefined) return item;
                return { ...item, content: pending };
            });
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
            if (!isMore) hasMoreAfter.value = false;
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

const fetchMessagesAfter = async () => {
    if (loadingAfter.value || !conversationId.value || !hasMoreAfter.value) return;
    const latest = messages.value[messages.value.length - 1];
    if (!latest?.sequence) return;
    loadingAfter.value = true;
    try {
        const res = await messageApi.findAll(conversationId.value, { limit: 40 }, latest.sequence, 'after');
        if (res.data?.items?.length) {
            messages.value = [...messages.value, ...(res.data.items as MessageItem[])];
        }
        hasMoreAfter.value = (res.data?.items?.length || 0) === 40;
    } finally {
        loadingAfter.value = false;
    }
};

const handleScroll = (e: Event) => {
    if (Date.now() < suppressScrollFetchUntil.value) return;
    const el = e.target as HTMLElement;
    if (el.scrollTop < 400 && !loading.value && hasMore.value && !initialLoading.value) {
        fetchMessages(true);
    }
    if (el.scrollHeight - (el.scrollTop + el.clientHeight) < 200) {
        reportReadIfNeeded();
        if (!initialLoading.value) fetchMessagesAfter();
    }
    updateAutoScrollState();
};

/**
 * 处理引用消息设置
 */
const handleQuoteMessage = (payload: { messageId: string; senderName: string; content: string; sequence?: number | null }) => {
    quotedMessage.value = payload;
};

/**
 * 清空引用消息
 */
const clearQuotedMessage = () => {
    quotedMessage.value = null;
};

/**
 * 跳转到指定消息
 */
const scrollToMessageById = async (payload: { messageId: string; sequence?: number | null }) => {
    if (isJumpingToMessage.value) return;
    isJumpingToMessage.value = true;
    suppressScrollFetchUntil.value = Date.now() + 800;
    if (!messageElementMap.has(payload.messageId)) {
        const loaded = await fetchMessageContext(payload.messageId);
        if (loaded) {
            await nextTick();
        }
    }
    const el = await waitForMessageElement(payload.messageId);
    if (!el) {
        toast.info('未找到引用的消息');
        isJumpingToMessage.value = false;
        return;
    }
    scrollElementIntoCenter(el, true);
    suppressScrollFetchUntil.value = Date.now() + 800;
    isJumpingToMessage.value = false;
};

/**
 * 滚动到消息并高亮
 */
const waitForMessageElement = async (messageId: string) => {
    const maxWait = 1200;
    const start = Date.now();
    while (Date.now() - start < maxWait) {
        const el = messageElementMap.get(messageId) as HTMLElement | undefined;
        if (el) return el;
        await new Promise(resolve => requestAnimationFrame(resolve));
    }
    return null;
};

const scrollElementIntoCenter = (el: HTMLElement, preferUp = false) => {
    const listEl = listRef.value?.$el as HTMLElement | undefined;
    if (listEl) {
        const targetTop = getOffsetTop(el, listEl);
        const target = targetTop - listEl.clientHeight / 2 + el.offsetHeight / 2;
        if (preferUp) {
            listEl.scrollTop = listEl.scrollHeight;
            requestAnimationFrame(() => {
                listEl.scrollTo({ top: Math.max(0, target), behavior: 'smooth' });
            });
        } else {
            listEl.scrollTo({ top: Math.max(0, target), behavior: 'smooth' });
        }
    } else {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
    const highlightClass = 'ring-2 ring-primary/40';
    el.classList.add(...highlightClass.split(' '));
    window.setTimeout(() => {
        el.classList.remove(...highlightClass.split(' '));
    }, 1200);
};

const getOffsetTop = (el: HTMLElement, container: HTMLElement) => {
    let offset = 0;
    let node: HTMLElement | null = el;
    while (node && node !== container) {
        offset += node.offsetTop;
        node = node.offsetParent as HTMLElement | null;
    }
    return offset;
};

/**
 * 加载历史消息直到包含目标消息
 */
const fetchMessageContext = async (messageId: string) => {
    if (!conversationId.value) return false;
    const res = await messageApi.getContext(conversationId.value, messageId, { before: 20, after: 20 });
    if (!res?.success || !res.data?.items?.length) return false;
    replaceWithContext(res.data.items as MessageItem[]);
    hasMore.value = Boolean(res.data.hasMoreBefore);
    hasMoreAfter.value = Boolean(res.data.hasMoreAfter);
    initialLoading.value = false;
    return true;
};

const replaceWithContext = (incoming: MessageItem[]) => {
    const map = new Map<string, MessageItem>();
    incoming.forEach(item => map.set(item.id, item));
    messages.value = Array.from(map.values()).sort((a, b) => {
        const seqA = a.sequence ?? 0;
        const seqB = b.sequence ?? 0;
        return seqA - seqB;
    });
    messageElementMap.clear();
    pendingStreamIds.clear();
    pendingStreamContent.clear();
    autoScrollEnabled.value = false;
    suppressScrollFetchUntil.value = Date.now() + 800;
};

const fetchConversation = async () => {
    if (!conversationId.value) return;
    const res = await conversationApi.findOne(conversationId.value);
    if (res.data) {
        currentConversation.value = res.data;
        await fetchMentionMembers();
    }
};

const fetchMentionMembers = async () => {
    const conv = currentConversation.value;
    if (!conv) return;
    if (conv.type === 'GROUP') {
        const res = await conversationApi.getMembers(conv.id);
        if (res.data) {
            const typeMap: Record<string, string> = {};
            mentionMembers.value = res.data
                .map(item => item.user)
                .filter((user: any) => user && user.id && user.id !== currentUserId.value)
                .map((user: any) => {
                    if (user?.id && user?.accountType) {
                        typeMap[user.id] = user.accountType;
                    }
                    return ({
                        id: user.id,
                        name: user.name || user.email || '用户',
                        image: user.image || null,
                        accountType: user.accountType || null
                    })
                });
            memberTypeMap.value = typeMap;
        }
        return;
    }
    mentionMembers.value = [];
    memberTypeMap.value = {};
};

watch(memberTypeMap, () => {
    if (!messages.value.length) return;
    messages.value = applyRemarksToReadInfo(messages.value);
}, { deep: true });

watch(showEmojiPanel, (visible) => {
    if (visible) ensureEmojiPanelData();
});

watch([emojiKeyword], () => {
    if (!showEmojiPanel.value) return;
    scheduleEmojiSearch();
});

watch(emojiAddDialogVisible, (visible) => {
    if (!visible) {
        resetEmojiForm();
        emojiAddSource.messageId = '';
        emojiAddSource.imageUrl = '';
    }
});

watch(emojiManageMode, () => {
    nextTick(() => animateEmojiGrid());
});

const hasMentionNode = (node: any): boolean => {
    if (!node) return false;
    if (node.type === 'mention') return true;
    if (Array.isArray(node.content)) {
        return node.content.some(hasMentionNode);
    }
    return false;
};

const getEmojiImageUrl = (url: string) => {
    if (!url) return '';
    return resolveAssetUrl(url);
};

const emojiCategoryMap = computed(() => {
    return emojiCategories.value.reduce((acc, item) => {
        acc[item.id] = item;
        return acc;
    }, {} as Record<string, EmojiCategoryItem>);
});

const resetEmojiForm = () => {
    emojiForm.name = '';
    emojiForm.categoryId = '';
    emojiForm.description = '';
    emojiForm.keywords = '';
    emojiNewCategoryName.value = '';
    emojiNewCategoryDesc.value = '';
};

const openEmojiAddDialog = (payload: { messageId: string; imageUrl: string; name?: string }) => {
    emojiAddSource.messageId = payload.messageId;
    emojiAddSource.imageUrl = normalizeUploadPath(payload.imageUrl);
    resetEmojiForm();
    emojiForm.name = payload.name?.trim() || '';
    emojiAddDialogVisible.value = true;
    if (!emojiCategories.value.length) {
        loadEmojiCategories();
    }
};

const openEmojiAddDialogFromUpload = (imageUrl: string) => {
    emojiAddSource.messageId = '';
    emojiAddSource.imageUrl = normalizeUploadPath(imageUrl);
    resetEmojiForm();
    emojiAddDialogVisible.value = true;
    if (!emojiCategories.value.length) {
        loadEmojiCategories();
    }
};

const toggleEmojiPanel = () => {
    showEmojiPanel.value = !showEmojiPanel.value;
    if (showEmojiPanel.value) {
        ensureEmojiPanelData();
    }
};

const ensureEmojiPanelData = async () => {
    await Promise.all([
        loadEmojiCategories(),
        loadEmojiList()
    ]);
};

const loadEmojiCategories = async (force = false) => {
    if (emojiCategories.value.length && !force) return;
    const res = await emojiApi.getCategories('ACTIVE');
    if (res.data) emojiCategories.value = res.data;
};

const loadEmojiList = async () => {
    if (!showEmojiPanel.value) return;
    emojiLoading.value = true;
    try {
        const res = await emojiApi.findAll({
            page: 1,
            limit: 200,
            keyword: emojiKeyword.value.trim() || undefined,
            status: 'ACTIVE'
        });
        if (res.data) emojiItems.value = res.data.items;
    } finally {
        emojiLoading.value = false;
        nextTick(() => animateEmojiGrid());
    }
};

const scheduleEmojiSearch = () => {
    if (emojiSearchTimer) {
        clearTimeout(emojiSearchTimer);
    }
    emojiSearchTimer = setTimeout(() => {
        loadEmojiList();
    }, 200);
};

const handleSendEmoji = async (emoji: EmojiItem) => {
    if (sending.value || !conversationId.value) return;
    sending.value = true;
    try {
        let payload: any = {
            emojiId: emoji.id,
            imageUrl: normalizeUploadPath(emoji.imageUrl),
            name: emoji.name,
            categoryId: emoji.categoryId || null
        };
        if (quotedMessage.value) {
            payload.quote = {
                messageId: quotedMessage.value.messageId,
                senderName: quotedMessage.value.senderName,
                content: quotedMessage.value.content,
                sequence: quotedMessage.value.sequence ?? null
            };
        }
        const res = await messageApi.send({
            conversationId: conversationId.value,
            content: emoji.name || '[表情]',
            payload,
            type: messageApi.MessageType.EMOJI,
            clientMessageId: `c_${Date.now()}`
        });
        if (res.data) {
            const patched = applyRemarksToReadInfo(applyRemarks([res.data as MessageItem]))[0] || (res.data as MessageItem);
            upsertMessage(patched);
            quotedMessage.value = null;
            showEmojiPanel.value = false;
            scrollToBottom('smooth');
            busEmit('chat:message-sync', patched);
        }
    } catch (e: any) {
        toast.error(e.message || '发送失败');
    } finally {
        sending.value = false;
    }
};

const submitEmojiAdd = async () => {
    if (!emojiForm.name.trim()) {
        toast.info('请输入表情名称');
        return;
    }
    try {
        let categoryId = emojiForm.categoryId || undefined;
        if (emojiForm.categoryId === '__new__') {
            if (!emojiNewCategoryName.value.trim()) {
                toast.info('请输入新分类名称');
                return;
            }
            const created = await emojiApi.createCategory({
                name: emojiNewCategoryName.value.trim(),
                description: emojiNewCategoryDesc.value.trim() || undefined
            });
            categoryId = created.data?.id;
            await loadEmojiCategories(true);
        }
        const payload = {
            name: emojiForm.name.trim(),
            categoryId,
            description: emojiForm.description.trim() || undefined,
            keywords: emojiForm.keywords.trim() || undefined
        };
        const res = emojiAddSource.messageId
            ? await emojiApi.createFromMessage({ messageId: emojiAddSource.messageId, ...payload })
            : await emojiApi.createEmoji({ imageUrl: emojiAddSource.imageUrl, ...payload });
        if (res.data) {
            toast.success('已添加到表情库');
            emojiAddDialogVisible.value = false;
            resetEmojiForm();
            await loadEmojiList();
        }
    } catch (e: any) {
        toast.error(e?.message || '添加表情失败');
    }
};

const handleEmojiUpload = () => {
    if (emojiUploadLoading.value) return;
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = async (e) => {
        const file = (e.target as HTMLInputElement).files?.[0];
        if (!file) return;
        emojiUploadLoading.value = true;
        try {
            const response = await uploadFiles('message', [file]);
            if (response.success && response.data?.files?.[0]) {
                const imageUrl = normalizeUploadPath(response.data.files[0]);
                openEmojiAddDialogFromUpload(imageUrl);
            } else {
                toast.error('图片上传失败');
            }
        } catch (err: any) {
            toast.error(err?.message || '图片上传失败');
        } finally {
            emojiUploadLoading.value = false;
        }
    };
    input.click();
};


const handleEmojiSortUpdate = async (emoji: EmojiItem, sortOrder: number) => {
    await emojiApi.updateEmojiOrder(emoji.id, sortOrder);
    await loadEmojiList();
};

const handleEmojiRemove = async (emoji: EmojiItem) => {
    await emojiApi.hideEmoji(emoji.id);
    await loadEmojiList();
};

const handleEmojiDragStart = (emoji: EmojiItem, event?: DragEvent) => {
    if (!emojiManageMode.value) return;
    emojiDraggingId.value = emoji.id;
    if (event?.dataTransfer) {
        event.dataTransfer.effectAllowed = 'move';
        event.dataTransfer.setData('text/plain', emoji.id);
    }
};

const handleEmojiDrop = async (target: EmojiItem, event?: DragEvent) => {
    const sourceId = emojiDraggingId.value;
    if (!emojiManageMode.value || !sourceId || sourceId === target.id) {
        emojiDraggingId.value = null;
        return;
    }
    const list = emojiItems.value.slice();
    const fromIndex = list.findIndex(item => item.id === sourceId);
    const toIndex = list.findIndex(item => item.id === target.id);
    if (fromIndex === -1 || toIndex === -1) {
        emojiDraggingId.value = null;
        return;
    }
    const [moved] = list.splice(fromIndex, 1);
    list.splice(toIndex, 0, moved);
    emojiItems.value = list;
    emojiDraggingId.value = null;
    const sortBase = list.length + 1;
    await Promise.all(list.map((item, index) => emojiApi.updateEmojiOrder(item.id, sortBase - index)));
};

const animateEmojiGrid = () => {
    const el = emojiGridRef.value;
    if (!el) return;
    const items = Array.from(el.querySelectorAll('[data-emoji-item]'));
    gsap.fromTo(items, { opacity: 0, y: 8 }, { opacity: 1, y: 0, duration: 0.25, stagger: 0.02, ease: 'power2.out' });
};

const handleEmojiOutsideClick = (event: MouseEvent) => {
    if (!showEmojiPanel.value) return;
    const target = event.target as Node | null;
    if (!target) return;
    const panel = emojiPanelRef.value;
    const button = emojiButtonRef.value;
    if (panel && panel.contains(target)) return;
    if (button && button.contains(target)) return;
    showEmojiPanel.value = false;
};

// 发送消息
const handleSend = async () => {
    const text = messagePlainText.value.trim();
    const hasJson = messageJson.value && messageJson.value.content && messageJson.value.content.length > 0;

    if ((!text && !hasJson && !quotedMessage.value) || sending.value) return;

    sending.value = true;
    try {
        const isRichText = !!messageJson.value && (
            messageJson.value?.content?.some((n: any) => n.type === 'image' || n.type === 'codeBlock') ||
            hasMentionNode(messageJson.value)
        );

        let messageType = isRichText ? messageApi.MessageType.RICH_TEXT : messageApi.MessageType.TEXT;
        let content = text || '[富文本消息]';
        let payload = toRaw(messageJson.value);
        if (quotedMessage.value) {
            const quote = {
                messageId: quotedMessage.value.messageId,
                senderName: quotedMessage.value.senderName,
                content: quotedMessage.value.content,
                sequence: quotedMessage.value.sequence ?? null
            };
            payload = payload ? { ...payload, quote } : { quote };
        }
        payload = payload ? normalizeMessageImagePayload(payload) : payload;

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
            quotedMessage.value = null;
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
                    const imageUrl = resolveAssetUrl(response.data.files[0]);
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
        const pending = pendingStreamContent.get(patched.id);
        if (pending !== undefined) {
            const idx = messages.value.findIndex(item => item.id === patched.id);
            if (idx >= 0) {
                messages.value[idx] = {
                    ...messages.value[idx],
                    content: pending
                };
            }
            pendingStreamContent.delete(patched.id);
        }
        if (autoScrollEnabled.value || msg.senderId === currentUserId.value) {
            scrollToBottom('smooth');
        }
        busEmit('chat:message-sync', patched);
        reportReadIfNeeded();
    }
};

const handleMessageUpdated = async (msg: MessageItem) => {
    if (msg.conversationId !== conversationId.value) return;
    await ensureRemarks([msg]);
    const patched = applyRemarksToReadInfo(applyRemarks([msg]))[0] || msg;
    upsertMessage(patched);
    if (autoScrollEnabled.value) {
        scrollToBottom('auto');
    }
};

const handleMessageStream = (payload: { conversationId: string; messageId: string; delta?: string; fullContent?: string }) => {
    if (payload.conversationId !== conversationId.value) return;
    const idx = messages.value.findIndex(item => item.id === payload.messageId);
    if (idx < 0) {
        const previous = pendingStreamContent.get(payload.messageId) || '';
        const nextContent = payload.fullContent ?? `${previous}${payload.delta || ''}`;
        pendingStreamContent.set(payload.messageId, nextContent);
        pendingStreamIds.add(payload.messageId);
        scheduleStreamSync();
        return;
    }
    const message = messages.value[idx];
    const base = pendingStreamContent.get(payload.messageId) ?? (message.content || '');
    const nextContent = payload.fullContent ?? `${base}${payload.delta || ''}`;
    messages.value[idx] = {
        ...message,
        content: nextContent
    };
    pendingStreamContent.delete(payload.messageId);
    scheduleStreamScroll();
};

const handleMessageRevoked = (payload: { id: string; content?: string | null; payload?: any; status?: string }) => {
    const idx = messages.value.findIndex(item => item.id === payload.id);
    if (idx < 0) return;
    const current = messages.value[idx];
    messages.value[idx] = {
        ...current,
        status: messageApi.MessageStatus.REVOKED,
        content: payload.content ?? null,
        payload: payload.payload ?? null
    } as MessageItem;
};

const handleMessageRead = (payload: { conversationId: string; userId: string; sequence?: number | string }) => {
    if (payload.conversationId !== conversationId.value || payload.sequence === undefined) return;
    const sequence = Number(payload.sequence);
    if (Number.isNaN(sequence)) return;
    updateReadInfoForUser(payload.userId, sequence);
};

const setupSocketListeners = () => {
    socketDisposers.forEach(dispose => dispose());
    socketDisposers = [];
    socketDisposers.push(appSocket.on('new-message', handleNewMessage));
    socketDisposers.push(appSocket.on('message-updated', handleMessageUpdated));
    socketDisposers.push(appSocket.on('message-stream', handleMessageStream));
    socketDisposers.push(appSocket.on('message-revoked', handleMessageRevoked));
    socketDisposers.push(appSocket.on('message-read', handleMessageRead));
};

watch(() => conversationId.value, () => {
    messages.value = [];
    currentConversation.value = null;
    showChatSettings.value = false;
    quotedMessage.value = null;
    showEmojiPanel.value = false;
    emojiAddDialogVisible.value = false;
    lastReportedReadId.value = null;
    lastReportedReadSeq.value = 0;
    hasMoreAfter.value = false;
    loadingAfter.value = false;
    busEmit('chat:active-conversation', conversationId.value);
    autoScrollEnabled.value = true;
    pendingStreamIds.clear();
    pendingStreamContent.clear();
    if (streamSyncTimer) {
        clearTimeout(streamSyncTimer);
        streamSyncTimer = null;
    }
    if (streamScrollRaf) {
        cancelAnimationFrame(streamScrollRaf);
        streamScrollRaf = null;
    }
    if (emojiSearchTimer) {
        clearTimeout(emojiSearchTimer);
        emojiSearchTimer = null;
    }
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
    busOn('chat:quote-message', handleQuoteMessage);
    busOn('chat:scroll-to-message', scrollToMessageById);
    busOn('chat:message-revoked-local', handleMessageRevoked);
    busOn('emoji:add-from-message', openEmojiAddDialog);
    busOn('emoji:pin-existing', async (payload: { emojiId: string }) => {
        if (!payload?.emojiId) return;
        try {
            await emojiApi.pinEmoji(payload.emojiId);
            if (showEmojiPanel.value) {
                await loadEmojiList();
            }
        } catch (e: any) {
            toast.error(e?.message || '置顶失败');
        }
    });
    busEmit('chat:active-conversation', conversationId.value);
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            showExtensionsMenu.value = false;
            showEmojiPanel.value = false;
        }
    });
    document.addEventListener('click', handleEmojiOutsideClick, true);
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
    busOff('chat:quote-message', handleQuoteMessage);
    busOff('chat:scroll-to-message', scrollToMessageById);
    busOff('chat:message-revoked-local', handleMessageRevoked);
    busOff('emoji:add-from-message', openEmojiAddDialog);
    busOff('emoji:pin-existing');
    busEmit('chat:active-conversation', null);
    socketDisposers.forEach(dispose => dispose());
    socketDisposers = [];
    pendingStreamIds.clear();
    pendingStreamContent.clear();
    if (streamSyncTimer) {
        clearTimeout(streamSyncTimer);
        streamSyncTimer = null;
    }
    if (streamScrollRaf) {
        cancelAnimationFrame(streamScrollRaf);
        streamScrollRaf = null;
    }
    messageObserver.value?.disconnect();
    messageObserver.value = null;
    messageElementMap.clear();
    isTauriDragOver.value = false;
    if (unlistenTauriDrop) {
        unlistenTauriDrop();
        unlistenTauriDrop = null;
    }
    document.removeEventListener('click', handleEmojiOutsideClick, true);
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
                        <h2
                            class="text-[15px] font-black tracking-tight truncate leading-tight flex items-center gap-2">
                            <span>{{ currentConversation.title }}</span>
                            <span
                                v-if="currentConversation.type === 'PRIVATE' && currentConversation.otherUserAccountType === 'BOT'"
                                class="badge badge-outline badge-xs">机器人</span>
                        </h2>
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
                    <div v-if="quotedMessage"
                        class="mx-2 mb-2 flex items-start justify-between gap-3 rounded-2xl border border-base-content/10 bg-base-100/80 px-3 py-2 text-xs">
                        <div class="min-w-0">
                            <div class="font-bold opacity-70 truncate">{{ quotedMessage.senderName || '消息引用' }}</div>
                            <div class="opacity-60 truncate">{{ quotedMessage.content || '...' }}</div>
                        </div>
                        <button type="button" class="btn btn-ghost btn-xs h-6 px-2" @click="clearQuotedMessage">
                            取消
                        </button>
                    </div>

                    <BaseEditor ref="editorRef" v-model="messageJson" :disabled="sending" @send="handleSend"
                        :enable-mention="true" :mention-items="mentionMembers" mention-title="选择成员"
                        @textChange="val => { messagePlainText = val; }" class="px-4 py-2 min-h-[44px]" />

                    <div v-show="isTauriDragOver"
                        class="absolute inset-2 bg-primary/10 backdrop-blur-sm flex items-center justify-center rounded-[24px] border-2 border-dashed border-primary z-50 pointer-events-none">
                        <div class="flex items-center gap-2 text-primary font-medium">
                            <Icon name="mingcute:add-line" size="24" />
                            <span>释放鼠标上传文件</span>
                        </div>
                    </div>


                    <div class="flex items-center justify-between px-2 pt-2.5 border-t border-base-content/5">
                        <div class="flex gap-0.5 relative">
                            <button ref="emojiButtonRef"
                                class="btn btn-ghost btn-circle btn-sm opacity-30 hover:opacity-100"
                                @click="toggleEmojiPanel" :class="{ 'text-primary opacity-100': showEmojiPanel }">
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

                            <div v-if="showEmojiPanel" ref="emojiPanelRef"
                                class="absolute bottom-full left-0 mb-4 w-[520px] max-w-[92vw] bg-base-100 border border-base-200 rounded-3xl shadow-2xl p-5 z-50 animate-in fade-in slide-in-from-bottom-2">
                                <div class="flex items-center justify-between gap-2 mb-3">
                                    <div class="text-xs font-semibold opacity-70">表情</div>
                                    <div class="flex items-center gap-2">
                                        <button class="btn btn-ghost btn-xs"
                                            @click="emojiManageMode = !emojiManageMode">
                                            {{ emojiManageMode ? '完成' : '管理' }}
                                        </button>
                                        <button class="btn btn-ghost btn-xs" @click="showEmojiPanel = false">关闭</button>
                                    </div>
                                </div>

                                <div class="flex items-center gap-2 mb-3">
                                    <input v-model="emojiKeyword" type="text" placeholder="搜索表情/关键词"
                                        class="input input-sm input-bordered w-full rounded-xl" />
                                </div>

                                <div class="space-y-3">
                                    <div class="flex items-center justify-between">
                                        <div class="text-xs font-semibold opacity-70">表情列表</div>
                                        <button class="btn btn-ghost btn-xs" @click="handleEmojiUpload"
                                            :disabled="emojiUploadLoading">
                                            <span v-if="emojiUploadLoading"
                                                class="loading loading-spinner loading-xs"></span>
                                            <span v-else>添加</span>
                                        </button>
                                    </div>

                                    <div v-if="emojiLoading" class="py-6 flex items-center justify-center">
                                        <span class="loading loading-dots loading-sm"></span>
                                    </div>
                                    <div v-else-if="emojiItems.length" ref="emojiGridRef"
                                        class="grid grid-cols-4 sm:grid-cols-5 lg:grid-cols-6 gap-3 max-h-80 overflow-y-auto">
                                        <div v-for="item in emojiItems" :key="item.id" data-emoji-item
                                            class="group relative aspect-square rounded-2xl bg-base-200/60 hover:bg-base-200 transition-all duration-200 hover:-translate-y-0.5"
                                            :draggable="emojiManageMode"
                                            @dragstart="(e) => handleEmojiDragStart(item, e)" @dragover.prevent
                                            @drop="(e) => handleEmojiDrop(item, e)">
                                            <button v-if="!emojiManageMode" class="w-full h-full p-3 flex items-center justify-center"
                                                @click="handleSendEmoji(item)">
                                                <img :src="getEmojiImageUrl(item.imageUrl)" :alt="item.name"
                                                    class="w-24 h-24 object-contain" />
                                            </button>
                                            <div v-else class="p-3 h-full flex flex-col justify-between">
                                                <div class="flex items-center justify-center flex-1">
                                                    <img :src="getEmojiImageUrl(item.imageUrl)" :alt="item.name"
                                                        class="w-24 h-24 object-contain" />
                                                </div>
                                                <div class="flex items-center justify-between text-[10px] opacity-60">
                                                    <span class="truncate">拖动排序</span>
                                                    <button class="btn btn-ghost btn-xs text-error"
                                                        @click="handleEmojiRemove(item)">
                                                        删除
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                    <div v-else class="py-8 text-center text-xs opacity-50">
                                        暂无表情
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div class="flex items-center gap-2">
                            <span class="text-[10px] font-bold opacity-20 hidden sm:inline uppercase tracking-tighter">
                                Ctrl + Enter to send
                            </span>
                            <button
                                class="btn btn-primary btn-sm h-10 px-6 rounded-2xl font-black shadow-xl shadow-primary/20 active:scale-95 transition-all"
                                :disabled="(!messagePlainText.trim() && !messageJson?.content?.length && !quotedMessage) || sending"
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

        <BaseModal v-model="emojiAddDialogVisible" title="添加表情" box-class="max-w-md w-full">
            <div class="space-y-4">
                <div class="flex items-start gap-3">
                    <div class="w-20 h-20 rounded-2xl bg-base-200/60 flex items-center justify-center overflow-hidden">
                        <img v-if="emojiAddSource.imageUrl" :src="getEmojiImageUrl(emojiAddSource.imageUrl)" alt="表情预览"
                            class="w-full h-full object-contain" />
                        <Icon v-else name="mingcute:emoji-line" size="28" class="opacity-30" />
                    </div>
                    <div class="flex-1 space-y-2">
                        <input v-model="emojiForm.name" type="text" placeholder="表情名称"
                            class="input input-sm input-bordered w-full rounded-xl" />
                        <select v-model="emojiForm.categoryId"
                            class="select select-sm select-bordered w-full rounded-xl">
                            <option value="">未分类</option>
                            <option v-for="cat in emojiCategories" :key="cat.id" :value="cat.id">{{ cat.name }}</option>
                            <option value="__new__">+ 新建分类</option>
                        </select>
                    </div>
                </div>

                <div v-if="emojiForm.categoryId === '__new__'" class="grid grid-cols-1 gap-2">
                    <input v-model="emojiNewCategoryName" type="text" placeholder="新分类名称"
                        class="input input-sm input-bordered w-full rounded-xl" />
                    <input v-model="emojiNewCategoryDesc" type="text" placeholder="新分类描述（可选）"
                        class="input input-sm input-bordered w-full rounded-xl" />
                </div>

                <textarea v-model="emojiForm.description" placeholder="表情描述（可选）"
                    class="textarea textarea-bordered w-full rounded-xl text-sm"></textarea>
                <input v-model="emojiForm.keywords" type="text" placeholder="关键词（用逗号分隔）"
                    class="input input-sm input-bordered w-full rounded-xl" />

                <div class="flex items-center justify-end gap-2">
                    <button class="btn btn-ghost btn-sm" @click="emojiAddDialogVisible = false">取消</button>
                    <button class="btn btn-primary btn-sm" @click="submitEmojiAdd">保存</button>
                </div>
            </div>
        </BaseModal>
    </div>
</template>
