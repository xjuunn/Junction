<script setup lang="ts">
import * as MessageApi from '~/api/message';

/**
 * 消息项显示组件
 * @param message 消息数据
 * @param isMe 是否本人
 */
const props = defineProps<{
    message: any;
    isMe: boolean;
}>();

const emit = defineEmits(['revoke']);

/**
 * 计算显示文本
 */
const displayContent = computed(() => {
    if (props.message.status === MessageApi.MessageStatus.REVOKED) {
        return props.isMe ? '你撤回了一条消息' : '对方撤回了一条消息';
    }
    // 默认渲染截断的纯文本，如果需要完整富文本渲染，应在此处调用 Tiptap 渲染器处理 payload
    return props.message.content;
});
</script>

<template>
    <div :class="['chat group transition-all duration-300', isMe ? 'chat-end' : 'chat-start']">
        <div class="chat-image avatar">
            <div class="w-10 rounded-full bg-base-300 ring-1 ring-base-content/5">
                <BaseAvatar :text="message.sender?.name" :placeholder-length="2" :src="message.sender?.avatar"
                    :height="40" :width="40" :radius="9999" />
            </div>
        </div>

        <div class="chat-header opacity-50 text-[11px] mb-1 flex items-center gap-2 px-1">
            <span v-if="!isMe" class="font-bold">{{ message.sender?.name }}</span>
            <time class="tabular-nums">{{ formatTimeAgo(message.createdAt) }}</time>
        </div>

        <div :class="[
            'chat-bubble min-h-0 text-[14px] leading-relaxed shadow-sm relative group/bubble',
            isMe ? 'chat-bubble-primary' : 'chat-bubble-neutral bg-base-200 text-base-content border-none',
            message.status === MessageApi.MessageStatus.REVOKED ? 'italic opacity-50' : ''
        ]">
            <div class="whitespace-pre-wrap break-words max-w-[70vw] sm:max-w-md">{{ displayContent }}</div>

            <div v-if="message.status !== MessageApi.MessageStatus.REVOKED" :class="[
                'absolute top-0 opacity-0 group-hover/bubble:opacity-100 transition-all flex gap-1 p-1 bg-base-100 shadow-xl rounded-lg border border-base-content/5 z-10',
                isMe ? 'right-full mr-2' : 'left-full ml-2'
            ]">
                <button v-if="isMe" @click="emit('revoke', message.id)"
                    class="btn btn-xs btn-circle btn-ghost text-error">
                    <Icon name="mingcute:refresh-3-line" size="14" />
                </button>
            </div>
        </div>

        <div class="chat-footer opacity-40 text-[10px] mt-1 flex items-center gap-1.5 px-1">
            <Icon v-if="isMe" :name="message.status === 'READ' ? 'mingcute:check-all-fill' : 'mingcute:check-line'"
                :class="message.status === 'READ' ? 'text-primary' : ''" size="12" />
        </div>
    </div>
</template>