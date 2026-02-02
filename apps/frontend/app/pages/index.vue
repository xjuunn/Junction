<template>
    <div class="h-screen w-full flex flex-col items-center justify-center overflow-hidden relative">
        <div class="relative">
            <div class="w-16 h-16 rounded-full border-4 border-primary/20"></div>
            <div class="w-16 h-16 rounded-full border-4 border-primary border-t-transparent absolute top-0 left-0 animate-spin"></div>
        </div>
        <p class="mt-4 text-base-content/60 font-medium">正在检查登录状态...</p>
    </div>
</template>

<script setup lang="ts">
definePageMeta({ layout: "main" })

const userStore = useUserStore()

/**
 * 执行首页登录状态检测
 * @description 验证用户会话状态，根据认证结果跳转到对应页面
 */
async function performAuthCheck(): Promise<void> {
    try {
        const sessionData = await userStore.refresh()

        if (sessionData?.session) {
            navigateTo("/chat", { replace: true })
        } else {
            navigateTo("/auth/sign-in", { replace: true })
        }
    } catch {
        navigateTo("/auth/sign-in", { replace: true })
    }
}

onMounted(() => {
    performAuthCheck()
})
</script>

<style scoped>
@keyframes spin {
    to {
        transform: rotate(360deg);
    }
}

.animate-spin {
    animation: spin 1s linear infinite;
}
</style>