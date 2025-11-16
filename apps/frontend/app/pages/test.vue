<template>
    <div class="grid grid-cols-4 gap-4 p-4">
        <button class="btn btn-primary" @click="sendTest">发送测试消息</button>
        <div class="col-span-4 mt-4">
            <h3 class="font-bold mb-2">消息列表：</h3>
            <ul class="list-disc pl-6">
                <li v-for="(msg, index) in messages" :key="index">{{ msg }}</li>
            </ul>
        </div>
    </div>
</template>

<script setup lang="ts">
const socket = useSocket('app');
definePageMeta({ layout: 'main-window' });
const messages = ref<string[]>([]);
function sendTest() {
    const message = "向服务器发送消息";
    socket.emit('app-test', message, (msg) => {
        messages.value.push("服务器:" + msg);
    });
    messages.value.push("客户端:" + message);
}

</script>