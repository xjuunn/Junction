<script setup lang="ts">
import { computed } from 'vue';
import { useRoute } from 'vue-router';

interface ConversationItem {
    id: string;
    type: 'PRIVATE' | 'GROUP' | 'SYSTEM';
    title: string;
    avatar?: string;
    online?: number;
    lastMessage?: {
        content: string;
        type: string;
        createdAt: string;
        sender?: { name: string };
    };
    memberCount: number;
    mySettings?: { pinned: boolean; muted: boolean; };
    unreadCount?: number;
}

const props = defineProps<{ data: ConversationItem }>();
const route = useRoute();

/**
 * 计算当前项激活状态
 */
const isActive = computed(() => route.params.id === props.data.id);

/**
 * 格式化精简显示时间
 */
const displayTime = computed(() => {
    if (!props.data.lastMessage) return '';
    const date = new Date(props.data.lastMessage.createdAt);
    const now = new Date();
    return date.toDateString() === now.toDateString()
        ? date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })
        : date.toLocaleDateString([], { month: '2-digit', day: '2-digit' });
});

/**
 * 处理消息摘要逻辑
 */
const previewText = computed(() => {
    if (!props.data.lastMessage) return '暂无新消息';
    const prefix = props.data.type === 'GROUP' ? `${props.data.lastMessage.sender?.name}: ` : '';
    return `${prefix}${props.data.lastMessage.content}`;
});
</script>

<template>
    <div class="relative mx-3 my-1 group flex items-center gap-4 px-4 py-3.5 cursor-pointer transition-all duration-300 rounded-2xl select-none"
        :class="isActive
            ? 'bg-primary text-primary-content shadow-xl shadow-primary/20 scale-[1.02] z-10'
            : 'hover:bg-base-200 active:scale-95'" @click="navigateTo('/chat/' + data.id, { replace: true })">

        <!-- 置顶语义化标识 -->
        <div v-if="data.mySettings?.pinned" class="absolute top-3 right-3 w-1.5 h-1.5 rounded-full"
            :class="isActive ? 'bg-primary-content/60' : 'bg-primary/60'">
        </div>

        <!-- 头像增强区域 -->
        <div class="relative shrink-0">
            <BaseAvatar :text="data.title" :height="52" :width="52" :radius="14" :src="data.avatar" :alt="data.title"
                :placeholder-length="2"
                :class="isActive ? 'ring-2 ring-primary-content/20' : 'ring-1 ring-base-content/5'" />

            <!-- 动态在线指示器 -->
            <div v-if="data.type === 'PRIVATE' && data.online === 1"
                class="absolute bottom-0 right-0 w-4 h-4 rounded-full border-[3px] bg-success transition-transform"
                :class="isActive ? 'border-primary scale-110' : 'border-base-100'">
            </div>

            <!-- 群组人数徽章 -->
            <div v-if="data.type === 'GROUP'"
                class="absolute -bottom-1 -right-1 badge badge-xs font-bold py-2 shadow-sm"
                :class="isActive ? 'bg-primary-content text-primary border-none' : 'bg-neutral text-neutral-content border-none'">
                <span v-if="data.online" class="scale-90 opacity-80 mr-0.5">{{ data.online }}</span>
                <Icon name="mingcute:group-fill" size="10" />
            </div>
        </div>

        <!-- 文本信息流 -->
        <div class="flex-1 min-w-0 flex flex-col gap-0.5">
            <div class="flex items-center justify-between">
                <div class="flex items-center gap-1.5 min-w-0">
                    <h3 class="font-bold text-base truncate tracking-tight uppercase">
                        {{ data.title }}
                    </h3>
                    <Icon v-if="data.mySettings?.muted" name="mingcute:notification-off-line" size="14"
                        class="opacity-40" />
                </div>
                <time class="text-[10px] font-bold tabular-nums tracking-wider opacity-60">
                    {{ displayTime }}
                </time>
            </div>

            <div class="flex items-center justify-between gap-3">
                <p class="text-sm truncate opacity-70 leading-relaxed font-medium">
                    {{ previewText }}
                </p>
                <!-- 交互式未读提醒 -->
                <div v-if="data.unreadCount"
                    class="badge badge-sm h-5 min-w-[20px] font-black p-1 border-none animate-in zoom-in"
                    :class="isActive ? 'bg-primary-content text-primary' : 'bg-primary text-primary-content'">
                    {{ data.unreadCount > 99 ? '99+' : data.unreadCount }}
                </div>
            </div>
        </div>
    </div>
</template>