<template>
    <client-only>
        <div v-motion-slide-top class="navbar min-h-[2.8rem] px-3 select-none" :class="{
            'pt-10': hasMobileTaskBar
        }" v-if="!md" data-tauri-drag-region>
            <div class="navbar-start" data-tauri-drag-region>
                <button v-show="isShowBack" class="btn btn-ghost btn-md btn-square" @click="() => router.back()">
                    <icon name="mingcute:left-fill" size="1.2rem"></icon>
                </button>
                <slot name="start"></slot>
            </div>
            <div class="navbar-end" data-tauri-drag-region>
                <slot name="end"></slot>
                <main-common-window-control-buttons class="ml-2"></main-common-window-control-buttons>
            </div>
        </div>
    </client-only>
</template>

<script setup lang="ts">
const { md } = useTailwindBreakpoints();
const { isAndroid } = useDevice();
const router = useRouter();
const props = defineProps<{
    isShowBack?: boolean
}>()

// 判断是否有顶部状态栏，如果有，需要留出一定空间
const hasMobileTaskBar = computed(() => isTauri() && isAndroid)
</script>