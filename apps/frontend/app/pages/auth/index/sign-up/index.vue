<template>
    <div>
        <div class="text-3xl w-full inline-flex items-center gap-2">
            <span class="font-bold font-siyuan">注册</span>
            <span class="font-modernia text-base-content/20 translate-y-1.5">
                SIGNUP
            </span>
        </div>
        <div class="divider"></div>

        <form ref="form">
            <div class="flex flex-col gap-2">
                <p class="text-[0.7rem] text-base-content/60">全局唯一用户名，后续可<b>自定义昵称</b></p>
                <label class="input validator bg-transparent focus-within:outline-0">
                    <icon name="mingcute:user-3-fill" />
                    <input v-model="username" type="text" pattern="^[A-Za-z0-9_]+$" placeholder="请输入用户名" minlength="4"
                        maxlength="20" required />
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

                </div>
            </div>

            <div class="mt-2">
                <button type="submit" class="btn btn-primary btn-block" @click.prevent="handleSubmit">
                    下一步
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
const form = useTemplateRef('form')
const password1Ref = ref<HTMLInputElement>()
const password2Ref = ref<HTMLInputElement>()

const username = ref('')
const email = ref('')
const password1 = ref('')
const password2 = ref('')

function handleSubmit() {
    password2Ref.value?.setCustomValidity('')
    const valid = form.value?.reportValidity()
    if (!valid) return

    if (password1.value !== password2.value) {
        password2Ref.value?.setCustomValidity('两次输入的密码不一致')
        password2Ref.value?.reportValidity()
        return
    }

    console.log('验证通过')
    signUp();
}

async function signUp() {
    const signUpResult = await useAuthClient().signUp.email({
        email: email.value,
        name: username.value,
        password: password1.value,
        callbackURL: '/',
    })
    console.log("signUpresult", signUpResult);
    // const otpResult = await useAuthClient().emailOtp.sendVerificationOtp({
    //     email: email.value,
    //     type: 'email-verification'
    // })
    // console.log("otp", otpResult);

}
</script>
