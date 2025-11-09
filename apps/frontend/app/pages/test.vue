<template>
    <div class="grid grid-cols-4">
        <button class="btn btn-primary" @click="login">
            <span>登录</span>
        </button>
        <button class="btn btn-primary" @click="toggleTheme">切换主题</button>
        <button class="btn btn-primary" @click="setPasskey">设置passkey</button>
        <button class="btn btn-primary" @click="verifPasskey">验证passkey</button>
        <button class="btn btn-primary" @click="signInWithWalletAddress">钱包地址登录</button>
        <button class="btn btn-primary" @click="fetchApi">api</button>
    </div>
</template>

<script setup lang="ts">
definePageMeta({
    layout: 'main-window'
})

async function login() {
    navigateTo('/auth/sign-in')
}

const theme = AppTheme.getInstance()
async function toggleTheme(event: MouseEvent) {
    const pos = { x: event.clientX, y: event.clientY }
    theme.toggleTheme(pos);
}
async function setPasskey() {
    const result = await useAuthClient().passkey.addPasskey({
        name: "test",
        authenticatorAttachment: "cross-platform"
    })
    console.log(result);
}
async function verifPasskey() {
    const result = await useAuthClient().signIn.passkey()
    console.log(result);
}
import { createWalletClient, http } from "viem"
import { privateKeyToAccount } from "viem/accounts"
import { mainnet } from "viem/chains"
const PRIVATE_KEY = "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"
async function signInWithWalletAddress() {
    const account = privateKeyToAccount(PRIVATE_KEY)
    const walletAddress = account.address
    const walletClient = createWalletClient({
        account,
        chain: mainnet,
        transport: http("https://eth.llamarpc.com"),
    })

    const { data: nonceData, error: nonceError } = await useAuthClient().siwe.nonce({
        walletAddress,
        chainId: 1,
    })

    if (nonceError || !nonceData?.nonce) {
        throw new Error("无法获取 nonce: " + (nonceError?.message || "未知错误"))
    }

    const nonce = nonceData.nonce
    const domain = "tauri.app"
    const uri = "https://tauri.app"
    const statement = "Sign in with your Ethereum wallet to continue."
    const version = "1"
    const chainId = 1

    const message = `${domain} wants you to sign in with your Ethereum account:
${walletAddress}

${statement}

URI: ${uri}
Version: ${version}
Chain ID: ${chainId}
Nonce: ${nonce}
Issued At: ${new Date().toISOString()}`
    const signature = await walletClient.signMessage({
        account,
        message,
    })
    const { data: verifyData, error: verifyError } = await useAuthClient().siwe.verify({
        message,
        signature,
        walletAddress,
        chainId: 1,
    })

    if (verifyError) {
        console.error("钱包登录失败:", verifyError)
        throw new Error("钱包登录失败: " + verifyError.message)
    }

    console.log("登录成功:", verifyData)
    return verifyData.user
}

import * as App from '~/api/app';
async function fetchApi() {
    const { data, error, success } = await App.test();
    data?.items.forEach(item => {
        console.log(item.email);
    })

}
</script>
