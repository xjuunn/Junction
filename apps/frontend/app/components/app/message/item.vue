<script setup lang="ts">
import { computed, ref } from 'vue';
import type { PrismaTypes } from '@junction/types';
import * as MessageApi from '~/api/message';
import { downloadFile, findExistingDownloadPath, openLocalDirForFile, openLocalPath } from '~/utils/download';
import { isTauri } from '~/utils/check';
import RichTextRenderer from './RichTextRenderer.vue';

const props = defineProps<{
    message: Pick<PrismaTypes.Message, 'id' | 'type' | 'content' | 'payload' | 'createdAt' | 'status' | 'senderId'> & {
        sender?: { name: string; avatar?: string | null; image?: string | null; accountType?: string | null } | null;
    };
    isMe: boolean;
    isRead?: boolean;
    isGroup?: boolean;
    readInfo?: {
        isRead: boolean;
        readCount: number;
        unreadCount: number;
        readMembers?: Array<{ id: string; name: string; image?: string | null }>;
        unreadMembers?: Array<{ id: string; name: string; image?: string | null }>;
    };
}>();

const emit = defineEmits<{
    revoke: [id: string];
}>();
const showReadDetail = ref(false);
const toast = useToast();
const dialog = useDialog();

/**
 * 获取撤回状态
 */
const isRevoked = computed(() => props.message.status === MessageApi.MessageStatus.REVOKED);
const displayRead = computed(() => props.isRead ?? props.readInfo?.isRead ?? false);
const totalReceivers = computed(() => (props.readInfo ? props.readInfo.readCount + props.readInfo.unreadCount : 0));
const isGroup = computed(() => props.isGroup);
const readInfo = computed(() => props.readInfo);
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
    if (isRevoked.value) return 'REVOKED';
    if (props.message.type === 'IMAGE') return 'IMAGE';
    if (props.message.type === 'FILE') return 'FILE';
    if (props.message.type === 'RICH_TEXT' || hasRichPayload.value) return 'RICH_TEXT';
    return 'PLAIN_TEXT';
});

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
    <div :class="['chat group transition-all duration-300', isMe ? 'chat-end' : 'chat-start']">
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

        <div :class="[
            'chat-bubble min-h-0 text-[14px] leading-relaxed shadow-sm relative group/bubble',
            isMe ? 'chat-bubble-primary' : 'chat-bubble-neutral bg-base-200 text-base-content border-none',
            isRevoked ? 'italic opacity-50' : ''
        ]">
            <div class="break-words max-w-[70vw] sm:max-w-md">
                <!-- 场景 1: 撤回提示 -->
                <template v-if="renderMode === 'REVOKED'">
                    {{ isMe ? '你撤回了一条消息' : '对方撤回了一条消息' }}
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
            <div v-if="!isRevoked && isMe"
                class="absolute top-0 right-full mr-2 opacity-0 group-hover/bubble:opacity-100 transition-all flex p-1 bg-base-100 shadow-xl rounded-lg border border-base-content/5 z-10">
                <button @click="emit('revoke', message.id)" class="btn btn-xs btn-circle btn-ghost text-error">
                    <Icon name="mingcute:refresh-3-line" size="14" />
                </button>
            </div>
        </div>

        <div class="chat-footer opacity-40 text-[10px] mt-1 flex items-center gap-2 px-1">
            <template v-if="isMe && !isRevoked">
                <Icon :name="displayRead ? 'mingcute:checks-fill' : 'mingcute:check-line'"
                    :class="displayRead ? 'text-primary' : ''" size="12" />
                <div v-if="isGroup && readInfo && totalReceivers" class="relative">
                    <button class="btn btn-ghost btn-xs h-5 px-2 rounded-full" @click="toggleReadDetail">
                        已读 {{ readInfo.readCount }}/{{ totalReceivers }}
                    </button>
                    <div v-if="showReadDetail"
                        class="absolute bottom-full right-0 mb-2 w-48 bg-base-100 border border-base-200 rounded-xl shadow-xl p-3 space-y-2 text-[11px] opacity-100">
                        <div class="font-bold opacity-70">已读</div>
                        <div v-if="readInfo.readMembers?.length" class="flex flex-wrap gap-1">
                            <span v-for="member in readInfo.readMembers" :key="member.id"
                                class="badge badge-ghost badge-sm">
                                {{ member.name }}
                            </span>
                        </div>
                        <div v-else class="opacity-50">暂无</div>
                        <div class="font-bold opacity-70 pt-1">未读</div>
                        <div v-if="readInfo.unreadMembers?.length" class="flex flex-wrap gap-1">
                            <span v-for="member in readInfo.unreadMembers" :key="member.id"
                                class="badge badge-outline badge-sm">
                                {{ member.name }}
                            </span>
                        </div>
                        <div v-else class="opacity-50">暂无</div>
                    </div>
                </div>
            </template>
        </div>
    </div>
</template>
