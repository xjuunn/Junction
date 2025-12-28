<script setup lang="ts">
import * as MessageApi from '~/api/message';

/**
 * 聊天气泡组件，封装 daisyUI chat 结构
 * @param message 消息数据对象
 * @param isMe 是否为当前用户发送
 */
const props = defineProps<{
    message: any;
    isMe: boolean;
}>();

const emit = defineEmits(['revoke']);

/**
 * 格式化并获取消息展示文本内容
 */
const contentText = computed(() => {
    if (props.message.status === MessageApi.MessageStatus.REVOKED) {
        return props.isMe ? '你撤回了一条消息' : '对方撤回了一条消息';
    }
    return props.message.content;
});
</script>

<template>
    <div :class="['chat group', isMe ? 'chat-end' : 'chat-start']">
        <div class="chat-image avatar">
            <div class="w-10 rounded-full bg-base-300 ring-1 ring-base-content/10">
                <img :src="resolveAssetUrl(message.sender?.image)" :alt="message.sender?.name || 'User'" />
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
            <div class="whitespace-pre-wrap break-words max-w-[70vw] sm:max-w-md">{{ contentText }}</div>

            <!-- 操作按钮（悬浮显示） -->
            <div v-if="message.status !== MessageApi.MessageStatus.REVOKED" :class="[
                'absolute top-0 opacity-0 group-hover/bubble:opacity-100 transition-all flex gap-1 p-1 bg-base-100 shadow-xl rounded-xl border border-base-content/5 z-10',
                isMe ? 'right-full mr-2' : 'left-full ml-2'
            ]">
                <button v-if="isMe" @click="emit('revoke', message.id)"
                    class="btn btn-xs btn-circle btn-ghost text-error" title="撤回">
                    <Icon name="mingcute:refresh-3-line" size="14" />
                </button>
                <button class="btn btn-xs btn-circle btn-ghost text-base-content/40" title="回复">
                    <Icon name="mingcute:back-line" size="14" />
                </button>
            </div>
        </div>

        <div class="chat-footer opacity-40 text-[10px] mt-1 flex items-center gap-1.5 px-1">
            <Icon v-if="isMe" :name="message.status === 'READ' ? 'mingcute:check-all-fill' : 'mingcute:check-line'"
                :class="message.status === 'READ' ? 'text-primary' : ''" size="12" />
            <span v-if="message.isEdited">已编辑</span>
        </div>
    </div>
</template>