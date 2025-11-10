<template>
    <client-only>
        <div class="navbar min-h-[2.8rem] px-3 select-none" v-if="!md" data-tauri-drag-region>
            <div class="navbar-start">
                <slot name="start"></slot>
            </div>
            <div class="navbar-end">
                <slot name="end"></slot>
            </div>
        </div>
    </client-only>
</template>

<script setup lang="ts">
const { md } = useTailwindBreakpoints();
</script>