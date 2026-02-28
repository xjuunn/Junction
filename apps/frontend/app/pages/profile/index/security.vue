<script setup lang="ts">
import { isTauri } from '~/utils/check'

const authClient = useAuthClient()
const userStore = useUserStore()
const toast = useToast()
const dialog = useDialog()
const isPasskeyLoading = ref(false)
const osName = ref('Web')

const passkeySupport = computed(() => {
  if (typeof window === 'undefined') {
    return { supported: false, reason: '当前环境不支持 Passkey' }
  }

  if (!window.PublicKeyCredential) {
    return { supported: false, reason: '当前浏览器不支持 Passkey' }
  }

  const host = window.location.hostname
  const isLocalHost = host === 'localhost' || host === '127.0.0.1' || host.endsWith('.localhost')
  const secureContext = window.isSecureContext || isLocalHost

  if (!secureContext) {
    return {
      supported: false,
      reason: 'HTTP + IP 地址不支持 Passkey，请改用 localhost 或 HTTPS 域名',
    }
  }

  return { supported: true, reason: '' }
})

const initOs = async () => {
  if (!isTauri()) {
    osName.value = 'Web'
    return
  }
  try {
    const { type } = await import('@tauri-apps/plugin-os')
    osName.value = String(await type()).toUpperCase()
  } catch {
    osName.value = 'Desktop'
  }
}

const handleRegisterPasskey = async () => {
  if (!passkeySupport.value.supported) {
    toast.warning(passkeySupport.value.reason)
    return
  }

  isPasskeyLoading.value = true
  try {
    const result = await authClient.passkey.addPasskey({
      name: `${userStore.user.value?.name || 'User'} Device`,
    })

    if (result?.error) {
      toast.error(result.error.message || '添加 Passkey 失败，请重试')
      return
    }

    toast.success('Passkey 添加成功')
  } catch (error: any) {
    toast.error(error?.message || '操作取消或失败')
  } finally {
    isPasskeyLoading.value = false
  }
}

const handleSecurityGuide = async () => {
  await dialog.alert('建议优先启用 Passkey，并保持邮箱可用以接收登录验证。Web3 登录能力正在开发中。')
}

onMounted(initOs)
</script>

<template>
  <div class="card border border-base-content/10 bg-base-100/20 shadow-none backdrop-blur-xl">
    <div class="card-body p-5 md:p-7">
      <h2 class="card-title mb-4 flex items-center gap-2 border-b border-base-content/10 pb-4 text-lg">
        <Icon name="mingcute:shield-shape-line" class="text-primary" />
        安全设置
      </h2>

      <div class="space-y-4">
        <div class="rounded-2xl border border-base-content/10 bg-base-100/20 p-4">
          <div class="mb-3 flex flex-wrap items-center gap-2">
            <span class="badge badge-soft border border-base-content/10">环境：{{ isTauri() ? 'Tauri' : 'Web' }}</span>
            <span class="badge badge-soft border border-base-content/10">系统：{{ osName }}</span>
            <span class="badge" :class="passkeySupport.supported ? 'badge-success badge-soft' : 'badge-warning badge-soft'">
              {{ passkeySupport.supported ? '支持 Passkey' : '不支持 Passkey' }}
            </span>
          </div>

          <div class="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div class="flex items-start gap-3">
              <div class="grid h-11 w-11 place-items-center rounded-xl bg-primary/15 text-primary">
                <Icon name="mingcute:fingerprint-line" size="22" />
              </div>
              <div class="space-y-1">
                <div class="font-semibold">通行密钥（Passkey）</div>
                <p class="text-sm text-base-content/60">使用系统级生物识别或安全密钥登录，降低密码泄露风险，并提升跨设备体验。</p>
                <p v-if="!passkeySupport.supported" class="text-xs text-warning">{{ passkeySupport.reason }}</p>
              </div>
            </div>
            <button class="btn btn-soft btn-sm shrink-0" :disabled="isPasskeyLoading || !passkeySupport.supported" @click="handleRegisterPasskey">
              <span v-if="isPasskeyLoading" class="loading loading-spinner loading-xs"></span>
              <Icon v-else name="mingcute:add-line" />
              添加 Passkey
            </button>
          </div>
        </div>

        <div class="rounded-2xl border border-base-content/10 bg-base-100/20 p-4">
          <div class="grid gap-3">
            <div class="flex items-center justify-between rounded-xl bg-base-100/20 px-3 py-3">
              <div class="flex items-center gap-3">
                <div class="grid h-9 w-9 place-items-center rounded-lg bg-base-100/20">
                  <Icon name="mingcute:mail-send-line" size="18" class="text-base-content/70" />
                </div>
                <div>
                  <div class="text-sm font-medium">邮箱验证码（OTP）</div>
                  <div class="text-xs text-base-content/60">默认启用</div>
                </div>
              </div>
              <span class="badge badge-success badge-soft">已启用</span>
            </div>

            <div class="flex items-center justify-between rounded-xl bg-base-100/20 px-3 py-3">
              <div class="flex items-center gap-3">
                <div class="grid h-9 w-9 place-items-center rounded-lg bg-base-100/20">
                  <Icon name="mingcute:wallet-line" size="18" class="text-base-content/70" />
                </div>
                <div>
                  <div class="text-sm font-medium">SIWE（Web3 钱包）</div>
                  <div class="text-xs text-base-content/60">功能开发中</div>
                </div>
              </div>
              <button class="btn btn-ghost btn-xs" @click="handleSecurityGuide">查看建议</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>