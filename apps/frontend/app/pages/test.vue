<template>
    <div class="grid grid-cols-4 gap-4 p-4">
        <button class="btn btn-primary" @click="test">test</button>
    </div>
</template>

<script setup lang="ts">
import { useDialog } from '../composables/useDialog';

definePageMeta({ layout: 'main-window' });

function test() {
    useDialog().confirm({
        title: "确认框",
        content: "确认框内容",
        cancelText: "取消",
        confirmText: "确认",
        type: "info"
    })
}

</script>