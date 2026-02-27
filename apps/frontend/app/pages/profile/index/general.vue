<script setup lang="ts">
const authClient = useAuthClient()
const userStore = useUserStore()
const toast = useToast()
const isSubmitting = ref(false)

const formData = reactive({
  name: '',
  email: '',
})

watchEffect(() => {
  const user = userStore.user.value
  if (!user) return
  formData.name = user.name || ''
  formData.email = user.email || ''
})

const isChanged = computed(() => {
  const user = userStore.user.value
  if (!user) return false
  return formData.name.trim() !== (user.name || '') || formData.email.trim() !== (user.email || '')
})

const resetForm = () => {
  const user = userStore.user.value
  if (!user) return
  formData.name = user.name || ''
  formData.email = user.email || ''
  toast.info('已恢复为当前资料')
}

const handleUpdateProfile = async () => {
  const user = userStore.user.value
  if (!user) return

  const nextName = formData.name.trim()
  const nextEmail = formData.email.trim()
  if (!nextName) {
    toast.warning('显示名称不能为空')
    return
  }

  isSubmitting.value = true
  try {
    if (nextName !== (user.name || '')) {
      await authClient.updateUser({ name: nextName })
    }

    if (nextEmail !== (user.email || '')) {
      await authClient.changeEmail({
        newEmail: nextEmail,
        callbackURL: window.location.href,
      })
      toast.success('验证邮件已发送，请前往邮箱完成验证')
    } else {
      toast.success('个人信息已更新')
    }

    await userStore.refresh()
  } catch {
    toast.error('保存失败，请稍后重试')
  } finally {
    isSubmitting.value = false
  }
}
</script>

<template>
  <div class="card border border-base-content/10 bg-base-100/20 shadow-none backdrop-blur-xl">
    <div class="card-body p-5 md:p-7">
      <h2 class="card-title mb-4 flex items-center gap-2 border-b border-base-content/10 pb-4 text-lg">
        <Icon name="mingcute:user-edit-line" class="text-primary" />
        基本信息
      </h2>

      <div class="grid gap-5 md:grid-cols-2">
        <div class="form-control md:col-span-1">
          <label class="label">
            <span class="label-text font-medium">显示名称</span>
            <span class="label-text-alt text-base-content/60">{{ formData.name.length }}/32</span>
          </label>
          <input
            v-model="formData.name"
            type="text"
            maxlength="32"
            class="input input-bordered w-full border-base-content/10 bg-base-100/25 backdrop-blur-xl focus:border-primary/40"
            placeholder="请输入显示名称" />
          <label class="label">
            <span class="label-text-alt text-base-content/60">该名称会显示在会话、资料卡和搜索结果中</span>
          </label>
        </div>

        <div class="form-control md:col-span-1">
          <label class="label">
            <span class="label-text font-medium">电子邮箱</span>
          </label>
          <input
            v-model="formData.email"
            type="email"
            class="input input-bordered w-full border-base-content/10 bg-base-100/25 backdrop-blur-xl focus:border-primary/40"
            placeholder="name@example.com" />
          <label class="label">
            <span class="label-text-alt text-base-content/60">修改邮箱后需要重新验证</span>
          </label>
        </div>
      </div>

      <div v-if="formData.email.trim() !== (userStore.user.value?.email || '')"
        class="alert alert-warning mt-4 border border-warning/30">
        <Icon name="mingcute:warning-line" />
        <span>邮箱变更后，验证通过前将继续使用当前邮箱作为登录凭据。</span>
      </div>

      <div class="mt-6 flex flex-wrap justify-end gap-2 border-t border-base-content/10 pt-5">
        <button class="btn btn-ghost" :disabled="isSubmitting || !isChanged" @click="resetForm">重置更改</button>
        <button class="btn btn-soft" :disabled="isSubmitting || !isChanged" @click="handleUpdateProfile">
          <span v-if="isSubmitting" class="loading loading-spinner loading-xs"></span>
          保存更改
        </button>
      </div>
    </div>
  </div>
</template>
