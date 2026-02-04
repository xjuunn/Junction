<script setup lang="ts">
import { computed, ref } from 'vue';
import type { PrismaTypes } from '@junction/types';
import * as MessageApi from '~/api/message';
import RichTextRenderer from './RichTextRenderer.vue';

const props = defineProps<{
    message: PrismaTypes.Message & {
        sender?: { name: string; avatar?: string; image?: string };
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

/**
 * 获取撤回状态
 */
const isRevoked = computed(() => props.message.status === MessageApi.MessageStatus.REVOKED);
const displayRead = computed(() => props.isRead ?? props.readInfo?.isRead ?? false);
const totalReceivers = computed(() => (props.readInfo ? props.readInfo.readCount + props.readInfo.unreadCount : 0));
const isGroup = computed(() => props.isGroup);
const readInfo = computed(() => props.readInfo);

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
    if (props.message.type === 'RICH_TEXT' || (props.message.payload && typeof props.message.payload === 'object')) return 'RICH_TEXT';
    return 'PLAIN_TEXT';
});

/**
 * 切换已读详情显示
 */
const toggleReadDetail = () => {
    showReadDetail.value = !showReadDetail.value;
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
            <div v-if="!isMe" class="font-bold max-w-40 truncate">{{ message.sender?.name }}</div>
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
                    <div v-if="message.payload?.imageUrl" class="space-y-2">
                        <!-- 图片显示 -->
                        <div class="relative max-w-xs">
                            <img
                                :src="getImageUrl(message.payload.imageUrl)"
                                alt="图片消息"
                                class="w-full h-auto rounded-lg border border-base-content/10 cursor-pointer hover:opacity-90 transition-opacity"
                                @click="openImageViewer(message.payload.imageUrl)"
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

                <!-- 场景 3: Tiptap 富文本渲染 -->
                <RichTextRenderer v-else-if="renderMode === 'RICH_TEXT'" :node="message.payload" />

                <!-- 场景 4: 普通文本渲染 -->
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
