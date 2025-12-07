<script setup lang="ts">
import { computed } from 'vue';

interface Props {
    showDetail?: boolean;
    listWidth?: string;
    breakpoint?: 'md' | 'lg' | 'xl';
}

const props = withDefaults(defineProps<Props>(), {
    showDetail: false,
    listWidth: '340px',
    breakpoint: 'lg'
});

const emit = defineEmits<{
    (e: 'back'): void;
}>();

// 左侧列表容器样式
const listClasses = computed(() => {
    const base = 'flex-none h-full border-r border-base-content/5 bg-base-200 overflow-hidden transition-all duration-300 ease-in-out';
    const mobileLogic = props.showDetail ? 'hidden' : 'w-full block';
    const desktopLogic = `${props.breakpoint}:block ${props.breakpoint}:w-[var(--list-w)]`;

    return `${base} ${mobileLogic} ${desktopLogic}`;
});

// 右侧详情容器样式
const detailClasses = computed(() => {
    const base = 'flex-1 h-full min-w-0 bg-base-100 overflow-hidden relative';
    const mobileLogic = props.showDetail ? 'block' : 'hidden';
    const desktopLogic = `${props.breakpoint}:block`;

    return `${base} ${mobileLogic} ${desktopLogic}`;
});
</script>

<template>
    <div class="flex h-full w-full overflow-hidden relative">

        <!-- 1. 左侧列表 -->
        <aside :class="listClasses" :style="`--list-w: ${listWidth}`">
            <slot name="list"></slot>
        </aside>

        <!-- 2. 右侧区域 -->
        <main :class="detailClasses">
            <div v-if="showDetail" class="h-full flex flex-col">
                <!-- 移动端头部插槽 -->
                <slot name="mobile-header">
                    <div class="lg:hidden flex items-center h-14 px-4 border-b border-base-content/5 shrink-0">
                        <button @click="$emit('back')" class="btn btn-sm btn-circle btn-ghost -ml-2">
                            <Icon name="mingcute:left-line" size="20" />
                        </button>
                        <span class="ml-2 font-bold text-lg">详情</span>
                    </div>
                </slot>

                <!-- 详情内容插槽 -->
                <div class="flex-1 overflow-hidden relative">
                    <slot name="detail"></slot>
                </div>
            </div>

            <div v-else
                class="hidden lg:flex h-full w-full items-center justify-center text-base-content/30 select-none animate-fade-in">
                <slot name="empty">
                    <div class="flex flex-col items-center gap-3">
                        <div class="w-16 h-16 bg-base-200 rounded-2xl flex items-center justify-center">
                            <Icon name="mingcute:layout-left-line" size="32" class="opacity-50" />
                        </div>
                        <p class="text-sm font-medium">请选择左侧列表查看详情</p>
                    </div>
                </slot>
            </div>
        </main>
    </div>
</template>
