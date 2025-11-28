<template>
    <div>
        <main-mobile-nav :is-show-back="true" class="shadow-sm z-50">
            <template #start>
                <span class="font-bold text-lg">通知</span>
            </template>
        </main-mobile-nav>
        <div class="flex-1 flex flex-col items-center justify-center px-4">
            <icon name="mingcute:notification-fill" size="4rem" class="text-base-content/30 mb-4"></icon>
            <div class="text-center text-base-content/60">
                你还没有通知哦~
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">

</script>