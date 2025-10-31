<template>
    <div class="flex h-full">
        <div class="w-5/12 flex flex-1 md:flex-none items-center justify-center pl-5 overflow-y-auto relative">
            <div class="mb-10 min-w-80 ">
                <nuxt-page></nuxt-page>
                <nuxt-link to="/auth/sign-up" class="absolute bottom-3 right-3 text-sm hover:link text-base-content/60">
                    没有账号？ 现在注册
                </nuxt-link>
            </div>
        </div>
        <div class="p-3 flex-1 hidden md:block">
            <div class="h-full w-full rounded-md overflow-hidden relative bg-base-content/5">

            </div>
        </div>
    </div>
</template>