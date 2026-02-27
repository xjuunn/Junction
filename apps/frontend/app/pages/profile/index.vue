<script setup lang="ts">
import { useClipboard } from '@vueuse/core'
import { uploadFiles } from '~/api/upload'
import { isTauri } from '~/utils/check'

definePageMeta({ layout: 'main' })

const authClient = useAuthClient() as any
const userStore = useUserStore()
const dialog = useDialog()
const toast = useToast()
const route = useRoute()
const { copy } = useClipboard()

const fileInputRef = ref<HTMLInputElement | null>(null)
const isUploading = ref(false)
const osName = ref('Unknown')

const menuItems = [
  { to: '/profile/general', label: '基本信息', icon: 'mingcute:user-info-line' },
  { to: '/profile/security', label: '安全验证', icon: 'mingcute:shield-line' },
]

const activeLabel = computed(() => {
  const current = menuItems.find(item => route.path.startsWith(item.to))
  return current?.label || '个人信息'
})

const initOsInfo = async () => {
  if (!isTauri()) {
    osName.value = 'Web'
    return
  }

  try {
    const { type } = await import('@tauri-apps/plugin-os')
    const value = await type()
    osName.value = String(value || 'Desktop').toUpperCase()
  } catch {
    osName.value = 'Desktop'
  }
}

const triggerFileInput = () => {
  if (!isUploading.value) fileInputRef.value?.click()
}

const handleCopyUid = async () => {
  const uid = userStore.user.value?.id || ''
  if (!uid) return
  await copy(uid)
  toast.success('UID 已复制')
}

const handleCopyEmail = async () => {
  const email = userStore.user.value?.email || ''
  if (!email) return
  await copy(email)
  toast.success('邮箱已复制')
}

const handleLogout = async () => {
  const confirmed = await dialog.confirm({
    title: '退出登录',
    content: '确认退出当前账号吗？',
    type: 'warning',
    confirmText: '退出',
    cancelText: '取消',
  })
  if (!confirmed) return

  try {
    if (typeof authClient?.signOut === 'function') {
      await authClient.signOut()
    }
  } catch (error) {
    console.error('[Profile] signOut failed:', error)
  } finally {
    userStore.clearAuth()
    toast.success('已退出登录')
    await navigateTo('/auth/sign-in', { replace: true })
  }
}

const handleFileChange = async (event: Event) => {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) return

  if (!file.type.startsWith('image/')) {
    toast.warning('请上传图片文件')
    input.value = ''
    return
  }

  if (file.size > 5 * 1024 * 1024) {
    toast.warning('图片大小不能超过 5MB')
    input.value = ''
    return
  }

  isUploading.value = true
  try {
    const { data, success } = await uploadFiles('avatar', [file])
    const avatarUrl = data?.files?.[0]
    if (!success || !avatarUrl) {
      toast.error('头像上传失败')
      return
    }

    await authClient.updateUser({ image: avatarUrl })
    await userStore.refresh()
    toast.success('头像已更新')
  } catch {
    toast.error('头像上传失败')
  } finally {
    isUploading.value = false
    input.value = ''
  }
}

onMounted(initOsInfo)
</script>

