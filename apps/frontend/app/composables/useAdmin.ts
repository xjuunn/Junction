export const useAdminAccess = () => {
  const userStore = useUserStore()
  const isAdmin = computed(() => {
    const user = userStore.user.value as { role?: string | null; accountType?: string | null } | null
    const role = String(user?.role || '').toLowerCase()
    const accountType = String(user?.accountType || '').toUpperCase()
    return role === 'admin' || accountType === 'ADMIN'
  })

  return {
    isAdmin
  }
}
