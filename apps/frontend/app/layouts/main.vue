<script setup lang="ts">
import { useRoute } from 'vue-router';
import { breakpointsTailwind, useBreakpoints } from '@vueuse/core';
import { menuService } from '~/core/menu';

const breakpoints = useBreakpoints(breakpointsTailwind);
const isMobile = breakpoints.smaller('sm');
const route = useRoute();
const { isAdmin } = useAdminAccess();
const appTheme = AppTheme.getInstance();
const isMicaActive = computed(() => isTauri() && appTheme.getIsBgTransparent().value);
const shouldShowBottomNav = computed(() => {
    const isMobileView = breakpoints.smaller('sm').value;
    const isDetailRoute = route.name?.toString().endsWith('-id');
    return isMobileView && !isDetailRoute;
});
const shouldShowMobileQuickActions = computed(() => shouldShowBottomNav.value);

const findMenuItem = (id: string) => {
    return menuService.getMenus().find(item => String(item.id) === id && item.getShouldShow());
};

const handleQuickActionClick = (id: string, event?: MouseEvent) => {
    const item = findMenuItem(id);
    if (!item) return;
    item.click(event);
};

const handleQuickSearch = () => {
    navigateTo('/search');
};

const handleThemeToggle = async (event: MouseEvent) => {
    const item = findMenuItem('theme');
    if (item) {
        item.click(event);
        return;
    }
    await appTheme.toggleTheme({
        x: event.clientX,
        y: event.clientY,
    });
};
</script>

<template>
    <div class="flex h-screen w-full overflow-hidden font-sans text-base-content flex-col sm:flex-row"
        :class="isMicaActive ? 'bg-transparent' : 'bg-base-100'">
        <aside v-if="!isMobile"
            class="z-30 h-full flex-none border-r border-base-content/5 backdrop-blur-md transition-all duration-300"
            :class="isMicaActive ? 'bg-transparent' : 'bg-base-200/50'">
            <AppSidebar />
        </aside>
        <main class="relative flex h-full min-w-0 flex-1 flex-col overflow-hidden"
            :class="isMicaActive ? 'bg-transparent' : 'bg-base-100'">
            <header class="z-20 flex-none" :class="isMicaActive ? 'bg-transparent' : 'bg-base-100'">
                <AppWindowController />
            </header>
            <article id="main-scroll-container" class="relative flex flex-1 overflow-x-hidden scroll-smooth"
                :class="[shouldShowBottomNav ? 'pb-[calc(4rem+env(safe-area-inset-bottom))]' : 'pb-safe']">
                <div class="mx-auto w-full flex-1">
                    <slot />
                </div>
            </article>

            <transition name="slide-up">
                <AppBottomNav v-if="shouldShowBottomNav"
                    class="fixed bottom-0 left-0 right-0 z-40 border-t border-base-200 backdrop-blur-lg"
                    :class="isMicaActive ? 'bg-transparent' : 'bg-base-100/80'" />
            </transition>

            <transition name="mobile-fab-fade">
                <div v-if="shouldShowMobileQuickActions" class="mobile-fab fixed right-5 z-50 sm:hidden">
                    <div class="fab fab-flower" :style="{ bottom: 'calc(4rem + env(safe-area-inset-bottom) + 1rem)' }">
                        <div tabindex="0" role="button"
                            class="btn btn-circle btn-lg border border-base-content/10 bg-base-100 text-base-content shadow-[0_12px_28px_rgba(0,0,0,0.18)]">
                            <Icon name="mingcute:add-line" size="24" class="fab-trigger-icon" />
                        </div>

                        <button
                            class="fab-main-action btn btn-circle btn-lg btn-primary shadow-[0_10px_24px_rgba(0,0,0,0.22)]"
                            aria-label="search" @click="handleQuickSearch">
                            <Icon name="mingcute:search-line" size="22" />
                        </button>

                        <div class="tooltip tooltip-left" data-tip="通知">
                            <button
                                class="btn btn-circle btn-lg border border-base-content/10 bg-base-100 text-base-content/70 shadow-md hover:text-primary"
                                aria-label="notification"
                                @click="(event) => handleQuickActionClick('notification', event)">
                                <Icon name="mingcute:notification-line" size="20" />
                            </button>
                        </div>

                        <div class="tooltip tooltip-left" data-tip="设置">
                            <button
                                class="btn btn-circle btn-lg border border-base-content/10 bg-base-100 text-base-content/70 shadow-md hover:text-primary"
                                aria-label="settings" @click="(event) => handleQuickActionClick('settings', event)">
                                <Icon name="mingcute:settings-3-line" size="20" />
                            </button>
                        </div>

                        <div class="tooltip tooltip-left" data-tip="主题">
                            <button
                                class="btn btn-circle btn-lg border border-base-content/10 bg-base-100 text-base-content/70 shadow-md hover:text-primary"
                                aria-label="theme-toggle" @click="handleThemeToggle">
                                <Icon name="mingcute:sun-line" size="20" />
                            </button>
                        </div>

                        <div v-if="isAdmin" class="tooltip tooltip-left" data-tip="管理">
                            <button
                                class="btn btn-circle btn-lg border border-base-content/10 bg-base-100 text-base-content/70 shadow-md hover:text-primary"
                                aria-label="admin" @click="(event) => handleQuickActionClick('admin', event)">
                                <Icon name="mingcute:shield-line" size="20" />
                            </button>
                        </div>
                    </div>
                </div>
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

.mobile-fab-fade-enter-active,
.mobile-fab-fade-leave-active {
    transition:
        opacity 0.24s ease,
        transform 0.34s cubic-bezier(0.22, 1, 0.36, 1);
    will-change: transform, opacity;
}

.mobile-fab-fade-enter-from,
.mobile-fab-fade-leave-to {
    opacity: 0;
    transform: translate3d(0, 22px, 0);
}

.mobile-fab-fade-enter-to,
.mobile-fab-fade-leave-from {
    opacity: 1;
    transform: translate3d(0, 0, 0);
}

:deep(.mobile-fab .fab > *:not(:first-child)) {
    opacity: 0;
    translate: 0 14px;
    scale: 0.9;
    pointer-events: none;
    transition:
        opacity 0.2s ease,
        translate 0.28s cubic-bezier(0.22, 1, 0.36, 1),
        scale 0.28s cubic-bezier(0.22, 1, 0.36, 1);
}

:deep(.mobile-fab .fab:focus-within > *:not(:first-child)),
:deep(.mobile-fab .fab:hover > *:not(:first-child)) {
    opacity: 1;
    translate: 0 0;
    scale: 1;
    pointer-events: auto;
}

:deep(.mobile-fab .fab > :nth-child(2)) {
    transition-delay: 0.03s;
}

:deep(.mobile-fab .fab > :nth-child(3)) {
    transition-delay: 0.06s;
}

:deep(.mobile-fab .fab > :nth-child(4)) {
    transition-delay: 0.09s;
}

:deep(.mobile-fab .fab > :nth-child(5)) {
    transition-delay: 0.12s;
}

:deep(.mobile-fab .fab > :nth-child(6)) {
    transition-delay: 0.15s;
}

:deep(.mobile-fab .fab .fab-trigger-icon) {
    transition: transform 0.28s cubic-bezier(0.22, 1, 0.36, 1);
}

:deep(.mobile-fab .fab:focus-within .fab-trigger-icon),
:deep(.mobile-fab .fab:hover .fab-trigger-icon) {
    transform: rotate(45deg);
}
</style>
