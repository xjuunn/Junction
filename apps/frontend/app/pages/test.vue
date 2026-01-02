<template>
    <div>
        <button class="btn btn-primary" @click="test">test</button>
    </div>
</template>

<script setup lang="ts">

const appSocket = useSocket('app');
onMounted(() => {
    appSocket.on('conversation-status', (data) => {
        console.log("在线状态改变：", data);
    })
})

function test() {


}
</script>