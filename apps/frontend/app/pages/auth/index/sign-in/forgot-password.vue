<template>
    <div class="w-full max-w-sm mx-auto">
        <div class="flex items-center gap-2 mb-2">
            <div class="text-3xl inline-flex items-center gap-2">
                <span class="font-bold font-siyuan">重置密码</span>
                <span class="font-modernia text-base-content/20 translate-y-1.5">RESET</span>
            </div>
        </div>
        <div class="divider"></div>

        <form class="flex flex-col gap-4" @submit.prevent="handleSubmit">
            <transition name="fade" mode="out-in">
                <!-- 步骤 1: 输入邮箱 -->
                <div v-if="step === 'email'" key="email" class="flex flex-col gap-4">
                    <p class="text-sm text-base-content/70">请输入您的邮箱以接收重置码</p>

                    <label class="input validator flex items-center gap-2 bg-transparent focus-within:outline-0">
                        <svg class="w-5 h-5 opacity-60" fill="currentColor" viewBox="0 0 24 24">
                            <path
                                d="M20 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z" />
                        </svg>
                        <input v-model="email" type="email" placeholder="请输入邮箱" required
                            class="grow bg-transparent outline-none" />
                    </label>

                    <transition name="fade">
                        <div v-if="errorMsg" class="text-sm text-error text-end">{{ errorMsg }}</div>
                    </transition>

                    <button type="submit" class="btn btn-primary btn-block" :disabled="loading">
                        <span v-if="loading" class="loading loading-spinner loading-sm"></span>
                        <span v-else>发送重置码</span>
                    </button>

                    <button type="button" class="btn btn-ghost btn-block" @click="router.back()">
                        返回
                    </button>
                </div>

                <!-- 步骤 2: 输入OTP -->
                <div v-else-if="step === 'otp'" key="otp" class="flex flex-col gap-4">
                    <p class="text-sm text-base-content/70">
                        重置码已发送至 {{ email }}，请在下方输入重置码
                    </p>

                    <label class="bg-transparent flex justify-center gap-2 py-2">
                        <div class="flex gap-2" @paste.prevent="onPaste">
                            <input v-for="(digit, i) in 6" :key="i" ref="inputs" type="text" inputmode="numeric"
                                maxlength="1" autocomplete="off" autocorrect="off" autocapitalize="off"
                                spellcheck="false"
                                class="w-10 h-12 text-center border border-base-content/20 rounded-lg focus:outline-none focus:border-primary bg-transparent text-lg transition-all duration-200 focus:scale-105"
                                :value="otpDigits[i]" @input="onInput(i, $event)" @keydown.backspace="onBackspace(i)" />
                        </div>
                    </label>

                    <transition name="fade">
                        <div v-if="errorMsg" class="text-sm text-error text-end">{{ errorMsg }}</div>
                    </transition>

                    <button type="submit" class="btn btn-primary btn-block" :disabled="loading || otp.length !== 6">
                        <span v-if="loading" class="loading loading-spinner loading-sm"></span>
                        <span v-else>验证重置码</span>
                    </button>

                    <button type="button" class="btn btn-ghost btn-block" :disabled="countdown > 0" @click="resendOtp">
                        <span v-if="countdown > 0">重新发送 ({{ countdown }})</span>
                        <span v-else>重新发送重置码</span>
                    </button>

                    <button type="button" class="btn btn-ghost text-xs text-base-content/50" @click="resetToEmailStep">
                        返回修改邮箱
                    </button>
                </div>

                <!-- 步骤 3: 设置新密码 -->
                <div v-else-if="step === 'password'" key="password" class="flex flex-col gap-4">
                    <p class="text-sm text-base-content/70">请设置您的新密码</p>

                    <label class="input validator flex items-center gap-2 bg-transparent focus-within:outline-0">
                        <svg class="w-5 h-5 opacity-60" fill="currentColor" viewBox="0 0 24 24">
                            <path
                                d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4zm0 2.02c2.05.02 3.97.74 5.48 2.05.81.9 1.48 1.97 1.84 3.18H5.68c.36-1.21 1.03-2.28 1.84-3.18C8.03 3.76 9.95 3.04 12 3.02zM5 7h14v4c0 4.42-2.86 8.22-6.8 9.49-2.63-.83-4.9-2.44-6.44-4.64-.61-.94-.98-2.04-1.08-3.2V11h-.68v-4z" />
                        </svg>
                        <input v-model="newPassword" type="password" placeholder="输入新密码 (至少6位)" minlength="6" required
                            class="grow bg-transparent outline-none" />
                    </label>

                    <label class="input validator flex items-center gap-2 bg-transparent focus-within:outline-0">
                        <svg class="w-5 h-5 opacity-60" fill="currentColor" viewBox="0 0 24 24">
                            <path
                                d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4zm0 2.02c2.05.02 3.97.74 5.48 2.05.81.9 1.48 1.97 1.84 3.18H5.68c.36-1.21 1.03-2.28 1.84-3.18C8.03 3.76 9.95 3.04 12 3.02zM5 7h14v4c0 4.42-2.86 8.22-6.8 9.49-2.63-.83-4.9-2.44-6.44-4.64-.61-.94-.98-2.04-1.08-3.2V11h-.68v-4z" />
                        </svg>
                        <input v-model="confirmPassword" type="password" placeholder="确认新密码" minlength="6" required
                            class="grow bg-transparent outline-none" />
                    </label>

                    <transition name="fade">
                        <div v-if="errorMsg" class="text-sm text-error text-end">{{ errorMsg }}</div>
                    </transition>

                    <div v-if="passwordHint" class="text-xs text-base-content/60 bg-base-200/50 rounded p-2">
                        {{ passwordHint }}
                    </div>

                    <button type="submit" class="btn btn-primary btn-block" :disabled="loading">
                        <span v-if="loading" class="loading loading-spinner loading-sm"></span>
                        <span v-else>重置密码</span>
                    </button>

                    <button type="button" class="btn btn-ghost btn-block" @click="router.back()">
                        返回登录
                    </button>
                </div>
            </transition>
        </form>
    </div>
