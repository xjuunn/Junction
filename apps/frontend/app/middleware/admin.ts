import * as adminApi from '~/api/admin'

export default defineNuxtRouteMiddleware(async () => {
  if (import.meta.server) return
  const userStore = useUserStore()
  if (!userStore.authToken.value) {
    return navigateTo('/auth/sign-in')
  }
  if (!userStore.isAuthChecked.value) {
    try {
      await userStore.refresh()
    } catch {
      userStore.clearAuth()
      return navigateTo('/auth/sign-in')
    }
  }
  const { isAdmin } = useAdminAccess()
  if (isAdmin.value) return
  try {
    await adminApi.getAdminStatus()
  } catch {
    return navigateTo('/chat')
  }
})
