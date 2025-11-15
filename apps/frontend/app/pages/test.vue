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
import { ref, onMounted } from 'vue';
import { io, Socket } from 'socket.io-client';
import { useRuntimeConfig } from '#app';

definePageMeta({
    layout: 'main-window',
});

const messages = ref<string[]>([]);
let socket: Socket;

// 使用 runtimeConfig 获取后端地址
const config = useRuntimeConfig();
const backendUrl = `${config.public.httpType}://${config.public.serverHost}:${config.public.backendPort}/app`; // 对应 Gateway namespace

onMounted(() => {
    // 初始化 Socket.IO 连接
    socket = io(backendUrl, { transports: ['websocket'] });

    // 监听服务器广播消息
    socket.on('app-test', (data: string) => {
        console.log('收到服务器消息:', data);
        messages.value.push(data);
    });
});

function sendTest() {
    if (!socket) return;

    const msg = 'Hello from Nuxt 3';

    // 发送消息，并使用 ack 回调接收服务器返回
    socket.emit('app-test', msg, (ack: string) => {
        console.log('服务器 ack 返回:', ack);
        messages.value.push(`ACK: ${ack}`);
    });
}
</script>

<style scoped>
/* 可选样式 */
</style>
