<template>
    <div>
        <div class="text-3xl w-full inline-flex items-center gap-2">
            <span class="font-bold font-siyuan">登录</span>
            <span class="font-modernia text-base-content/20 translate-y-1.5">
                SIGNIN
            </span>
        </div>
        <div class="divider"></div>
        <div class="flex flex-col gap-2">
            <label class="input bg-transparent focus-within:outline-0">
                <icon name="mingcute:mail-fill"></icon>
                <input type="email" placeholder="请输入邮箱"></input>
            </label>
            <label class="input bg-transparent focus-within:outline-0">
                <icon name="mingcute:lock-fill"></icon>
                <input type="password" placeholder="请输入密码">
            </label>
            <div class="inline-flex items-center gap-2 justify-between">
                <label class="my-1">
                    <input type="checkbox" class="checkbox checkbox-sm">
                    <span class="text-sm text-base-content/90 ml-1">记住我</span>
                </label>
                <div class="text-base-content/80 text-sm inline-flex gap-2">
                    <span class="hover:link">忘记密码</span>
                </div>
            </div>

        </div>
        <div class="mt-2">
            <button class="btn btn-primary btn-block">登录</button>
        </div>
        <div class="divider my-7">OR</div>
        <div class="grid grid-cols-3 text-base-content/80">
            <nuxt-link to="/auth/sign-in/passkey" class="btn btn-sm btn-ghost">
                <icon name="mingcute:fingerprint-fill"></icon>
                通行密钥
            </nuxt-link>
            <nuxt-link to="/auth/sign-in/device-authorization" class="btn btn-sm btn-ghost">
                <icon name="mingcute:device-fill"></icon>
                设备授权
            </nuxt-link>
            <nuxt-link to="/auth/sign-in/magic-link" class="btn btn-sm btn-ghost">
                <icon name="mingcute:link-fill"></icon>
                魔术链接
            </nuxt-link>
        </div>
        <div class="text-end mt-4">
            <nuxt-link to="/auth/sign-up" :replace="true" class="text-sm hover:link text-base-content/60">
                没有账号？ 前往注册
            </nuxt-link>
        </div>
    </div>
</template>