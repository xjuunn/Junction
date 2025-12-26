<script setup lang="ts">
import { computed } from 'vue';
import { useRoute } from 'vue-router';

// 对接后端 Conversation 格式
interface ConversationItem {
    id: string;
    type: 'PRIVATE' | 'GROUP' | 'SYSTEM';
    title: string;
    avatar?: string;
    lastMessage?: {
        content: string;
        type: string;
        createdAt: string;
        sender?: { name: string };
    };
    memberCount: number;
    mySettings?: {
        pinned: boolean;
        muted: boolean;
    };
    unreadCount?: number;
}

const props = defineProps<{
    data: ConversationItem
}>();

const route = useRoute();

/**
 * 判断当前项是否处于选中激活状态
 */
const isActive = computed(() => route.params.id === props.data.id);

/**
 * 格式化显示时间
 */
const displayTime = computed(() => {
    if (!props.data.lastMessage) return '';
    const date = new Date(props.data.lastMessage.createdAt);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
});

/**
 * 处理消息预览文字的展示逻辑
 */
const previewText = computed(() => {
    if (!props.data.lastMessage) return '暂无消息';
    const prefix = props.data.type === 'GROUP' ? `${props.data.lastMessage.sender?.name}: ` : '';
    return `${prefix}${props.data.lastMessage.content}`;
});
</script>

<template>
    <div class="relative group flex items-center gap-4 px-4 py-3 cursor-pointer transition-all duration-200 rounded-2xl select-none mx-2"
        :class="[
            isActive
                ? 'bg-primary text-primary-content shadow-lg shadow-primary/20'
                : 'hover:bg-base-200 active:scale-95'
        ]" @click="navigateTo('/chat/' + data.id)">
        <!-- 置顶标记 -->
        <div v-if="data.mySettings?.pinned" class="absolute top-0 right-0 w-4 h-4 overflow-hidden">
            <div class="absolute top-[-8px] right-[-8px] w-4 h-4 rotate-45"
                :class="isActive ? 'bg-primary-content/20' : 'bg-primary/20'"></div>
        </div>

        <!-- 头像 -->
        <div class="relative shrink-0">
            <div class="avatar" :class="{ 'placeholder': !data.avatar }">
                <div class="w-12 h-12 rounded-2xl transition-transform group-hover:scale-105"
                    :class="isActive ? 'bg-primary-content/20' : 'bg-neutral text-neutral-content'">
                    <img v-if="data.avatar" :src="data.avatar" :alt="data.title" />
                    <span v-else class="text-lg font-bold">{{ data.title?.charAt(0) }}</span>
                </div>
            </div>
            <!-- 在线状态或类型图标 -->
            <div v-if="data.type === 'GROUP'" class="absolute -bottom-1 -right-1 badge badge-xs p-1"
                :class="isActive ? 'badge-primary-content text-primary' : 'badge-neutral'">
                <Icon name="mingcute:group-fill" size="10" />
            </div>
        </div>

        <!-- 内容区 -->
        <div class="flex-1 min-w-0">
            <div class="flex items-center justify-between mb-0.5">
                <div class="flex items-center gap-1.5 min-w-0">
                    <h3 class="font-bold text-[15px] truncate tracking-tight">
                        {{ data.title }}
                    </h3>
                    <Icon v-if="data.mySettings?.muted" name="mingcute:notification-off-line" size="12"
                        class="opacity-50 shrink-0" />
                </div>
                <time class="text-[11px] font-medium tabular-nums opacity-60">
                    {{ displayTime }}
                </time>
            </div>

            <div class="flex items-center justify-between gap-2">
                <p class="text-[13px] truncate leading-tight opacity-70 flex-1">
                    {{ previewText }}
                </p>
                <!-- 未读数 -->
                <div v-if="data.unreadCount" class="badge badge-sm font-black border-none"
                    :class="isActive ? 'bg-primary-content text-primary' : 'badge-primary'">
                    {{ data.unreadCount }}
                </div>
            </div>
        </div>
    </div>
</template>