<script setup lang="ts">
import { breakpointsTailwind, useBreakpoints } from '@vueuse/core';
const breakpoints = useBreakpoints(breakpointsTailwind);
const isMobile = breakpoints.smaller('sm');
</script>

<template>
    <div class="flex h-screen w-full bg-base-100 text-base-content overflow-hidden font-sans flex-col sm:flex-row">
        <div v-if="!isMobile" class="h-full flex-none z-30 border-r border-base-200">
            <AppSidebar />
        </div>

        <div class="flex-1 h-full min-w-0 flex flex-col relative overflow-hidden">
            <AppWindowController />
            <div class="flex-1 overflow-y-auto overflow-x-hidden scroll-smooth relative"
                :class="[isMobile ? 'pb-[calc(4rem+env(safe-area-inset-bottom))]' : '']">
                <slot />
            </div>

            <AppBottomNav v-if="isMobile" class="z-40" />
        </div>
    </div>
</template>