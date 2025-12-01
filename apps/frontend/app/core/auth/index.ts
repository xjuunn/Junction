import { createAuthClient } from "better-auth/vue"
import { emailOTPClient, passkeyClient, siweClient, jwtClient } from 'better-auth/client/plugins'

export function useAuthClient() {
    const config = useRuntimeConfig();
    const userStore = useUserStore();
    return createAuthClient({
        baseURL: config.public.apiUrl,
        basePath: "/auth",
        plugins: [
            emailOTPClient(),
            passkeyClient(),
            siweClient(),
            jwtClient(),
        ],
        fetchOptions: {
            onRequest: async (context) => {
                if (import.meta.client) {
                    const token = userStore.authToken.value;
                    if (token) {
                        if (!context.headers) {
                            // @ts-ignore
                            context.headers = {};
                        }
                        if (context.headers instanceof Headers) {
                            context.headers.set("Authorization", `Bearer ${token}`);
                        } else {
                            context.headers = {
                                // @ts-ignore
                                ...context.headers,
                                Authorization: `Bearer ${token}`,
                            };
                        }
                    }
                }
            }
        }
    })
}