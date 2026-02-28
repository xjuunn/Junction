<template>
  <div class="mx-auto w-full max-w-sm animate-fade-in">
    <div class="mb-2 flex items-center gap-2">
      <div class="inline-flex items-center gap-2 text-3xl">
        <span class="font-bold font-siyuan">以太坊登录</span>
        <span class="translate-y-1.5 font-modernia text-base-content/20">WALLET</span>
      </div>
    </div>
    <div class="divider"></div>

    <form class="flex flex-col gap-4" @submit.prevent="handleSubmit">
      <transition name="fade" mode="out-in">
        <div v-if="step === 'wallet'" key="wallet" class="flex flex-col gap-4">
          <p class="text-sm text-base-content/70">输入钱包地址并完成签名，即可登录</p>
          <button type="button" class="btn btn-block justify-between" :disabled="loading" @click="connectMetaMask">
            <div class="flex items-center gap-2">
              <svg xmlns="http://www.w3.org/2000/svg" width="1.5em" height="1.5em" viewBox="0 0 24 24">
                <g fill="none">
                  <path fill="#ff5c16"
                    d="m19.821 19.918l-3.877-1.131l-2.924 1.712h-2.04l-2.926-1.712l-3.875 1.13L3 16.02l1.179-4.327L3 8.034L4.179 3.5l6.056 3.544h3.53L19.821 3.5L21 8.034l-1.179 3.658L21 16.02z"
                    stroke-width="0.5" stroke="#ff5c16" />
                  <path fill="#ff5c16"
                    d="m4.18 3.5l6.055 3.547l-.24 2.434zm3.875 12.52l2.665 1.99l-2.665.777zm2.452-3.286l-.512-3.251l-3.278 2.21h-.002v.001l.01 2.275l1.33-1.235zM19.82 3.5l-6.056 3.547l.24 2.434zm-3.875 12.52l-2.665 1.99l2.665.777zm1.339-4.326v-.002zl-3.279-2.21l-.512 3.25h2.451l1.33 1.236z"
                    stroke-width="0.5" stroke="#ff5c16" />
                  <path fill="#e34807"
                    d="m8.054 18.787l-3.875 1.13L3 16.022h5.054zm2.452-6.054l.74 4.7l-1.026-2.614l-3.497-.85l1.33-1.236zm5.44 6.054l3.875 1.13L21 16.022h-5.055zm-2.452-6.054l-.74 4.7l1.026-2.614l3.497-.85l-1.331-1.236z"
                    stroke-width="0.5" stroke="#e34807" />
                  <path fill="#ff8d5d"
                    d="m3 16.02l1.179-4.328h2.535l.01 2.276l3.496.85l1.026 2.613l-.527.576l-2.665-1.989H3zm18 0l-1.179-4.328h-2.535l-.01 2.276l-3.496.85l-1.026 2.613l.527.576l2.665-1.989H21zm-7.235-8.976h-3.53l-.24 2.435l1.251 7.95h1.508l1.252-7.95z"
                    stroke-width="0.5" stroke="#ff8d5d" />
                  <path fill="#661800"
                    d="M4.179 3.5L3 8.034l1.179 3.658h2.535l3.28-2.211zm5.594 10.177H8.625l-.626.6l2.222.54zM19.821 3.5L21 8.034l-1.179 3.658h-2.535l-3.28-2.211zm-5.593 10.177h1.15l.626.6l-2.224.541zm-1.209 5.271l.262-.94l-.527-.575h-1.509l-.527.575l.262.94"
                    stroke-width="0.5" stroke="#661800" />
                  <path fill="#c0c4cd" d="M13.02 18.948V20.5h-2.04v-1.552z" stroke-width="0.5" stroke="#c0c4cd" />
                  <path fill="#e7ebf6"
                    d="m8.055 18.785l2.927 1.714v-1.552l-.262-.94zm7.89 0L13.02 20.5v-1.552l.262-.94z"
                    stroke-width="0.5" stroke="#e7ebf6" />
                </g>
              </svg>
              <span>MetaMask</span>
            </div>
            <icon name="mingcute:right-line" class="w-4 h-4 opacity-50" />
          </button>
          <!-- <button type="button" class="btn btn-block justify-between" :disabled="loading" @click="connectMetaMask">
            <div class="flex items-center gap-2">
              <Icon name="mingcute:wallet-3-fill" size="18" />
              <span>连接 MetaMask 并自动填充</span>
            </div>
            <Icon name="mingcute:right-line" class="h-4 w-4 opacity-50" />
          </button> -->

          <div class="divider my-1 text-xs">或手动输入地址</div>

          <label class="input flex w-full items-center gap-2 bg-transparent focus-within:outline-0">
            <Icon name="mingcute:wallet-3-fill" class="h-5 w-5 opacity-60" />
            <input v-model.trim="walletAddress" type="text" placeholder="0x..."
              class="grow bg-transparent text-sm outline-none" @input="validateAddress">
          </label>

          <transition name="fade">
            <div v-if="errorMsg" class="text-end text-sm text-error">{{ errorMsg }}</div>
          </transition>

          <button type="submit" class="btn btn-primary btn-block" :disabled="loading || !walletAddress">
            <span v-if="loading" class="loading loading-spinner loading-sm"></span>
            <span v-else>继续签名</span>
          </button>

          <button type="button" class="btn btn-ghost btn-block" @click="router.back()">返回</button>
        </div>

        <div v-else key="signing" class="flex flex-col gap-4">
          <div class="flex flex-col items-center gap-4">
            <div class="relative h-20 w-20">
              <div class="absolute inset-0 flex items-center justify-center">
                <Icon name="mingcute:wallet-3-fill" class="h-10 w-10 text-primary" />
              </div>
              <svg v-if="loading" class="absolute inset-0 h-20 w-20 animate-spin text-primary/30" fill="none"
                stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                <circle cx="12" cy="12" r="10" stroke-dasharray="62.83" stroke-dashoffset="0" />
              </svg>
            </div>

            <div class="text-center">
              <p class="text-base font-semibold">{{ statusMessage }}</p>
              <p class="mt-1 text-sm text-base-content/70">{{ statusDescription }}</p>
            </div>
          </div>

          <div class="rounded-lg bg-base-200/50 p-3 text-sm">
            <p class="break-all font-mono text-xs text-base-content/80">
              {{ displayAddress }}
            </p>
          </div>

          <transition name="fade">
            <div v-if="errorMsg" class="alert alert-error shadow-lg">
              <Icon name="mingcute:close-fill" size="1.2rem" />
              <span class="text-sm">{{ errorMsg }}</span>
            </div>
          </transition>

          <button type="submit" class="btn btn-primary btn-block" :disabled="loading">
            <span v-if="loading" class="loading loading-spinner loading-sm"></span>
            <span v-else class="flex items-center gap-2">
              <Icon name="mingcute:edit-2-fill" size="1rem" />
              签名认证并登录
            </span>
          </button>

          <button type="button" class="btn btn-ghost btn-block" :disabled="loading" @click="resetToWallet">
            返回修改
          </button>
        </div>
      </transition>
    </form>

    <div class="mt-6 space-y-2 rounded-lg bg-base-200/50 p-4 text-sm text-base-content/70">
      <p class="flex items-start gap-2">
        <Icon name="mingcute:information-fill" size="1.2rem" class="mt-0.5 shrink-0" />
        <span>仅会请求签名，不会索取私钥。请确认签名页面域名可信。</span>
      </p>
    </div>
  </div>
