<script setup lang="ts">
const appTheme = AppTheme.getInstance()
const isMicaActive = computed(() => isTauri() && appTheme.getIsBgTransparent().value)
</script>

<template>
    <div class="flex h-screen w-full text-base-content overflow-hidden font-sans flex-col sm:flex-row"
        :class="isMicaActive ? 'bg-transparent' : 'bg-base-100'">
        <div class="flex-1 h-full min-w-0 flex flex-col relative overflow-hidden"
            :class="isMicaActive ? 'bg-transparent' : 'bg-base-100'">
            <AppWindowController />
            <div class="flex-1 overflow-y-auto overflow-x-hidden scroll-smooth relative">
                <slot />
            </div>
        </div>
    </div>
</template>
