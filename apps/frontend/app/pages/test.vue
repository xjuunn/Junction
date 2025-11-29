<template>
    <div class="grid grid-cols-4 gap-4 p-4">
        <button class="btn btn-primary" @click="test">test</button>
    </div>
</template>

<script setup lang="ts">

definePageMeta({ layout: 'main-window' });

function test() {
    useSocket('notification').emit('test', (data) => {
        console.log(data);
    })
}

</script>