</template>

<script lang="ts" setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { getAddress, isAddress } from 'viem'

declare global {
  interface Window {
    ethereum?: {
      isMetaMask?: boolean
      request: (args: { method: string; params?: any[] }) => Promise<any>
    }
  }
}

const router = useRouter()
const step = ref<'wallet' | 'signing'>('wallet')
const walletAddress = ref('')
const displayAddress = ref('')
const loading = ref(false)
const errorMsg = ref('')
const statusMessage = ref('准备验证')
const statusDescription = ref('请在钱包中确认签名请求')

const validateAddress = () => {
  errorMsg.value = ''
  const value = walletAddress.value.trim()
  if (!value) return
  if (!isAddress(value)) {
    errorMsg.value = '请输入有效的钱包地址'
  }
}

const connectMetaMask = async () => {
  loading.value = true
  errorMsg.value = ''
  try {
    if (!window.ethereum?.isMetaMask) {
      throw new Error('请先安装 MetaMask 浏览器扩展')
    }
    const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' })
    if (!Array.isArray(accounts) || accounts.length === 0) {
      throw new Error('无法获取钱包账户')
    }
    const address = getAddress(String(accounts[0]))
    walletAddress.value = address
    displayAddress.value = address
    step.value = 'signing'
  } catch (err: any) {
    errorMsg.value = err?.message || 'MetaMask 连接失败'
  } finally {
    loading.value = false
  }
}

