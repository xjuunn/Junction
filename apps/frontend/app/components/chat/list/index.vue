<template>
    <div class="overflow-auto h-full">
        <chat-list-item @click="emit('onItemClick', item)" v-for="item in 10"></chat-list-item>
    </div>
</template>
<script lang="ts" setup>
const emit = defineEmits<{
    (e: 'onItemClick', item: any): void
}>()
</script>