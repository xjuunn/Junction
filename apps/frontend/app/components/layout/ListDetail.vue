<script setup lang="ts">
interface Props {
    /** 
     * 当前是否处于详情模式（仅在移动端生效）
     * true = 显示右侧详情, false = 显示左侧列表
     */
    showDetail?: boolean;

    /** 
     * 侧边栏在桌面端的宽度 
     * @default '340px'
     */
    listWidth?: string;

    /** 
     * 触发分栏的断点，低于此断点将变为单栏模式
     * @default 'lg' (1024px)
     */
    breakpoint?: 'md' | 'lg' | 'xl';
}

const props = withDefaults(defineProps<Props>(), {
    showDetail: false,
    listWidth: '340px',
    breakpoint: 'lg'
});

const emit = defineEmits<{
    (e: 'back'): void; // 移动端点击返回时触发
}>();

// 侧边栏容器样式
const listClasses = computed(() => {
    const base = 'flex-none h-full border-r border-base-content/5 overflow-hidden transition-all';
    const mobileLogic = props.showDetail ? 'hidden' : 'block';
    const desktopLogic = `${props.breakpoint}:block`;

    return `${base} ${mobileLogic} ${desktopLogic}`;
});

// 详情容器样式
const detailClasses = computed(() => {
    const base = 'flex-1 h-full min-w-0 overflow-hidden relative';
    const mobileLogic = props.showDetail ? 'block' : 'hidden';
    const desktopLogic = `${props.breakpoint}:block`;
    return `${base} ${mobileLogic} ${desktopLogic}`;
});
</script>

<template>
    <div class="flex h-full w-full overflow-hidden relative">

        <!-- 左侧：列表/Master -->
        <!-- 在小屏下宽度为 100%，大屏下为固定宽度 -->
        <aside :class="listClasses" :style="`--list-w: ${listWidth}`" class="w-full lg:w-[var(--list-w)]">
            <slot name="list"></slot>
        </aside>
        <!-- 右侧：详情/Detail -->
        <main :class="detailClasses">
            <slot name="mobile-header" v-if="showDetail">
                <!-- TODO 默认返回按钮 -->
            </slot>

            <slot name="detail"></slot>

            <!-- 如果没有选中内容且在大屏下，显示 Empty State -->
            <div v-if="!showDetail"
                class="hidden lg:flex h-full w-full items-center justify-center text-base-content/30">
                <slot name="empty">
                    <div class="flex flex-col items-center gap-3">
                        <Icon name="mingcute:layout-left-line" size="48" />
                        <p class="text-sm font-medium">请选择左侧列表查看详情</p>
                    </div>
                </slot>
            </div>
        </main>

    </div>
</template>