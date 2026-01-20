<script setup lang="ts">
import { useRoute } from 'vue-router';
import { breakpointsTailwind, useBreakpoints } from '@vueuse/core';

const breakpoints = useBreakpoints(breakpointsTailwind);
const isMobile = breakpoints.smaller('sm');
const route = useRoute();
const shouldShowBottomNav = computed(() => {
    const isMobileView = breakpoints.smaller('sm').value;
    const isDetailRoute = route.name?.toString().endsWith('-id');
    return isMobileView && !isDetailRoute;
});
</script>

<template>
    <div class="flex h-screen w-full bg-base-100 text-base-content overflow-hidden font-sans flex-col sm:flex-row">
        <aside v-if="!isMobile"
            class="h-full flex-none z-30 border-r border-base-200 bg-base-200/50 backdrop-blur-md transition-all duration-300">
            <AppSidebar />
        </aside>
        <main class="flex-1 h-full min-w-0 flex flex-col relative overflow-hidden bg-base-100">
            <header class="flex-none z-20 shadow-sm">
                <AppWindowController />
            </header>
            <article id="main-scroll-container" class="flex-1 overflow-x-hidden scroll-smooth relative flex"
                :class="[
                    shouldShowBottomNav ? 'pb-[calc(4rem+env(safe-area-inset-bottom))]' : 'pb-safe'
                ]">
                <div class="max-w-screen-2xl mx-auto flex-1">
                    <slot />
                </div>
            </article>
            <transition name="slide-up">
                <AppBottomNav v-if="shouldShowBottomNav"
                    class="fixed bottom-0 left-0 right-0 z-40 border-t border-base-200 bg-base-100/80 backdrop-blur-lg" />
            </transition>
        </main>
    </div>
</template>

<style scoped>
.slide-up-enter-active,
.slide-up-leave-active {
    transition: transform 0.3s ease;
}

.slide-up-enter-from,
.slide-up-leave-to {
    transform: translateY(100%);
}

</style>