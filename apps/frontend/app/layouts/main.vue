<template>
    <div class="flex h-screen w-full bg-base-100 text-base-content overflow-hidden font-sans">
        <div class="h-full flex-none">
            <AppSidebar />
        </div>
        <div class="flex-1 h-full min-w-0">
            <slot />
        </div>

    </div>
</template>