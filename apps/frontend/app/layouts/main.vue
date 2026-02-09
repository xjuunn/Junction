<script setup lang="ts">
import { useRoute } from 'vue-router';
import { breakpointsTailwind, useBreakpoints } from '@vueuse/core';

const breakpoints = useBreakpoints(breakpointsTailwind);
const isMobile = breakpoints.smaller('sm');
const route = useRoute();
const appTheme = AppTheme.getInstance();
const isMicaActive = computed(() => isTauri() && appTheme.getIsBgTransparent().value);
const shouldShowBottomNav = computed(() => {
    const isMobileView = breakpoints.smaller('sm').value;
    const isDetailRoute = route.name?.toString().endsWith('-id');
    return isMobileView && !isDetailRoute;
});
</script>

<template>
    <div class="flex h-screen w-full text-base-content overflow-hidden font-sans flex-col sm:flex-row"
        :class="isMicaActive ? 'bg-transparent' : 'bg-base-100'">
        <aside v-if="!isMobile"
            class="h-full flex-none z-30 border-base-200 backdrop-blur-md transition-all duration-300"
            :class="isMicaActive ? 'bg-transparent' : 'bg-base-200/50'">
            <AppSidebar />
        </aside>
        <main class="flex-1 h-full min-w-0 flex flex-col relative overflow-hidden"
            :class="isMicaActive ? 'bg-transparent' : 'bg-base-100'">
            <header class="flex-none z-20" :class="isMicaActive ? 'bg-transparent' : 'bg-base-100'">
                <AppWindowController />
            </header>
            <article id="main-scroll-container" class="flex-1 overflow-x-hidden scroll-smooth relative flex"
                :class="[
                    shouldShowBottomNav ? 'pb-[calc(4rem+env(safe-area-inset-bottom))]' : 'pb-safe'
                ]">
                <div class="mx-auto flex-1 w-full">
                    <slot />
                </div>
            </article>
            <transition name="slide-up">
                <AppBottomNav v-if="shouldShowBottomNav"
                    class="fixed bottom-0 left-0 right-0 z-40 border-t border-base-200 backdrop-blur-lg"
                    :class="isMicaActive ? 'bg-transparent' : 'bg-base-100/80'" />
            </transition>
            <AppCallOverlay />
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
