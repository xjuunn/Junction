<template>
    <div class="w-full max-w-sm mx-auto">
        <div class="flex items-center gap-2 mb-2">
            <div class="text-3xl inline-flex items-center gap-2">
                <span class="font-bold font-siyuan">邮箱验证</span>
                <span class="font-modernia text-base-content/20 translate-y-1.5">VERIFY</span>
            </div>
        </div>

        <div class="divider"></div>

        <form ref="form" class="flex flex-col gap-3" @submit.prevent="handleVerify">
            <p class="text-sm text-base-content/70">验证码已发送至 {{ email }}，请在下方输入验证码</p>

            <label class="bg-transparent focus-within:outline-0 flex justify-center gap-2 py-3">
                <div class="flex gap-2" @paste.prevent="onPaste">
                    <input v-for="(digit, i) in 6" :key="i" ref="inputs" type="text" inputmode="numeric" maxlength="1"
                        :name="`otp_${i}_${Math.random().toString(36).substring(2, 8)}`" :id="`otp_${i}_${Date.now()}`"
                        autocomplete="new-password" autocorrect="off" autocapitalize="off" spellcheck="false"
                        class="w-10 h-12 text-center border border-base-content/20 rounded-lg focus:outline-none focus:border-primary bg-transparent text-lg"
                        v-model="otpDigits[i]" @input="onInput(i, $event)"
                        @keydown.backspace="onBackspace(i, $event)" />
                </div>
            </label>

            <div class="text-sm text-error text-end" v-if="errorMsg">{{ errorMsg }}</div>

            <button type="submit" class="btn btn-primary btn-block" :disabled="loading">
                <span v-if="loading" class="loading loading-spinner loading-sm"></span>
                <span v-else>验证邮箱</span>
            </button>

            <button type="button" class="btn btn-ghost btn-block" :disabled="countdown > 0" @click="resendOtp">
                <span v-if="countdown > 0">重新发送 ({{ countdown }})</span>
                <span v-else>重新发送验证码</span>
            </button>

            <button type="button" class="btn btn-ghost btn-block" @click="router.back()">
                返回
            </button>
        </form>
    </div>
</template>

<script lang="ts" setup>
import { ref, computed, nextTick, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'

const route = useRoute()
const router = useRouter()
const email = computed(() => (route.query.email as string) || '')
const otpDigits = ref<string[]>(Array(6).fill(''))
const loading = ref(false)
const errorMsg = ref('')
const countdown = ref(0)
let timer: any
const inputs = ref<HTMLInputElement[]>([])

onMounted(() => {
    startCountdown()
    nextTick(() => inputs.value[0]?.focus())
})

function onInput(index: number, e: Event) {
    const input = e.target as HTMLInputElement
    const value = input.value.replace(/[^0-9]/g, '')
    otpDigits.value[index] = value
    if (value && index < 5) inputs.value[index + 1]?.focus()
}

function onBackspace(index: number, e: KeyboardEvent) {
    if (!otpDigits.value[index] && index > 0) inputs.value[index - 1]?.focus()
}

function onPaste(e: ClipboardEvent) {
    const pasted = e.clipboardData?.getData('text') || ''
    const digits = pasted.replace(/[^0-9]/g, '').slice(0, 6).split('')
    digits.forEach((d, i) => {
        otpDigits.value[i] = d
    })
    nextTick(() => {
        const nextIndex = Math.min(digits.length, 5)
        inputs.value[nextIndex]?.focus()
    })
}

const otp = computed(() => otpDigits.value.join(''))

async function handleVerify() {
    if (otp.value.length !== 6) return
    loading.value = true
    errorMsg.value = ''
    try {
        const client = useAuthClient()
        const result = await client.emailOtp.verifyEmail({ email: email.value, otp: otp.value })
        if (result.error) {
            switch (result.error.code) {
                case "INVALID_OTP": errorMsg.value = "无效验证码，请重试"; break;
                default: errorMsg.value = result.error.message ?? "未知错误";
                    console.log(result.error);
            }
            return;
        }
        router.replace('/auth/sign-in')
    } catch (err: any) {
        errorMsg.value = err?.message || '验证码错误，请重试'
    } finally {
        loading.value = false
    }
}

async function resendOtp() {
    if (countdown.value > 0) return
    try {
        const client = useAuthClient()
        await client.emailOtp.sendVerificationOtp({ email: email.value, type: 'email-verification' })
        startCountdown()
    } catch (err: any) {
        errorMsg.value = err?.message || '发送失败，请稍后再试'
    }
}

function startCountdown() {
    countdown.value = 60
    clearInterval(timer)
    timer = setInterval(() => {
        countdown.value--
        if (countdown.value <= 0) clearInterval(timer)
    }, 1000)
}
</script>

<style scoped>
input::-webkit-outer-spin-button,
input::-webkit-inner-spin-button {
    -webkit-appearance: none;
    margin: 0;
}

input[type="number"] {
    -moz-appearance: textfield;
}
</style>