</template>

<script setup lang="ts">
import { ref, computed, nextTick, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'

const router = useRouter()
const step = ref<'email' | 'otp' | 'password'>('email')
const email = ref('')
const otpDigits = ref<string[]>(Array(6).fill(''))
const newPassword = ref('')
const confirmPassword = ref('')
const loading = ref(false)
const errorMsg = ref('')
const countdown = ref(0)
const passwordHint = ref('')
const inputs = ref<HTMLInputElement[]>([])
let timer: NodeJS.Timeout | null = null

const otp = computed(() => otpDigits.value.join(''))

async function handleSubmit() {
    errorMsg.value = ''
    passwordHint.value = ''

    if (step.value === 'email') {
        await sendResetOtp()
    } else if (step.value === 'otp') {
        await verifyResetOtp()
    } else if (step.value === 'password') {
        await resetPassword()
    }
}

async function sendResetOtp() {
    if (!email.value.match(/^[\w-.]+@([\w-]+\.)+[\w-]{2,4}$/)) {
        errorMsg.value = '请输入有效的邮箱地址'
        return
    }

    loading.value = true
    try {
        const client = useAuthClient()
        const result = await client.forgetPassword.emailOtp({
            email: email.value,
        })

        if (result.error) {
            errorMsg.value = result.error.message ?? '发送失败，请稍后重试'
            return
        }

        step.value = 'otp'
        startCountdown()
        await nextTick(() => inputs.value[0]?.focus())
    } catch (err: any) {
        errorMsg.value = err?.message || '发送失败，请稍后再试'
    } finally {
        loading.value = false
    }
}

async function verifyResetOtp() {
    if (otp.value.length !== 6) {
        errorMsg.value = '请输入完整的6位重置码'
        return
    }

    loading.value = true
    try {
        const client = useAuthClient()
        const result = await client.emailOtp.checkVerificationOtp({
            email: email.value,
            otp: otp.value,
            type: 'forget-password'
        })

        if (result.error) {
            switch (result.error.code) {
                case 'INVALID_OTP':
                    errorMsg.value = '重置码错误，请重试'
                    break
                case 'OTP_EXPIRED':
                    errorMsg.value = '重置码已过期，请重新发送'
                    resetToEmailStep()
                    break
                case 'TOO_MANY_ATTEMPTS':
                    errorMsg.value = '尝试次数过多，请重新发送'
                    resetToEmailStep()
                    break
                default:
                    errorMsg.value = result.error.message ?? '验证失败'
            }
            return
        }

        step.value = 'password'
    } catch (err: any) {
        errorMsg.value = err?.message || '验证失败，请稍后重试'
    } finally {
        loading.value = false
    }
}

async function resetPassword() {
    if (!newPassword.value || newPassword.value.length < 6) {
        errorMsg.value = '密码长度至少6位'
        return
    }

    if (newPassword.value !== confirmPassword.value) {
        errorMsg.value = '两次输入的密码不一致'
        passwordHint.value = '请确保两个密码相同'
        return
    }

    loading.value = true
    try {
        const client = useAuthClient()
        const result = await client.emailOtp.resetPassword({
            email: email.value,
            otp: otp.value,
            password: newPassword.value
        })

        if (result.error) {
            switch (result.error.code) {
                case 'INVALID_PASSWORD':
                    errorMsg.value = '密码不符合要求'
                    break
                case 'SAME_PASSWORD':
                    errorMsg.value = '新密码不能与旧密码相同'
                    break
                case 'INVALID_OTP':
                    errorMsg.value = '重置码无效，请重新申请'
                    resetToEmailStep()
                    break
                default:
                    errorMsg.value = result.error.message ?? '重置失败'
            }
            return
        }

        await router.replace('/auth/sign-in')
    } catch (err: any) {
        errorMsg.value = err?.message || '重置失败，请稍后重试'
    } finally {
        loading.value = false
    }
}

async function resendOtp() {
    if (countdown.value > 0) return

    loading.value = true
    errorMsg.value = ''
    try {
        const client = useAuthClient()
        const result = await client.forgetPassword.emailOtp({
            email: email.value,
        })

        if (result.error) {
            errorMsg.value = result.error.message ?? '发送失败，请稍后重试'
            return
        }

        startCountdown()
    } catch (err: any) {
        errorMsg.value = err?.message || '发送失败，请稍后再试'
    } finally {
        loading.value = false
    }
}

function onInput(index: number, e: Event) {
    const input = e.target as HTMLInputElement
    const value = input.value.replace(/[^0-9]/g, '')
    otpDigits.value[index] = value
    if (value && index < 5) inputs.value[index + 1]?.focus()
}

function onBackspace(index: number) {
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

function startCountdown() {
    countdown.value = 60
    if (timer) clearInterval(timer)
    timer = setInterval(() => {
        countdown.value--
        if (countdown.value <= 0 && timer) {
            clearInterval(timer)
            timer = null
        }
    }, 1000)
}

function resetToEmailStep() {
    step.value = 'email'
    otpDigits.value = Array(6).fill('')
    if (timer) clearInterval(timer)
    timer = null
    countdown.value = 0
    errorMsg.value = ''
}

onUnmounted(() => {
    if (timer) clearInterval(timer)
})
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

.fade-enter-active,
.fade-leave-active {
    transition: opacity 0.2s ease, transform 0.2s ease;
}

.fade-enter-from,
.fade-leave-to {
    opacity: 0;
    transform: translateY(4px);
}
</style>