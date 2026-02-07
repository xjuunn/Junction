<script setup lang="ts">
import { computed, ref, useAttrs } from 'vue';
import { useClipboard } from '@vueuse/core';
import { defineContextMenu } from '~/composables/useContextMenu';
import type { PrismaTypes } from '@junction/types';
import * as MessageApi from '~/api/message';
import { downloadFile, findExistingDownloadPath, openLocalDirForFile, openLocalPath } from '~/utils/download';
import { isTauri } from '~/utils/check';
import RichTextRenderer from './RichTextRenderer.vue';

defineOptions({ inheritAttrs: false });

const props = defineProps<{
    message: Pick<PrismaTypes.Message, 'id' | 'type' | 'content' | 'payload' | 'createdAt' | 'status' | 'senderId' | 'sequence' | 'conversationId'> & {
        sender?: { name: string; avatar?: string | null; image?: string | null; accountType?: string | null } | null;
    };
    isMe: boolean;
    isRead?: boolean;
    isGroup?: boolean;
    readInfo?: {
        isRead: boolean;
        readCount: number;
        unreadCount: number;
        readMembers?: Array<{ id: string; name: string; image?: string | null; accountType?: string | null }>;
        unreadMembers?: Array<{ id: string; name: string; image?: string | null; accountType?: string | null }>;
    };
}>();

const emit = defineEmits<{
    revoke: [id: string];
}>();
const showReadDetail = ref(false);
const toast = useToast();
const dialog = useDialog();
const attrs = useAttrs();
const { copy } = useClipboard();
const { emit: busEmit } = useEmitt();

/**
 * 获取撤回状态
 */
const isRevoked = computed(() => props.message.status === MessageApi.MessageStatus.REVOKED);
const isRevokedLike = computed(() => {
    if (isRevoked.value) return true;
    const hasContent = !!props.message.content && String(props.message.content).trim().length > 0;
    const hasPayload = !!props.message.payload;
    return !hasContent && !hasPayload && props.message.type !== MessageApi.MessageType.SYSTEM;
});
const isGroup = computed(() => props.isGroup);
const readInfo = computed(() => props.readInfo);
const humanReadMembers = computed(() => readInfo.value?.readMembers?.filter(member => member.accountType !== 'BOT') ?? []);
const humanUnreadMembers = computed(() => readInfo.value?.unreadMembers?.filter(member => member.accountType !== 'BOT') ?? []);
const totalReceivers = computed(() => humanReadMembers.value.length + humanUnreadMembers.value.length);
const displayRead = computed(() => {
    if (readInfo.value) {
        return totalReceivers.value > 0 && humanUnreadMembers.value.length === 0;
    }
    return props.isRead ?? false;
});
const isBotSender = computed(() => props.message.sender?.accountType === 'BOT');
const imagePayload = computed<{ imageUrl: string } | null>(() => {
    const payload = props.message.payload;
    if (!payload || typeof payload !== 'object') return null;
    if (!('imageUrl' in payload)) return null;
    const imageUrl = (payload as { imageUrl?: string }).imageUrl;
    if (!imageUrl) return null;
    return { imageUrl };
});
const filePayload = computed<{ fileUrl: string; fileName?: string; size?: number } | null>(() => {
    const payload = props.message.payload;
    if (!payload || typeof payload !== 'object') return null;
    if (!('fileUrl' in payload)) return null;
    const fileUrl = (payload as { fileUrl?: string }).fileUrl;
    if (!fileUrl) return null;
    const fileName = (payload as { fileName?: string }).fileName;
    const size = (payload as { size?: number }).size;
    return { fileUrl, fileName, size };
});
const hasRichPayload = computed(() => {
    const payload = props.message.payload as any;
    if (!payload || typeof payload !== 'object') return false;
    if (imagePayload.value || filePayload.value) return true;
    if (Array.isArray(payload.content)) return true;
    if (payload.type || payload.attrs) return true;
    return false;
});

/**
 * 获取完整的图片URL
 */
const getImageUrl = (imageUrl: string) => {
    if (!imageUrl) return '';
    if (imageUrl.startsWith('http')) return imageUrl;

    const { public: { apiUrl } } = useRuntimeConfig();
    // 图片URL已经是完整路径，直接拼接基础URL
    return `${apiUrl}${imageUrl}`;
};

/**
 * 打开图片查看器
 */
