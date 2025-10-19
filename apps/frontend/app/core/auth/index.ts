import { createAuthClient } from "better-auth/vue"

export const authClient = createAuthClient({
    baseURL: useRuntimeConfig().public.apiUrl,
})
