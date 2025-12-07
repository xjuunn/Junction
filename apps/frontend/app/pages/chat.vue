<template>
    <div class="flex h-full w-full">

        <!-- 中间：消息列表-->
        <div class="flex-none w-80 h-full border-r border-base-content/5 bg-base-200">
            <AppChatList />
        </div>

        <!-- 右侧：详情区域 -->
        <main class="flex-1 h-full bg-base-100 relative min-w-0">
            <NuxtPage />
        </main>

    </div>
</template>

<script lang="ts" setup>
definePageMeta({ layout: 'main' })
</script>