const openImageViewer = (imageUrl: string) => {
    // 这里可以集成图片查看器组件
    // 暂时使用新窗口打开
    const fullUrl = getImageUrl(imageUrl);
    window.open(fullUrl, '_blank', 'noopener,noreferrer');
};

/**
 * 确定内容渲染模式
 */
const renderMode = computed(() => {
    if (isRevokedLike.value) return 'REVOKED';
    if (props.message.type === 'IMAGE') return 'IMAGE';
    if (props.message.type === 'FILE') return 'FILE';
    if (props.message.type === 'RICH_TEXT' || hasRichPayload.value) return 'RICH_TEXT';
    return 'PLAIN_TEXT';
});

/**
 * 获取撤回显示文案
 */
const revokedText = computed(() => (props.isMe ? '你撤回了一条消息' : '对方撤回了一条消息'));

const rootAttrs = computed(() => {
    const { class: _class, ...rest } = attrs;
    return rest;
});

const quotedMessage = computed(() => extractQuotedMessage(props.message.payload));

const canRevoke = computed(() => {
    if (!props.isMe || isRevokedLike.value) return false;
    const createdAt = new Date(props.message.createdAt).getTime();
    return Date.now() - createdAt <= 2 * 60 * 1000;
});

const messageMenu = defineContextMenu<{ id: string; content?: string | null; type: string; isMe: boolean }>([
    {
        id: 'copy',
        label: '复制',
        icon: 'lucide:copy',
        handler: () => handleCopy(),
    },
    {
        id: 'quote',
        label: '引用',
        icon: 'lucide:quote',
        show: () => !isRevokedLike.value,
        handler: () => handleQuote(),
    },
    { type: 'separator' },
    {
        id: 'revoke',
        label: '撤回',
        icon: 'lucide:undo-2',
        danger: true,
        show: () => canRevoke.value,
        handler: () => handleRevoke(),
    },
]);

/**
 * 获取可复制的消息文本
 */
const getCopyText = () => {
    if (imagePayload.value?.imageUrl) return getImageUrl(imagePayload.value.imageUrl);
    if (filePayload.value?.fileUrl) return filePayload.value.fileUrl;
    return props.message.content || '';
};

/**
 * 复制消息内容
 */
const handleCopy = async () => {
    const text = getCopyText();
    if (!text) {
        toast.info('无可复制内容');
        return;
    }
    await copy(text);
    toast.success('已复制');
};

/**
 * 引用消息
 */
const handleQuote = async () => {
    const senderName = props.message.sender?.name || (props.isMe ? '我' : '对方');
    const content = getQuotePreview();
    busEmit('chat:quote-message', {
        messageId: props.message.id,
        senderName,
        content,
        sequence: props.message.sequence ?? null,
    });
    toast.success('已添加引用');
};

/**
 * 删除消息
 */
/**
 * 撤回消息
 */
const handleRevoke = async () => {
    const confirmed = await dialog.confirm({
        title: '撤回消息',
        content: '确认撤回这条消息吗？',
        type: 'warning',
        confirmText: '撤回',
        cancelText: '取消',
        persistent: true
    });
    if (!confirmed) return;
    const res = await MessageApi.revoke(props.message.id);
    if (!res.success) {
        toast.error(res.message || '撤回失败');
        return;
    }
    emit('revoke', props.message.id);
    busEmit('chat:message-revoked-local', {
        id: props.message.id,
        conversationId: props.message.conversationId,
        content: null,
        payload: null,
        status: MessageApi.MessageStatus.REVOKED
    });
    toast.success('已撤回');
};

/**
 * 提取引用消息信息
 */
function extractQuotedMessage(payload: unknown) {
    if (!payload || typeof payload !== 'object') return null;
    const quote = (payload as any).quote || (payload as any).quotedMessage;
    if (!quote || typeof quote !== 'object') return null;
    const messageId = String((quote as any).messageId || '');
    if (!messageId) return null;
    return {
        messageId,
        senderName: String((quote as any).senderName || ''),
        content: String((quote as any).content || ''),
        sequence: typeof (quote as any).sequence === 'number' ? (quote as any).sequence : null,
    };
}

/**
 * 获取引用预览文本
 */
function getQuotePreview() {
    if (imagePayload.value?.imageUrl) return '[图片]';
    if (filePayload.value?.fileUrl) return '[文件]';
    return props.message.content || '';
}

/**
 * 跳转到被引用的消息
 */
