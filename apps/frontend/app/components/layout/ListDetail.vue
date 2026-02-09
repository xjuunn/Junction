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

const bpConfig = computed(() => {
    const maps = {
        md: {
            listDesktop: 'md:block md:w-[var(--list-w)]',
            detailDesktop: 'md:block',
            navHidden: 'md:hidden',
            emptyFlex: 'md:flex'
        },
        lg: {
            listDesktop: 'lg:block lg:w-[var(--list-w)]',
            detailDesktop: 'lg:block',
            navHidden: 'lg:hidden',
            emptyFlex: 'lg:flex'
        },
        xl: {
            listDesktop: 'xl:block xl:w-[var(--list-w)]',
            detailDesktop: 'xl:block',
            navHidden: 'xl:hidden',
            emptyFlex: 'xl:flex'
        }
    };
    return maps[props.breakpoint];
});

const listClasses = computed(() => {
    const base = 'flex-none h-full border-base-content/5 overflow-hidden transition-all duration-300 ease-in-out';
    const mobile = props.showDetail ? 'hidden' : 'w-full block';
    return `${base} ${mobile} ${bpConfig.value.listDesktop}`;
});

const detailClasses = computed(() => {
    const base = 'flex-1 h-full min-w-0 bg-base-100 overflow-hidden relative';
    const mobile = props.showDetail ? 'block' : 'hidden';
    return `${base} ${mobile} ${bpConfig.value.detailDesktop}`;
});
</script>

<template>
    <div class="flex h-full w-full overflow-hidden relative">
        <aside :class="listClasses" :style="`--list-w: ${listWidth}`">
            <slot name="list"></slot>
        </aside>

        <main :class="detailClasses">
            <div v-if="showDetail" class="h-full flex flex-col w-full">
                <slot name="mobile-header">
                    <div class="flex items-center h-14 px-4 border-b border-base-content/5 shrink-0 bg-base-100 backdrop-blur z-20"
                        :class="bpConfig.navHidden">
                        <button @click="$emit('back')" class="btn btn-sm btn-circle btn-ghost -ml-2">
                            <Icon name="mingcute:left-line" size="24" />
                        </button>
                        <span class="ml-2 font-bold text-lg">详情</span>
                    </div>
                </slot>

                <div class="flex-1 overflow-hidden relative w-full">
                    <slot name="detail"></slot>
                </div>
            </div>

            <div v-else
                class="hidden h-full w-full items-center justify-center text-base-content/30 select-none animate-fade-in"
                :class="bpConfig.emptyFlex">
                <slot name="empty">
                    <div class="flex flex-col items-center gap-3">
                        <div class="w-20 h-20 bg-base-200/50 rounded-3xl flex items-center justify-center">
                            <Icon name="mingcute:layout-left-line" size="40" class="opacity-50" />
                        </div>
                        <p class="text-sm font-medium">请选择左侧列表查看详情</p>
                    </div>
                </slot>
            </div>
        </main>
    </div>
</template>

<style scoped>
.animate-fade-in {
    animation: fadeIn 0.3s ease-out;
}

@keyframes fadeIn {
    from {
        opacity: 0;
        transform: translateY(10px);
    }

    to {
        opacity: 1;
        transform: translateY(0);
    }
}
</style>