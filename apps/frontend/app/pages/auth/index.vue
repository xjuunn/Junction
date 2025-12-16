<template>
    <div class="flex h-full">
        <div class="w-5/12 flex flex-1 md:flex-none items-center justify-center overflow-hidden relative">
            <transition name="page">
                <div class="mb-10 min-w-80 absolute" :key="$route.path">
                    <nuxt-page></nuxt-page>
                </div>
            </transition>
        </div>
        <div class="p-3 flex-1 hidden md:block">
            <div class="h-full w-full rounded-md overflow-hidden relative bg-base-content/5">

            </div>
        </div>
    </div>
</template>

<style scoped>
.page-enter-active,
.page-leave-active {
    transition: all 0.5s ease-in-out;
}

.page-enter-from {
    transform: translateY(-100%);
    opacity: 0;
}

.page-enter-to {
    transform: translateY(0);
    opacity: 1;
}

.page-leave-from {
    transform: translateY(0);
    opacity: 1;
}

.page-leave-to {
    transform: translateY(100%);
    opacity: 0;
}
</style>