function handleQuoteJump() {
    if (!quotedMessage.value) return;
    busEmit('chat:scroll-to-message', {
        messageId: quotedMessage.value.messageId,
        sequence: quotedMessage.value.sequence ?? null,
    });
}

/**
 * 切换已读详情显示
 */
const toggleReadDetail = () => {
    showReadDetail.value = !showReadDetail.value;
};

/**
 * 触发文件下载
 */
const handleDownload = async () => {
    if (!filePayload.value) return;
    const fileName = filePayload.value.fileName || '文件';
    if (isTauri()) {
        const existingPath = await findExistingDownloadPath(fileName, { fileName });
        if (existingPath) {
            const openFile = await dialog.confirm({
                title: '文件已下载',
                content: `检测到 ${fileName} 已下载，请选择操作。`,
                type: 'info',
                confirmText: '打开文件',
                cancelText: '打开目录',
                persistent: true,
                hideCloseButton: true
            });
            if (openFile) {
                try {
                    await openLocalPath(existingPath);
                } catch (err: any) {
                    toast.error(err?.message || '打开文件失败');
                }
            } else {
                try {
                    await openLocalDirForFile(existingPath);
                } catch (err: any) {
                    toast.error(err?.message || '打开目录失败');
                }
            }
            return;
        }
    }
    const confirmed = await dialog.confirm({
        title: '下载文件',
        content: `确认下载 ${fileName} 吗？`,
        type: 'info'
    });
    if (!confirmed) return;

    try {
        const url = filePayload.value.fileUrl;
        const result = await downloadFile({
            source: { url },
            target: { fileName }
        });
        if (!result.success) {
            toast.error(result.error || '下载失败');
        } else {
            toast.success('下载完成');
        }
    } catch (err: any) {
        toast.error(err?.message || '下载失败');
    }
};
</script>

