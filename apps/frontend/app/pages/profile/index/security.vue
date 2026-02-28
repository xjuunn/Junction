<script setup lang="ts">
import { isTauri } from '~/utils/check'

const authClient = useAuthClient() as any
const userStore = useUserStore()
const toast = useToast()
const dialog = useDialog()

const osName = ref('Web')
const passkeys = ref<Array<{ id: string, name?: string, createdAt?: string | Date }>>([])
const isPasskeyListLoading = ref(false)
const isPasskeyActionLoading = ref(false)

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

const hasPasskey = computed(() => passkeys.value.length > 0)
const currentPasskey = computed(() => passkeys.value[0] ?? null)

const formatDateTime = (value?: string | Date) => {
  if (!value) return '未知时间'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '未知时间'
  return date.toLocaleString('zh-CN', { hour12: false })
}

const resolvePasskeyList = (result: any): any[] => {
  if (Array.isArray(result)) return result
  if (Array.isArray(result?.data)) return result.data
  if (Array.isArray(result?.response)) return result.response
  return []
}

const loadPasskeys = async () => {
  isPasskeyListLoading.value = true
  try {
    let result: any = null

    if (typeof authClient?.$fetch === 'function') {
      result = await authClient.$fetch('/passkey/list-user-passkeys', { method: 'GET' })
    } else if (typeof authClient?.passkey?.listPasskeys === 'function') {
      result = await authClient.passkey.listPasskeys()
    }

    passkeys.value = resolvePasskeyList(result)
  } catch {
    passkeys.value = []
  } finally {
    isPasskeyListLoading.value = false
  }
}

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

  isPasskeyActionLoading.value = true
  try {
    const result = await authClient.passkey.addPasskey({
      name: `${userStore.user.value?.name || 'User'} Device`,
    })

    if (result?.error) {
      toast.error(result.error.message || '添加 Passkey 失败，请重试')
      return
    }

    toast.success('Passkey 添加成功')
    await loadPasskeys()
  } catch (error: any) {
    toast.error(error?.message || '操作取消或失败')
  } finally {
    isPasskeyActionLoading.value = false
  }
}

const handleDeletePasskey = async () => {
  if (!currentPasskey.value?.id) return

  const ok = await dialog.confirm({
    title: '删除 Passkey',
    content: '删除后将无法使用该 Passkey 登录，确认继续吗？',
    type: 'warning',
  })
  if (!ok) return

  isPasskeyActionLoading.value = true
  try {
    let result: any = null

    if (typeof authClient?.$fetch === 'function') {
      result = await authClient.$fetch('/passkey/delete-passkey', {
        method: 'POST',
        body: { id: currentPasskey.value.id },
      })
    } else if (typeof authClient?.passkey?.deletePasskey === 'function') {
      result = await authClient.passkey.deletePasskey({ id: currentPasskey.value.id })
    }

    if (result?.error) {
      toast.error(result.error.message || '删除 Passkey 失败，请重试')
      return
    }

    toast.success('Passkey 已删除')
    await loadPasskeys()
  } catch (error: any) {
    toast.error(error?.message || '删除 Passkey 失败，请重试')
  } finally {
    isPasskeyActionLoading.value = false
  }
}

const handleSecurityGuide = async () => {
  await dialog.alert('建议优先启用 Passkey，并保持邮箱可用以接收登录验证。Web3 登录能力正在开发中。')
}

onMounted(async () => {
  await initOs()
  await loadPasskeys()
})
</script>

<template>
  <div class="card border border-base-content/10 bg-base-100/20 shadow-none backdrop-blur-xl">
    <div class="card-body p-5 md:p-7">
      <h2 class="card-title mb-4 flex items-center gap-2 border-b border-base-content/10 pb-4 text-lg">
        <Icon name="mingcute:shield-shape-line" class="text-primary" />
        安全设置
      </h2>

      <div class="space-y-4">
        <div class="relative overflow-hidden rounded-2xl border border-base-content/10 bg-gradient-to-br from-base-100/70 via-base-100/35 to-base-200/35 p-5">
          <div class="pointer-events-none absolute -right-8 -top-10 h-28 w-28 rounded-full bg-primary/10 blur-2xl"></div>
          <div class="pointer-events-none absolute -bottom-10 -left-6 h-24 w-24 rounded-full bg-info/10 blur-2xl"></div>

          <div class="relative mb-4 flex flex-wrap items-center gap-2">
            <span class="badge badge-soft border border-base-content/10">环境：{{ isTauri() ? 'Tauri' : 'Web' }}</span>
            <span class="badge badge-soft border border-base-content/10">系统：{{ osName }}</span>
            <span class="badge" :class="passkeySupport.supported ? 'badge-success badge-soft' : 'badge-warning badge-soft'">
              {{ passkeySupport.supported ? '支持 Passkey' : '不支持 Passkey' }}
            </span>
            <span class="badge badge-ghost border border-base-content/10">状态：{{ hasPasskey ? '已配置' : '未配置' }}</span>
          </div>

          <div class="relative flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div class="flex items-start gap-3">
              <div class="grid h-11 w-11 place-items-center rounded-xl bg-primary/15 text-primary">
                <Icon name="mingcute:fingerprint-line" size="22" />
              </div>
              <div class="space-y-1">
                <div class="font-semibold tracking-wide">通行密钥（Passkey）</div>
                <p class="text-sm text-base-content/60">使用系统级生物识别或安全密钥登录，提升登录效率与账户安全性。</p>
                <p v-if="!passkeySupport.supported" class="text-xs text-warning">{{ passkeySupport.reason }}</p>
                <p v-else-if="currentPasskey" class="text-xs text-base-content/55">
                  当前设备密钥：{{ currentPasskey.name || '未命名设备' }} · 创建于 {{ formatDateTime(currentPasskey.createdAt) }}
                </p>
              </div>
            </div>

            <div class="shrink-0">
              <button
                v-if="!hasPasskey"
                class="btn btn-soft btn-sm min-w-32"
                :disabled="isPasskeyActionLoading || isPasskeyListLoading || !passkeySupport.supported"
                @click="handleRegisterPasskey"
              >
                <span v-if="isPasskeyActionLoading" class="loading loading-spinner loading-xs"></span>
                <Icon v-else name="mingcute:add-line" />
                添加 Passkey
              </button>

              <button
                v-else
                class="btn btn-ghost btn-sm min-w-32 border border-error/20 text-error hover:bg-error/10"
                :disabled="isPasskeyActionLoading || isPasskeyListLoading"
                @click="handleDeletePasskey"
              >
                <span v-if="isPasskeyActionLoading" class="loading loading-spinner loading-xs"></span>
                <Icon v-else name="mingcute:delete-2-line" />
                删除 Passkey
              </button>
            </div>
          </div>

          <div v-if="isPasskeyListLoading" class="relative mt-4 rounded-xl border border-base-content/10 bg-base-100/35 px-3 py-2 text-xs text-base-content/60">
            正在同步 Passkey 状态...
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