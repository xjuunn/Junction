<script setup lang="ts">
export interface ChatItemProps {
    id: number;
    name: string;
    time: string;
    preview: string;
    avatar?: string;
    avatarColor?: string;
    initials?: string;
    isPinned?: boolean;
    status?: 'online' | 'sleep' | 'love' | 'none';
    unreadCount?: number;
    isActive?: boolean;
    isMuted?: boolean;
    isVoice?: boolean;
    isPhoto?: boolean;
    isRead?: boolean;
}

defineProps<{
    data: ChatItemProps
}>();
</script>

<template>
    <div class="group relative flex items-center gap-3.5 px-3.5 py-3 rounded-[18px] cursor-pointer transition-all duration-300 ease-[cubic-bezier(0.23,1,0.32,1)] will-change-transform active:scale-[0.98]"
        :class="[
            data.isActive
                ? 'bg-base-100 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.1)] scale-[1.02] z-10 ring-1 ring-base-content/5'
                : 'hover:bg-base-100/40 hover:shadow-sm hover:ring-1 hover:ring-white/5 bg-transparent'
        ]" @click="navigateTo('/chat/' + data.id)">

        <!-- 激活态：左侧极光指示条 -->
        <div v-if="data.isActive"
            class="absolute left-0 top-1/2 -translate-y-1/2 h-8 w-[3px] bg-primary rounded-r-full shadow-[0_0_12px_rgba(var(--p)/0.8)] opacity-90">
        </div>

        <!-- 头像容器 -->
        <div class="relative shrink-0">
            <BaseAvatar :src="data.avatar" :text="data.initials" :size="48" :radius="16" :placeholder-length="2"
                class="transition-all duration-500 ease-out will-change-transform" :class="[
                    (!data.avatar && data.avatarColor) ? data.avatarColor : '',
                    data.isActive
                        ? 'ring-2 ring-primary/20 shadow-md'
                        : 'ring-1 ring-base-content/5 shadow-sm group-hover:rotate-1 group-hover:scale-105'
                ]" />

            <!-- 状态指示器 -->
            <div class="absolute -bottom-1 -right-1 z-10">
                <div
                    class="relative flex items-center justify-center w-[18px] h-[18px] bg-base-100 rounded-full ring-2 ring-base-100 transition-transform duration-300 group-hover:scale-110">

                    <!-- 在线指示器 -->
                    <span v-if="data.status === 'online'" class="relative flex h-2.5 w-2.5">
                        <span
                            class="animate-ping absolute inline-flex h-full w-full rounded-full bg-success opacity-75 duration-1000"></span>
                        <span class="relative inline-flex rounded-full h-2.5 w-2.5 bg-success shadow-sm"></span>
                    </span>

                    <!-- 勿扰 -->
                    <div v-else-if="data.status === 'sleep'"
                        class="flex items-center justify-center w-full h-full bg-base-200 rounded-full text-base-content/60">
                        <Icon name="mingcute:moon-fill" size="10" />
                    </div>

                    <!-- 喜爱 -->
                    <div v-else-if="data.status === 'love'"
                        class="flex items-center justify-center w-full h-full bg-error/10 rounded-full text-error">
                        <Icon name="mingcute:heart-fill" size="10" />
                    </div>
                </div>
            </div>
        </div>

        <!-- 文本内容 -->
        <div class="flex-1 min-w-0 flex flex-col gap-[2px]">
            <!-- 第一行：名称与时间 -->
            <div class="flex items-center justify-between">
                <div class="flex items-center gap-1.5 min-w-0">
                    <span
                        class="font-bold text-[15px] leading-tight truncate tracking-tight transition-colors duration-200"
                        :class="data.isActive ? 'text-base-content' : 'text-base-content/90 group-hover:text-base-content'">
                        {{ data.name }}
                    </span>
                    <!-- 隐式图标，悬浮显示 -->
                    <div
                        class="flex items-center gap-1 opacity-0 -translate-x-1 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-300 ease-out">
                        <Icon v-if="data.isPinned" name="mingcute:pin-fill"
                            class="text-[11px] text-primary -rotate-45" />
                        <Icon v-if="data.isMuted" name="mingcute:notification-off-fill"
                            class="text-[11px] text-base-content/40" />
                    </div>
                </div>

                <span class="text-xs font-medium tabular-nums transition-colors duration-200" :class="[
                    (data.unreadCount || 0) > 0 ? 'text-primary font-semibold' : 'text-base-content/40',
                    data.isActive ? 'opacity-100' : 'opacity-60 group-hover:opacity-100'
                ]">
                    {{ data.time }}
                </span>
            </div>

            <!-- 第二行：预览与未读数 -->
            <div class="flex items-center justify-between h-[18px]">
                <div class="flex items-center gap-1.5 min-w-0 pr-3">
                    <!-- 状态图标 -->
                    <Icon v-if="data.isRead" name="mingcute:check-2-line" class="text-primary text-[14px] shrink-0" />
                    <span v-if="data.isVoice" class="flex items-center text-base-content/70 shrink-0">
                        <Icon name="mingcute:mic-fill" size="12" />
                    </span>
                    <span v-if="data.isPhoto" class="flex items-center text-base-content/70 shrink-0">
                        <Icon name="mingcute:pic-fill" size="12" />
                    </span>

                    <!-- 预览文字 -->
                    <span class="text-[13px] truncate leading-tight transition-colors duration-200" :class="[
                        (data.unreadCount || 0) > 0 ? 'text-base-content font-medium' : 'text-base-content/50',
                        data.isActive ? 'text-base-content/80' : 'group-hover:text-base-content/70'
                    ]">
                        {{ data.preview }}
                    </span>
                </div>

                <!-- 未读徽标 (发光效果) -->
                <div v-if="(data.unreadCount || 0) > 0"
                    class="shrink-0 relative flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full bg-primary text-[10px] font-bold text-primary-content shadow-[0_2px_8px_rgba(var(--p)/0.5)] transition-transform duration-300 group-hover:scale-110">
                    {{ data.unreadCount }}
                </div>
            </div>
        </div>
    </div>
</template>