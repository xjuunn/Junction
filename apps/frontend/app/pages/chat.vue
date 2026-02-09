<script lang="ts" setup>
import { useRoute, useRouter } from 'vue-router';
import { breakpointsTailwind, useBreakpoints } from '@vueuse/core';

definePageMeta({ layout: 'main' });
const route = useRoute();
const router = useRouter();
const breakpoints = useBreakpoints(breakpointsTailwind);
const isMobile = breakpoints.smaller('lg');
const isDetailOpen = computed(() => !!route.params.id);

const handleBack = () => {
    if (isMobile.value) {
        // 移动端返回到列表页面
        router.push('/chat');
    } else {
        // 桌面端使用浏览器返回
        router.back();
    }
};
</script>

<template>
    <LayoutListDetail :show-detail="isDetailOpen" sidebar-width="340px" @back="handleBack">
        <template #mobile-header>
            <!-- <AppChatListHeader /> -->
            <div></div>
        </template>
        <template #list>
            <AppChatList />
        </template>
        <template #detail>
            <NuxtPage />
        </template>
        <template #empty>
            <div class="flex flex-col items-center justify-center h-full text-base-content/30 select-none">
                <div class="w-20 h-20 bg-base-200 rounded-[24px] flex items-center justify-center mb-4">
                    <Icon name="mingcute:chat-4-fill" size="40" class="opacity-50" />
                </div>
                <p class="text-sm font-medium">选择一个会话开始聊天</p>
            </div>
        </template>

    </LayoutListDetail>
</template>