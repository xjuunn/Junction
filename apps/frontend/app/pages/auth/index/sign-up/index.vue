<template>
    <div>
        <div class="text-3xl w-full inline-flex items-center gap-2">
            <span class="font-bold font-siyuan">注册</span>
            <span class="font-modernia text-base-content/20 translate-y-1.5">SIGNUP</span>
        </div>
        <div class="divider"></div>

        <form ref="form">
            <div class="flex flex-col gap-2">
                <label class="input validator bg-transparent focus-within:outline-0">
                    <icon name="mingcute:user-3-fill" />
                    <input v-model="username" type="text" placeholder="请输入用户名" minlength="4" maxlength="20" required />
                </label>

                <label class="input validator bg-transparent focus-within:outline-0">
                    <icon name="mingcute:mail-fill" />
                    <input v-model="email" type="email" placeholder="请输入邮箱" required />
                </label>

                <label class="input validator bg-transparent focus-within:outline-0">
                    <icon name="mingcute:lock-fill" />
                    <input ref="password1Ref" v-model="password1" type="password" placeholder="请输入密码" minlength="6"
                        maxlength="40" required />
                </label>

                <label class="input validator bg-transparent focus-within:outline-0">
                    <icon name="mingcute:lock-fill" />
                    <input ref="password2Ref" v-model="password2" type="password" placeholder="请重复输入密码" minlength="6"
                        maxlength="40" required />
                </label>

                <div class="inline-flex items-center gap-2 justify-end text-sm text-error">
                    <span v-if="errorMsg">{{ errorMsg }}</span>
                </div>
            </div>

            <div class="mt-2">
                <button type="submit" class="btn btn-primary btn-block" @click.prevent="handleSubmit"
                    :disabled="loading">
                    <span v-if="loading" class="loading loading-spinner loading-sm"></span>
                    <span v-else>下一步</span>
                </button>
            </div>
        </form>

        <div class="text-end mt-4">
            <nuxt-link to="/auth/sign-in" :replace="true" class="text-sm hover:link text-base-content/60">
                已有账号？ 直接登录
            </nuxt-link>
        </div>
    </div>
</template>

<script lang="ts" setup>
import { useRouter } from 'vue-router'
const router = useRouter()
const form = useTemplateRef('form')
const password1Ref = ref<HTMLInputElement>()
const password2Ref = ref<HTMLInputElement>()

const username = ref('')
const email = ref('')
const password1 = ref('')
const password2 = ref('')
const loading = ref(false)
const errorMsg = ref('')

async function handleSubmit() {
    password2Ref.value?.setCustomValidity('')
    const valid = form.value?.reportValidity()
    if (!valid) return

    if (password1.value !== password2.value) {
        password2Ref.value?.setCustomValidity('两次输入的密码不一致')
        password2Ref.value?.reportValidity()
        return
    }

    await signUp()
}

async function signUp() {
    loading.value = true
    errorMsg.value = ''
    try {
        const client = useAuthClient()
        const result = await client.signUp.email({
            email: email.value,
            name: username.value,
            password: password1.value,
            callbackURL: '/',
        })
        if (result.error) {
            switch (result.error.code) {
                case "USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL": errorMsg.value = "用户已经存在，请尝试登录"; break;
                default: errorMsg.value = result.error.message ?? "未知错误";
                    console.log(result.error);
            }
            return;
        }

        await client.emailOtp.sendVerificationOtp({
            email: email.value,
            type: 'email-verification',
        })

        router.push({
            path: '/auth/sign-up/otp',
            query: { email: email.value },
        })
    } catch (err: any) {
        errorMsg.value = err?.message || '注册失败，请稍后重试'
    } finally {
        loading.value = false
    }
}
</script>
