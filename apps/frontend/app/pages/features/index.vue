<template>
    <div>
        <button class="btn btn-primary" @click="test">test</button>
        <button class="btn btn-primary" @click="btnFetch">fetch</button>
        <button class="btn btn-accent" @click="btnLogin">登录</button>
    </div>
</template>

<script setup lang="ts">
definePageMeta({
    layout: "main-window"
})
function test() {
    navigateTo('/auth/sign-in')
}
import * as AppApi from '~/api/app'
const client = useAuthClient();
const token = ref("");
async function btnFetch() {
    const session = await client.getSession({
        fetchOptions: {
            headers: {
                authorization: "Bearer " + token.value
            },
            onResponse(context) {
                console.log("响应", context);
                logger.info("响应:", context)

            },
        }
    });
    console.log("session:", session);
    logger.info("session:", session)
}
async function btnLogin() {
    const { data } = await client.signIn.email({
        email: "xjuunn@gmail.com",
        password: "123123",
        fetchOptions: {
            onResponse(context) {
                context.response.headers.keys().forEach(item => {
                    console.log(item);

                })
                token.value = context.response.headers.get("set-auth-token") ?? "";
                console.log("响应", context.response.headers.get("set-auth-token"));
                logger.info("获取到token:", token)
            },
        }
    })
    // const token = await client.token();
    // console.log("token", token);



}
</script>