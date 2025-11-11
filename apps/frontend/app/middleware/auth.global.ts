export default defineNuxtRouteMiddleware(async (to, from) => {
    if (import.meta.server) return
    if (to.path.startsWith('/auth')) return
    const authClient = useAuthClient()
    const session = await authClient.getSession()
    if (session.data === null) {
        onNuxtReady(() => {
            navigateTo('/auth/sign-in', { replace: true })
        })
    }
})
