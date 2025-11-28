<template>
    <client-only>
        <div v-motion-slide-top v-if="md" class="border-b border-base-content/10 navbar min-h-[2.8rem] px-3 select-none"
            data-tauri-drag-region>
            <div class="navbar-start" data-tauri-drag-region>
                <span class="font-modernia text-base-content mr-2" data-tauri-drag-region>Junc</span>
                <nuxt-link to="/search?ui=content" class="btn btn-ghost btn-sm">
                    搜索
                    <icon name="mingcute:search-2-fill" size="1rem" class="text-base-content/70"></icon>
                </nuxt-link>
                <nuxt-link to="/action/notification" class="btn btn-ghost btn-sm">
                    通知
                    <icon name="mingcute:notification-fill" size="1rem" class="text-base-content/70"></icon>
                </nuxt-link>
            </div>
            <div class="navbar-end" data-tauri-drag-region>
                <main-common-window-control-buttons></main-common-window-control-buttons>
            </div>
        </div>
    </client-only>
</template>

<script setup lang="ts">
const { md } = useTailwindBreakpoints();
</script>
