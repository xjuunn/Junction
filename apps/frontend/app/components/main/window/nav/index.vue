<template>
    <client-only>
        <div v-motion-slide-top v-if="md" class="border-b border-base-content/10 navbar min-h-[2.8rem] px-3 select-none"
            data-tauri-drag-region>
            <div class="navbar-start" data-tauri-drag-region>
                <span class="font-modernia text-base-content" data-tauri-drag-region>Junc</span>
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