const ensureMetaMaskAddress = async (expectedAddress: string) => {
  if (!window.ethereum?.isMetaMask) {
    throw new Error('请先安装 MetaMask 浏览器扩展')
  }
  const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' })
  if (!Array.isArray(accounts) || accounts.length === 0) {
    throw new Error('无法获取钱包账户')
  }
  const activeAddress = getAddress(String(accounts[0]))
  if (activeAddress.toLowerCase() !== expectedAddress.toLowerCase()) {
    throw new Error('请在 MetaMask 切换到输入的钱包地址后重试')
  }
  return activeAddress
}

const handleSubmit = async () => {
  if (step.value === 'wallet') {
    validateAddress()
    if (errorMsg.value) return
    try {
      const address = getAddress(walletAddress.value.trim())
      walletAddress.value = address
      displayAddress.value = address
      step.value = 'signing'
    } catch {
      errorMsg.value = '请输入有效的钱包地址'
    }
    return
  }
  await handleSign()
}

const handleSign = async () => {
  if (loading.value) return

  loading.value = true
  errorMsg.value = ''
  statusMessage.value = '正在准备签名...'
  statusDescription.value = '请稍候'

  try {
    const checksumAddress = await ensureMetaMaskAddress(walletAddress.value.trim())

    statusMessage.value = '获取验证码...'
    const { data: nonceData, error: nonceError } = await useAuthClient().siwe.nonce({
      walletAddress: checksumAddress,
      chainId: 1,
    })

    if (nonceError || !nonceData?.nonce) {
      throw new Error('无法获取验证码')
    }

    const nonce = nonceData.nonce
    const domain = window.location.hostname || 'localhost'
    const uri = window.location.origin || 'http://localhost:3000'
    const message = `${domain} wants you to sign in with your Ethereum account:
${checksumAddress}

通过签名进行安全认证

URI: ${uri}
Version: 1
Chain ID: 1
Nonce: ${nonce}
Issued At: ${new Date().toISOString()}`

    statusMessage.value = '等待签名...'
    statusDescription.value = '请在 MetaMask 中确认'

    const signature = await window.ethereum!.request({
      method: 'personal_sign',
      params: [message, checksumAddress],
    })

    if (!signature) {
      throw new Error('签名失败')
    }

    statusMessage.value = '验证签名...'
    statusDescription.value = '请稍候'

    const { error: verifyError } = await useAuthClient().siwe.verify({
      message,
      signature,
      walletAddress: checksumAddress,
      chainId: 1,
      fetchOptions: {
        onResponse(context) {
          const t = context.response.headers.get('set-auth-token') ?? ''
          useUserStore().setAuthToken(t)
        },
      },
    })

    if (verifyError) {
      throw new Error(verifyError.message || '签名验证失败')
    }

    statusMessage.value = '验证成功'
    statusDescription.value = '正在跳转...'
    await new Promise(resolve => setTimeout(resolve, 800))
    await router.replace('/')
  } catch (err: any) {
    if (err?.code === 4001) {
      errorMsg.value = '您已拒绝签名请求'
      statusDescription.value = '签名被拒绝'
    } else {
      errorMsg.value = err?.message || '签名验证失败，请重试'
      statusDescription.value = '操作失败'
    }
  } finally {
    loading.value = false
  }
}

const resetToWallet = () => {
  step.value = 'wallet'
  errorMsg.value = ''
  statusMessage.value = '准备验证'
  statusDescription.value = '请在钱包中确认签名请求'
}
</script>

<style scoped>
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

@keyframes spin {
  from {
    transform: rotate(0deg);
  }

  to {
    transform: rotate(360deg);
  }
}

.animate-spin {
  animation: spin 2s linear infinite;
}
</style>
