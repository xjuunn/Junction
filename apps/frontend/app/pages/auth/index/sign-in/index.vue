<template>
    <div>
        <div class="text-3xl w-full inline-flex items-center gap-2">
            <span class="font-bold font-siyuan">登录</span>
            <span class="font-modernia text-base-content/20 translate-y-1.5">SIGNIN</span>
        </div>
        <div class="divider"></div>

        <form ref="form">
            <div class="flex flex-col gap-2">
                <label class="input bg-transparent focus-within:outline-0">
                    <icon name="mingcute:mail-fill" />
                    <input v-model="email" type="email" placeholder="请输入邮箱" required />
                </label>

                <label class="input bg-transparent focus-within:outline-0">
                    <icon name="mingcute:lock-fill" />
                    <input v-model="password" type="password" placeholder="请输入密码" minlength="6" required />
                </label>

                <div class="inline-flex items-center gap-2 justify-between">
                    <label class="my-1 inline-flex items-center">
                        <input v-model="rememberMe" type="checkbox" class="checkbox checkbox-sm" />
                        <span class="text-sm text-base-content/90 ml-1">记住我</span>
                    </label>
                    <div class="text-base-content/80 text-sm inline-flex gap-2">
                        <span class="hover:link cursor-pointer" @click="handleForgotPassword">忘记密码</span>
                    </div>
                </div>

                <div class="inline-flex items-center gap-2 justify-end text-sm text-error">
                    <span v-if="errorMsg">{{ errorMsg }}</span>
                </div>
            </div>

            <div class="mt-2">
                <button type="submit" class="btn btn-primary btn-block" @click.prevent="handleSubmit"
                    :disabled="loading">
                    <span v-if="loading" class="loading loading-spinner loading-sm"></span>
                    <span v-else>登录</span>
                </button>
            </div>
        </form>

        <div class="divider my-7">OR</div>

        <div class="grid grid-cols-3 text-base-content/80">
            <nuxt-link to="/auth/sign-in/passkey" class="btn btn-sm btn-ghost">
                <icon name="mingcute:fingerprint-fill" size="1.2rem" />
                通行密钥
            </nuxt-link>
            <nuxt-link to="/auth/sign-in/device-authorization" class="btn btn-sm btn-ghost">
                <icon name="mingcute:device-fill" size="1.2rem" />
                设备授权
            </nuxt-link>
            <nuxt-link to="/auth/sign-in/email-verification" class="btn btn-sm btn-ghost">
                <icon name="mingcute:mail-send-fill" size="1.2rem" />
                邮箱验证
            </nuxt-link>
        </div>

        <div class="text-end mt-4">
            <nuxt-link to="/auth/sign-up" :replace="true" class="text-sm hover:link text-base-content/60">
                没有账号？ 前往注册
            </nuxt-link>
        </div>
    </div>
</template>

<script lang="ts" setup>
import { useRouter } from 'vue-router'

const router = useRouter()
const form = useTemplateRef('form')
const email = ref('')
const password = ref('')
const rememberMe = ref(false)
const loading = ref(false)
const errorMsg = ref('')

async function handleSubmit() {
    const valid = form.value?.reportValidity()
    if (!valid) return
    await signIn()
}

async function signIn() {
    loading.value = true
    errorMsg.value = ''
    try {
        const client = useAuthClient()
        const result = await client.signIn.email({
            email: email.value,
            password: password.value,
        })
        if (result.error) {
            switch (result.error.code) {
                case "INVALID_CREDENTIALS":
                    errorMsg.value = "邮箱或密码错误"
                    break
                case "EMAIL_NOT_VERIFIED":
                    errorMsg.value = "邮箱尚未验证，请前往验证"
                    break
                case "USER_NOT_FOUND":
                    errorMsg.value = "用户不存在，请先注册"
                    break
                case "INVALID_EMAIL_OR_PASSWORD":
                    errorMsg.value = "无效的用户名或密码"
                    break
                default:
                    errorMsg.value = result.error.message ?? "登录失败，请稍后重试"
                    console.error(result.error)
            }
            return
        }

        if (rememberMe.value) localStorage.setItem('remember_email', email.value)
        else localStorage.removeItem('remember_email')

        router.replace('/')
    } catch (err: any) {
        errorMsg.value = err?.message || '登录失败，请稍后再试'
    } finally {
        loading.value = false
    }
}

function handleForgotPassword() {
    router.push('/auth/forgot-password')
}
</script>
