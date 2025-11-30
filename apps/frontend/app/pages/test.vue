<template>
    <div class="grid grid-cols-4 gap-4 p-4">
        <button class="btn btn-primary" @click="test">test</button>
    </div>
</template>

<script setup lang="ts">

definePageMeta({ layout: 'main-window' });

onMounted(() => {
    useSocket('app').emit('init', (data) => {
        console.log(data);
    })
    useSocket('app').on('new-notification', (data) => {
        console.log('收到新的通知:', data);
    });
});

function test() {
    useSocket('app').emit('test', undefined, (data) => {
        console.log('test 回调:', data);
    });
}

</script>