<template>
    <div
        v-bind="rootAttrs"
        :class="['chat group transition-all duration-300', isMe ? 'chat-end' : 'chat-start', attrs.class]">
        <div class="chat-image avatar">
            <div class="w-10 rounded-full bg-base-300 ring-1 ring-base-content/5 overflow-hidden">
                <BaseAvatar :text="message.sender?.name" :src="message.sender?.avatar || message.sender?.image"
                    :height="40" :width="40" />
            </div>
        </div>

        <div class="chat-header opacity-50 text-[11px] mb-1 flex items-center gap-2 px-1">
            <div v-if="!isMe" class="font-bold max-w-40 truncate flex items-center gap-2">
                <span>{{ message.sender?.name }}</span>
                <span v-if="isBotSender" class="badge badge-outline badge-xs">机器人</span>
            </div>
            <time class="tabular-nums">{{ formatTimeAgo(message.createdAt) }}</time>
        </div>

        <div
            v-context-menu="{ items: messageMenu, context: { id: message.id, content: message.content, type: message.type, isMe } }"
            :class="[
            'chat-bubble min-h-0 text-[14px] leading-relaxed shadow-sm relative group/bubble',
            isMe ? 'chat-bubble-primary' : 'chat-bubble-neutral bg-base-200 text-base-content border-none',
            isRevokedLike ? 'italic opacity-50' : ''
        ]">
            <div class="break-words max-w-[70vw] sm:max-w-md">
                <button
                    v-if="quotedMessage"
                    type="button"
                    class="w-full mb-2 rounded-lg border border-base-content/10 bg-base-100/60 px-3 py-2 text-left text-xs hover:bg-base-200/70 transition-colors"
                    @click="handleQuoteJump">
                    <div class="font-bold opacity-70 truncate">{{ quotedMessage.senderName || '消息引用' }}</div>
                    <div class="opacity-60 truncate">{{ quotedMessage.content || '...' }}</div>
                </button>
                <!-- 场景 1: 撤回提示 -->
                <template v-if="renderMode === 'REVOKED'">
                    {{ revokedText }}
                </template>

                <!-- 场景 2: 图片消息渲染 -->
                <template v-else-if="renderMode === 'IMAGE'">
                    <div v-if="imagePayload" class="space-y-2">
                        <!-- 图片显示 -->
                        <div class="relative max-w-xs">
                            <img
                                :src="getImageUrl(imagePayload.imageUrl)"
                                alt="图片消息"
                                class="w-full h-auto rounded-lg border border-base-content/10 cursor-pointer hover:opacity-90 transition-opacity"
                                @click="openImageViewer(imagePayload.imageUrl)"
                                loading="lazy" />
                        </div>
                        <!-- 图片描述文本（如果有） -->
                        <div v-if="message.content && message.content !== '[图片]'" class="text-sm opacity-70">
                            {{ message.content }}
                        </div>
                    </div>
                    <!-- 容错：如果没有图片URL，显示文本 -->
                    <div v-else class="whitespace-pre-wrap">
                        {{ message.content || '[图片消息]' }}
                    </div>
                </template>

                <!-- 场景 3: 文件消息渲染 -->
                <template v-else-if="renderMode === 'FILE'">
                    <button v-if="filePayload" class="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-base-200 hover:bg-base-300 transition-colors"
                        @click="handleDownload">
                        <Icon name="mingcute:document-2-line" size="16" />
                        <span class="truncate max-w-[220px]">{{ filePayload.fileName || '文件' }}</span>
                    </button>
                    <div v-else class="whitespace-pre-wrap">
                        {{ message.content || '[文件]' }}
                    </div>
                </template>

                <!-- 场景 4: Tiptap 富文本渲染 -->
                <RichTextRenderer v-else-if="renderMode === 'RICH_TEXT'" :node="message.payload" />

                <!-- 场景 5: 普通文本渲染 -->
                <div v-else class="whitespace-pre-wrap">
                    {{ message.content }}
                </div>
            </div>

            <!-- 操作面板 -->
            <div v-if="!isRevokedLike && isMe"
                class="absolute top-0 right-full mr-2 opacity-0 group-hover/bubble:opacity-100 transition-all flex p-1 bg-base-100 shadow-xl rounded-lg border border-base-content/5 z-10">
                <button @click="emit('revoke', message.id)" class="btn btn-xs btn-circle btn-ghost text-error">
                    <Icon name="mingcute:refresh-3-line" size="14" />
                </button>
            </div>
        </div>

        <div class="chat-footer opacity-40 text-[10px] mt-1 flex items-center gap-2 px-1">
            <template v-if="isMe && !isRevokedLike">
                <Icon :name="displayRead ? 'mingcute:checks-fill' : 'mingcute:check-line'"
                    :class="displayRead ? 'text-primary' : ''" size="12" />
                <div v-if="isGroup && readInfo && totalReceivers" class="relative">
                    <button class="btn btn-ghost btn-xs h-5 px-2 rounded-full" @click="toggleReadDetail">
                        已读 {{ humanReadMembers.length }}/{{ totalReceivers }}
                    </button>
                </div>
            </template>
        </div>
    </div>

    <BaseModal v-model="showReadDetail" title="消息已读状态" box-class="max-w-lg w-full">
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div class="rounded-2xl border border-base-200 bg-base-100 p-4 space-y-3">
                <div class="flex items-center justify-between">
                    <span class="text-xs font-bold uppercase opacity-60">已读</span>
                    <span class="badge badge-ghost badge-sm bg-base-200 text-base-content border-none">{{ humanReadMembers.length }}</span>
                </div>
                <div v-if="humanReadMembers.length" class="space-y-2 max-h-56 overflow-y-auto">
                    <div v-for="member in humanReadMembers" :key="member.id"
                        class="flex items-center gap-2 p-2 rounded-xl bg-base-200/60">
                        <BaseAvatar :text="member.name" :src="member.image" :height="28" :width="28" />
                        <span class="text-sm font-medium truncate">{{ member.name }}</span>
                    </div>
                </div>
                <div v-else class="text-xs opacity-40">暂无已读成员</div>
            </div>

            <div class="rounded-2xl border border-base-200 bg-base-100 p-4 space-y-3">
                <div class="flex items-center justify-between">
                    <span class="text-xs font-bold uppercase opacity-60">未读</span>
                    <span class="badge badge-ghost badge-sm bg-base-200 text-base-content border-none">{{ humanUnreadMembers.length }}</span>
                </div>
                <div v-if="humanUnreadMembers.length" class="space-y-2 max-h-56 overflow-y-auto">
                    <div v-for="member in humanUnreadMembers" :key="member.id"
                        class="flex items-center gap-2 p-2 rounded-xl bg-base-200/60">
                        <BaseAvatar :text="member.name" :src="member.image" :height="28" :width="28" />
                        <span class="text-sm font-medium truncate">{{ member.name }}</span>
                    </div>
                </div>
                <div v-else class="text-xs opacity-40">暂无未读成员</div>
            </div>
        </div>
    </BaseModal>
</template>
