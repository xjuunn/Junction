import * as adminApi from '~/api/admin'
import { isAuthInvalidError } from '~/utils/auth'

export default defineNuxtRouteMiddleware(async () => {
  if (import.meta.server) return
  const userStore = useUserStore()
  if (!userStore.authToken.value) {
    return navigateTo('/auth/sign-in')
  }
  if (!userStore.isAuthChecked.value) {
    try {
      await userStore.refresh()
    } catch (error) {
      if (isAuthInvalidError(error)) {
        userStore.clearAuth()
        return navigateTo('/auth/sign-in')
      }
      return navigateTo('/chat')
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
