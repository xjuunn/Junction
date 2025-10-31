<template>
    <div>
        <div class="text-3xl w-full inline-flex items-center gap-2">
            <span class="font-bold font-siyuan">注册</span>
            <span class="font-modernia text-base-content/20 translate-y-1.5">
                SIGNUP
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
            <label class="input bg-transparent focus-within:outline-0">
                <icon name="mingcute:lock-fill"></icon>
                <input type="password" placeholder="请重复输入密码">
            </label>
            <div class="inline-flex items-center gap-2 justify-between">

            </div>
        </div>
        <div class="mt-2">
            <button class="btn btn-primary btn-block">下一步</button>
        </div>
    </div>
</template>
