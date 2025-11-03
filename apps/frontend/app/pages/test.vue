<template>
    <div class="grid grid-cols-4">
        <button class="btn btn-primary" @click="login">
            <span>登录</span>
        </button>
        <button class="btn btn-primary" @click="toggleTheme">切换主题</button>
        <button class="btn btn-primary" @click="setPasskey">设置passkey</button>
    </div>
</template>

<script setup lang="ts">
definePageMeta({
    layout: 'main-window'
})

async function login() {
    navigateTo('/auth/sign-in')
}

const theme = AppTheme.getInstance()
async function toggleTheme(event: MouseEvent) {
    const pos = { x: event.clientX, y: event.clientY }
    theme.toggleTheme(pos);
}
async function setPasskey() {
    
}
</script>
