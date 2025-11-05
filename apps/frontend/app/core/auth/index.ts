import { createAuthClient } from "better-auth/vue"
import { emailOTPClient, passkeyClient, siweClient } from 'better-auth/client/plugins'

export function useAuthClient() {
    const config = useRuntimeConfig();
    return createAuthClient({
        baseURL: config.public.apiUrl,
        basePath: "bgapi/auth",
        plugins: [
            emailOTPClient(),
            passkeyClient(),
            siweClient()
        ]
    })
}