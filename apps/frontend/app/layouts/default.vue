<template>
    <div class="flex h-screen w-full bg-base-100 text-base-content overflow-hidden font-sans flex-col sm:flex-row">
        <div class="flex-1 h-full min-w-0 flex flex-col relative overflow-hidden">
            <AppWindowController />
            <div class="flex-1 overflow-y-auto overflow-x-hidden scroll-smooth relative">
                <slot />
            </div>
        </div>
    </div>
</template>