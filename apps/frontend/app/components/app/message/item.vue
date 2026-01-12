<script setup lang="ts">
import { computed } from 'vue';
import type { PrismaTypes } from '@junction/types';
import * as MessageApi from '~/api/message';
import RichTextRenderer from './RichTextRenderer.vue';

const props = defineProps<{
    message: PrismaTypes.Message & {
        sender?: { name: string; avatar?: string; image?: string };
    };
    isMe: boolean;
    isRead?: boolean;
}>();

const emit = defineEmits<{
    revoke: [id: string];
}>();

/**
 * 获取撤回状态
 */
const isRevoked = computed(() => props.message.status === MessageApi.MessageStatus.REVOKED);

/**
 * 确定内容渲染模式
 */
const renderMode = computed(() => {
    if (isRevoked.value) return 'REVOKED';
    if (props.message.payload && typeof props.message.payload === 'object') return 'RICH_TEXT';
    return 'PLAIN_TEXT';
});
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
            <span v-if="!isMe" class="font-bold">{{ message.sender?.name }}</span>
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

                <!-- 场景 2: Tiptap 富文本渲染 -->
                <RichTextRenderer v-else-if="renderMode === 'RICH_TEXT'" :node="message.payload" />

                <!-- 场景 3: 普通文本补丁 -->
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

        <div class="chat-footer opacity-40 text-[10px] mt-1 flex items-center gap-1.5 px-1">
            <template v-if="isMe && !isRevoked">
                <Icon :name="isRead ? 'mingcute:check-all-fill' : 'mingcute:check-line'"
                    :class="isRead ? 'text-primary' : ''" size="12" />
            </template>
        </div>
    </div>
</template>