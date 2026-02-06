<script setup lang="ts">
import { computed } from 'vue';
import { useRoute } from 'vue-router';

interface ConversationItem {
    id: string;
    type: 'PRIVATE' | 'GROUP' | 'SYSTEM';
    title: string;
    avatar?: string;
    online?: number;
    otherUserAccountType?: string | null;
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

const isActive = computed(() => route.params.id === props.data.id);

const displayTime = computed(() => {
    if (!props.data.lastMessage) return '';
    const date = new Date(props.data.lastMessage.createdAt);
    const now = new Date();
    return date.toDateString() === now.toDateString()
        ? date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })
        : date.toLocaleDateString([], { month: '2-digit', day: '2-digit' });
});

const previewText = computed(() => {
    if (!props.data.lastMessage) return '暂无新消息';
    const prefix = props.data.type === 'GROUP' ? `${props.data.lastMessage.sender?.name}: ` : '';
    return `${prefix}${props.data.lastMessage.content}`;
});
</script>

<template>
    <div class="relative mx-2 my-0.5 group flex items-center gap-3 px-3 py-2.5 cursor-pointer transition-all duration-300 rounded-xl select-none min-w-0 overflow-hidden"
        :class="isActive
            ? 'bg-primary text-primary-content shadow-lg shadow-primary/20 scale-[1.01] z-10'
            : 'hover:bg-base-200 active:scale-[0.98]'" @click="navigateTo('/chat/' + data.id)">
        <div v-if="data.mySettings?.pinned" class="absolute top-2 right-2 w-1.5 h-1.5 rounded-full"
            :class="isActive ? 'bg-primary-content/60' : 'bg-primary/60'">
        </div>

        <div class="relative shrink-0">
            <BaseAvatar :text="data.title" :height="46" :width="46" :radius="12" :src="data.avatar" :alt="data.title"
                :placeholder-length="2"
                :class="isActive ? 'ring-2 ring-primary-content/20' : 'ring-1 ring-base-content/5'" />

            <div v-if="data.type === 'PRIVATE' && data.online === 1"
                class="absolute bottom-0 right-0 w-3.5 h-3.5 rounded-full border-[2.5px] bg-success"
                :class="isActive ? 'border-primary' : 'border-base-100'">
            </div>

            <div v-if="data.type === 'GROUP'"
                class="absolute -bottom-1 -right-1 badge badge-xs font-bold py-1.5 shadow-sm scale-90"
                :class="isActive ? 'bg-primary-content text-primary border-none' : 'bg-neutral text-neutral-content border-none'">
                <span v-if="data.online" class="scale-90 opacity-80 mr-0.5 text-[8px]">{{ data.online }}</span>
                <Icon name="mingcute:group-fill" size="9" />
            </div>
        </div>

        <div class="flex-1 min-w-0 flex flex-col gap-0">
            <div class="flex items-center justify-between gap-2">
                <div class="flex items-center gap-1 min-w-0">
                    <h3 class="font-bold text-[14px] truncate tracking-tight flex items-center gap-2">
                        <span>{{ data.title }}</span>
                        <span v-if="data.type === 'PRIVATE' && data.otherUserAccountType === 'BOT'"
                            class="badge badge-outline badge-xs">机器人</span>
                    </h3>
                    <Icon v-if="data.mySettings?.muted" name="mingcute:notification-off-line" size="12"
                        class="opacity-40 shrink-0" />
                </div>
                <time class="text-[10px] font-bold tabular-nums tracking-wider opacity-50 shrink-0">
                    {{ displayTime }}
                </time>
            </div>

            <div class="flex items-center justify-between gap-2">
                <p class="text-[13px] truncate opacity-60 leading-tight font-medium flex-1">
                    {{ previewText }}
                </p>
                <div v-if="data.unreadCount"
                    class="badge badge-sm h-4.5 min-w-[18px] font-black p-1 border-none text-[10px] shrink-0"
                    :class="isActive ? 'bg-primary-content text-primary' : 'bg-primary text-primary-content'">
                    {{ data.unreadCount > 99 ? '99+' : data.unreadCount }}
                </div>
            </div>
        </div>
    </div>
</template>
