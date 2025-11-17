<template>
    <client-only>
        <div v-motion-slide-top class="navbar min-h-[2.8rem] px-3 select-none" :class="{
            'pt-6': hasMobileTaskBar
        }" v-if="!md" data-tauri-drag-region>
            <div class="navbar-start">
                {{ hasMobileTaskBar }}
                <slot name="start"></slot>
            </div>
            <div class="navbar-end">
                <slot name="end"></slot>
            </div>
        </div>
    </client-only>
</template>

<script setup lang="ts">
const { md } = useTailwindBreakpoints();
const { isAndroid } = useDevice();

// 判断是否有顶部状态栏，如果有，需要留出一定空间
const hasMobileTaskBar = computed(() => isTauri() && isAndroid)
</script>