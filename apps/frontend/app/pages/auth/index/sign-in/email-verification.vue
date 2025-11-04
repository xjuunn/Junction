<template>
    <div class="w-full max-w-sm mx-auto animate-fade-in">
        <div class="flex items-center gap-2 mb-2">
            <div class="text-3xl inline-flex items-center gap-2">
                <span class="font-bold font-siyuan">邮箱登录</span>
                <span class="font-modernia text-base-content/20 translate-y-1.5">EMAIL</span>
            </div>
        </div>
        <div class="divider"></div>
        <form ref="form" class="flex flex-col gap-4" @submit.prevent="step === 'email' ? sendOtp() : handleVerify()">
            <transition name="fade" mode="out-in">
                <div v-if="step === 'email'" key="email" class="flex flex-col gap-4">
                    <p class="text-sm text-base-content/70">请输入您的邮箱以接收验证码</p>

                    <label class="input validator flex items-center gap-2 bg-transparent focus-within:outline-0">
                        <icon name="mingcute:mail-fill" class="w-5 h-5 opacity-60" />
                        <input v-model="email" type="email" placeholder="请输入邮箱" required
                            class="grow bg-transparent outline-none" />
                    </label>

                    <transition name="fade">
                        <div v-if="errorMsg" class="text-sm text-error text-end">{{ errorMsg }}</div>
                    </transition>

                    <button type="submit" class="btn btn-primary btn-block" :disabled="loading">
                        <span v-if="loading" class="loading loading-spinner loading-sm"></span>
                        <span v-else>发送验证码</span>
                    </button>
                </div>

                <div v-else key="otp" class="flex flex-col gap-4">
                    <p class="text-sm text-base-content/70">
                        验证码已发送至 {{ email }}，请在下方输入验证码
                    </p>

                    <label class="bg-transparent flex justify-center gap-2 py-2">
                        <div class="flex gap-2" @paste.prevent="onPaste">
                            <input v-for="(digit, i) in 6" :key="i" ref="inputs" type="text" inputmode="numeric"
                                maxlength="1" autocomplete="off" autocorrect="off" autocapitalize="off"
                                spellcheck="false"
                                class="w-10 h-12 text-center border border-base-content/20 rounded-lg focus:outline-none focus:border-primary bg-transparent text-lg transition-all duration-200 focus:scale-105"
                                v-model="otpDigits[i]" @input="onInput(i, $event)"
                                @keydown.backspace="onBackspace(i)" />
                        </div>
                    </label>

                    <transition name="fade">
                        <div v-if="errorMsg" class="text-sm text-error text-end">{{ errorMsg }}</div>
                    </transition>

                    <button type="submit" class="btn btn-primary btn-block" :disabled="loading">
                        <span v-if="loading" class="loading loading-spinner loading-sm"></span>
                        <span v-else>登录</span>
                    </button>

                    <button type="button" class="btn btn-ghost btn-block" :disabled="countdown > 0" @click="resendOtp">
                        <span v-if="countdown > 0">重新发送 ({{ countdown }})</span>
                        <span v-else>重新发送验证码</span>
                    </button>

                    <button type="button" class="btn btn-ghost text-xs text-base-content/50"
                        @click="resetToEmailStep">
                        返回修改邮箱
                    </button>
                </div>
            </transition>
        </form>
    </div>
</template>

<script lang="ts" setup>
const router = useRouter()
const email = ref('')
const otpDigits = ref<string[]>(Array(6).fill(''))
const loading = ref(false)
const errorMsg = ref('')
const countdown = ref(0)
const step = ref<'email' | 'otp'>('email')
let timer: any
const inputs = ref<HTMLInputElement[]>([])
const otp = computed(() => otpDigits.value.join(''))

// 发送验证码
async function sendOtp() {
    if (!email.value.match(/^[\w-.]+@([\w-]+\.)+[\w-]{2,4}$/)) {
        errorMsg.value = '请输入有效的邮箱地址'
        return
    }
    loading.value = true
    errorMsg.value = ''
    try {
        const client = useAuthClient()
        const result = await client.emailOtp.sendVerificationOtp({
            email: email.value,
            type: 'sign-in'
        })

        if (result.error) {
            errorMsg.value = result.error.message ?? '验证码发送失败'
            return
        }

        step.value = 'otp'
        startCountdown()
        nextTick(() => inputs.value[0]?.focus())
    } catch (err: any) {
        errorMsg.value = err?.message || '发送失败，请稍后再试'
    } finally {
        loading.value = false
    }
}

// 输入验证码登录
async function handleVerify() {
    if (otp.value.length !== 6) {
        errorMsg.value = '请输入完整的6位验证码'
        return
    }

    loading.value = true
    errorMsg.value = ''
    try {
        const client = useAuthClient()
        const result = await client.signIn.emailOtp({
            email: email.value,
            otp: otp.value
        })

        if (result.error) {
            switch (result.error.code) {
                case 'INVALID_OTP': errorMsg.value = '验证码错误，请重试'; break
                case 'USER_NOT_FOUND': errorMsg.value = '该邮箱未注册'; break
                default: errorMsg.value = result.error.message ?? '登录失败'
            }
            return
        }

        // 登录成功
        router.replace('/')
    } catch (err: any) {
        errorMsg.value = err?.message || '登录失败，请稍后重试'
    } finally {
        loading.value = false
    }
}

// 输入框逻辑
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

// 倒计时与重发
async function resendOtp() {
    if (countdown.value > 0) return
    try {
        const client = useAuthClient()
        await client.emailOtp.sendVerificationOtp({ email: email.value, type: 'sign-in' })
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

// 返回上一步
function resetToEmailStep() {
    step.value = 'email'
    otpDigits.value = Array(6).fill('')
    clearInterval(timer)
    countdown.value = 0
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

.fade-enter-active,
.fade-leave-active {
    transition: opacity 0.2s ease, transform 0.2s ease;
}

.fade-enter-from,
.fade-leave-to {
    opacity: 0;
    transform: translateY(4px);
}

.animate-fade-in {
    animation: fadeIn 0.4s ease-out;
}

@keyframes fadeIn {
    from {
        opacity: 0;
        transform: translateY(8px);
    }

    to {
        opacity: 1;
        transform: translateY(0);
    }
}
</style>
