<script setup lang="ts">
/**
 * 消息列表滚动容器，处理触顶加载与自动滚动
 * @param loading 加载状态
 * @param hasMore 是否有更多历史记录
 */
const props = defineProps<{
    loading?: boolean;
    hasMore?: boolean;
}>();

const emit = defineEmits(['loadMore']);
const scrollRef = ref<HTMLElement | null>(null);

/**
 * 滚动到消息列表底部
 */
const scrollToBottom = async () => {
    await nextTick();
    if (scrollRef.value) {
        scrollRef.value.scrollTop = scrollRef.value.scrollHeight;
    }
};

/**
 * 处理滚动事件，实现触顶分页加载
 * @param e 滚动事件对象
 */
const handleScroll = (e: Event) => {
    const target = e.target as HTMLElement;
    if (target.scrollTop === 0 && props.hasMore && !props.loading) {
        emit('loadMore');
    }
};

defineExpose({ scrollToBottom });
</script>

<template>
    <div ref="scrollRef" @scroll="handleScroll"
        class="flex-1 overflow-y-auto px-4 py-6 space-y-6 scroll-smooth bg-base-100">
        <div v-if="hasMore" class="flex justify-center py-2">
            <button v-if="!loading" @click="emit('loadMore')" class="btn btn-xs btn-ghost btn-soft opacity-50">
                加载更多历史记录
            </button>
            <span v-else class="loading loading-dots loading-sm text-primary/40"></span>
        </div>

        <slot></slot>
    </div>
</template>