<template>
  <div class="h-full overflow-y-auto bg-base-200/30 px-3 py-4 md:px-6 md:py-6">
    <div class="mx-auto w-full max-w-[1320px] space-y-4 md:space-y-6">
      <section class="rounded-2xl border border-base-content/10 bg-base-100/20 p-4 shadow-sm backdrop-blur-xl md:p-6">
        <div class="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div class="flex items-center gap-4">
            <div class="relative">
              <div class="avatar">
                <div class="h-20 w-20 rounded-2xl border border-base-content/10 bg-base-100/20 md:h-24 md:w-24">
                  <img v-if="userStore.user.value?.image" :src="resolveAssetUrl(userStore.user.value.image)" class="object-cover">
                  <div v-else class="grid h-full w-full place-items-center text-2xl font-bold text-base-content/70">
                    {{ userStore.user.value?.name?.charAt(0).toUpperCase() || 'U' }}
                  </div>
                </div>
              </div>
              <button class="btn btn-soft btn-xs absolute -bottom-1 -right-1 rounded-lg" :disabled="isUploading" @click="triggerFileInput">
                <span v-if="isUploading" class="loading loading-spinner loading-xs"></span>
                <Icon v-else name="mingcute:camera-line" size="14" />
              </button>
              <input
                ref="fileInputRef"
                type="file"
                class="hidden"
                accept="image/png, image/jpeg, image/webp"
                @change="handleFileChange"
              >
            </div>

            <div class="min-w-0 space-y-2">
              <div class="flex flex-wrap items-center gap-2">
                <h1 class="truncate text-xl font-bold md:text-2xl">{{ userStore.user.value?.name || 'User' }}</h1>
                <span v-if="userStore.user.value?.emailVerified" class="badge badge-success badge-soft gap-1">
                  <Icon name="mingcute:check-line" size="12" />
                  已验证
                </span>
              </div>
              <div class="flex flex-wrap items-center gap-2 text-sm text-base-content/65">
                <Icon name="mingcute:mail-line" size="16" />
                <span class="truncate">{{ userStore.user.value?.email || '-' }}</span>
                <button class="btn btn-ghost btn-xs" @click="handleCopyEmail">
                  复制邮箱
                </button>
              </div>
              <button class="btn btn-ghost btn-xs justify-start px-2" @click="handleCopyUid">
                UID: {{ userStore.user.value?.id || '-' }}
                <Icon name="mingcute:copy-line" size="12" />
              </button>
            </div>
          </div>

          <div class="flex flex-wrap items-center justify-end gap-2">
            <span class="badge badge-soft border border-base-content/10">模块：{{ activeLabel }}</span>
            <span class="badge badge-soft border border-base-content/10">{{ isTauri() ? 'Tauri' : 'Web' }}</span>
            <span class="badge badge-soft border border-base-content/10">{{ osName }}</span>
            <button class="btn btn-soft btn-sm text-error hover:bg-error/10 hover:text-error" @click="handleLogout">
              <Icon name="mingcute:exit-door-line" size="16" />
              退出登录
            </button>
          </div>
        </div>
      </section>

      <section class="grid grid-cols-1 gap-4 lg:grid-cols-[260px_minmax(0,1fr)] lg:gap-6">
        <aside class="hidden lg:block">
          <div class="sticky top-4 rounded-2xl border border-base-content/10 bg-base-100/20 p-2 shadow-sm backdrop-blur-xl">
            <ul class="menu w-full gap-1">
              <li v-for="item in menuItems" :key="item.to">
                <NuxtLink
                  :to="item.to"
                  active-class="!bg-base-content !text-base-100 font-semibold"
                  class="rounded-xl px-4 py-3 text-sm text-base-content/70 transition hover:bg-base-200/70 hover:text-base-content"
                >
                  <Icon :name="item.icon" size="18" />
                  {{ item.label }}
                </NuxtLink>
              </li>
            </ul>
          </div>
        </aside>

        <div class="space-y-3 md:space-y-4">
          <div class="flex gap-2 overflow-x-auto rounded-2xl border border-base-content/10 bg-base-100/20 p-2 shadow-sm backdrop-blur-xl lg:hidden [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
            <NuxtLink
              v-for="item in menuItems"
              :key="item.to"
              :to="item.to"
              active-class="!bg-base-content !text-base-100"
              class="inline-flex shrink-0 items-center gap-2 rounded-xl px-3 py-2 text-xs text-base-content/70 transition hover:bg-base-200/70 hover:text-base-content"
            >
              <Icon :name="item.icon" size="16" />
              <span>{{ item.label }}</span>
            </NuxtLink>
          </div>

          <NuxtPage />
        </div>
      </section>
    </div>
  </div>
</template>

