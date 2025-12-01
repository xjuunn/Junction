<template>
    <div class="w-full max-w-sm mx-auto">
        <div class="flex items-center gap-2 mb-2">
            <div class="text-3xl inline-flex items-center gap-2">
                <span class="font-bold font-siyuan">Passkey验证</span>
                <span class="font-modernia text-base-content/20 translate-y-1.5">VERIFY</span>
            </div>
        </div>

        <div class="divider"></div>

        <div class="flex flex-col gap-6">
            <div ref="contentContainer" class="flex flex-col items-center gap-4">
                <div class="relative w-24 h-24">
                    <div ref="iconContainer" class="absolute inset-0 flex items-center justify-center">
                        <icon name="mingcute:key-2-fill" class="text-primary" size="4rem" />
                    </div>
                    <svg v-if="loading" ref="loadingCircle" class="absolute inset-0 w-24 h-24 text-primary/30"
                        fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                        <circle cx="12" cy="12" r="10" stroke-dasharray="62.83" stroke-dashoffset="0" />
                    </svg>
                </div>

                <div ref="statusText" class="text-center">
                    <p class="text-lg font-semibold">{{ statusMessage }}</p>
                    <p class="text-sm text-base-content/70 mt-1">{{ statusDescription }}</p>
                </div>
            </div>

            <Transition name="fade">
                <div v-if="errorMsg" ref="errorContainer" class="alert alert-error shadow-lg">
                    <icon name="mingcute:close-fill" size="1.2rem">
                    </icon>
                    <span>{{ errorMsg }}</span>
                </div>
            </Transition>

            <div ref="buttonContainer" class="flex flex-col gap-3">
                <button type="button" class="btn btn-primary btn-block" :disabled="loading"
                    @click="handlePasskeyVerify">
                    <span v-if="loading" class="loading loading-spinner loading-sm"></span>
                    <span v-else class="flex items-center gap-2">
                        <icon name="mingcute:key-2-fill" size="1rem" />
                        验证Passkey
                    </span>
                </button>

                <button type="button" class="btn btn-ghost btn-block" :disabled="loading" @click="handleCancel">
                    取消
                </button>
            </div>

            <div class="bg-base-200/50 rounded-lg p-4 text-sm text-base-content/70">
                <p class="flex items-start gap-2">
                    <icon name="mingcute:look-up-fill" size="1.4rem"></icon>
                    <span>请在弹出的生物识别认证中完成验证</span>
                </p>
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { animate, set as animeSet } from 'animejs'

const router = useRouter()
const loading = ref(false)
const errorMsg = ref('')
const statusMessage = ref('准备验证')
const statusDescription = ref('点击下方按钮开始Passkey验证')

const contentContainer = ref<HTMLElement | null>(null)
const iconContainer = ref<HTMLElement | null>(null)
const loadingCircle = ref<SVGElement | null>(null)
const statusText = ref<HTMLElement | null>(null)
const errorContainer = ref<HTMLElement | null>(null)
const buttonContainer = ref<HTMLElement | null>(null)

let animations: ReturnType<typeof animate>[] = []

onMounted(() => initAnimations())
onUnmounted(() => cleanupAnimations())

function cleanupAnimations() {
    animations.forEach(a => a.cancel())
    animations = []
}

function initAnimations() {
    if (!contentContainer.value || !buttonContainer.value || !iconContainer.value) return

    animeSet(contentContainer.value, { opacity: 0, y: 20 })
    animate(contentContainer.value, { opacity: [0, 1], y: [20, 0], duration: 600, ease: 'outQuad' })

    animeSet(buttonContainer.value, { opacity: 0, y: 10 })
    animate(buttonContainer.value, { opacity: [0, 1], y: [10, 0], duration: 600, delay: 200, ease: 'outQuad' })

    const pulse = animate(iconContainer.value, { scale: [1, 1.1, 1], duration: 2000, loop: true, ease: 'inOutQuad' })
    animations.push(pulse)
}

function startLoadingAnimation() {
    if (!loadingCircle.value || !iconContainer.value || !statusText.value) return
    cleanupAnimations()

    const rotateAnim = animate(loadingCircle.value, { rotate: 360, duration: 1500, loop: true, ease: 'linear' })
    animations.push(rotateAnim)

    animate(iconContainer.value, { scale: 0.8, duration: 300, ease: 'outQuad' })
    animate(statusText.value, { opacity: 0.6, duration: 300, ease: 'outQuad' })
}

function stopLoadingAnimation() {
    cleanupAnimations()
    if (iconContainer.value && statusText.value) {
        animate(iconContainer.value, { scale: 1, duration: 300, ease: 'outQuad' })
        animate(statusText.value, { opacity: 1, duration: 300, ease: 'outQuad' })
    }
}

function showError(message: string) {
    errorMsg.value = message
    statusMessage.value = '验证失败'
    statusDescription.value = '请检查您的Passkey设置'

    if (errorContainer.value) {
        animeSet(errorContainer.value, { opacity: 0, y: -10 })
        animate(errorContainer.value, { opacity: [0, 1], y: [-10, 0], duration: 400, ease: 'outQuad' })
    }

    if (contentContainer.value) {
        animate(contentContainer.value, { x: [-8, 8, -8, 8, 0], duration: 400, ease: 'inOutQuad' })
    }
}

async function handlePasskeyVerify() {
    if (loading.value) return
    loading.value = true
    errorMsg.value = ''
    statusMessage.value = '正在验证...'
    statusDescription.value = '请完成您的生物识别认证'
    startLoadingAnimation()
    const result = await useAuthClient().signIn.passkey({
        fetchOptions: {
            onResponse(context) {
                const t = context.response.headers.get("set-auth-token") ?? "";
                useUserStore().setAuthToken(t)
            },
        }
    });
    stopLoadingAnimation()
    if (result.error) {
        stopLoadingAnimation()
        showError('Passkey验证失败，请重试')
    } else {
        animate(iconContainer.value!, { scale: [1, 1.2, 1], duration: 400, ease: 'outQuad' })
        statusMessage.value = '验证成功！'
        statusDescription.value = '正在跳转...'
        await new Promise(resolve => setTimeout(resolve, 1000))
        router.replace('/')
    }
    loading.value = false
}

function handleCancel() {
    errorMsg.value = ""
    if (!contentContainer.value || !buttonContainer.value) return
    animate(contentContainer.value, { opacity: [1, 0], y: [0, 20], duration: 300, ease: 'inQuad' })
    animate(buttonContainer.value, { opacity: [1, 0], y: [0, 10], duration: 300, ease: 'inQuad' })
    setTimeout(() => router.back(), 300)
}
</script>

<style scoped>
::-webkit-scrollbar {
    width: 6px;
}

::-webkit-scrollbar-thumb {
    background: hsl(var(--p) / 0.3);
    border-radius: 3px;
}

::-webkit-scrollbar-thumb:hover {
    background: hsl(var(--p) / 0.5);
}

button {
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

button:disabled {
    opacity: 0.5;
}

.fade-enter-active,
.fade-leave-active {
    transition: opacity 0.3s ease;
}

.fade-enter-from,
.fade-leave-to {
    opacity: 0;
}
</style>
