import { createAuthClient } from "better-auth/vue"
import { emailOTPClient, passkeyClient, siweClient, jwtClient } from 'better-auth/client/plugins'

function resolveAuthBaseURL(config: ReturnType<typeof useRuntimeConfig>): string {
    const fallback = String(config.public.apiUrl || '').trim();
    if (!import.meta.client) return fallback;

    const protocol = String(window.location.protocol || 'http:');
    const hostname = String(window.location.hostname || '').trim();
    const backendPort = String(config.public.backendPort || '').trim();

    const isDev = import.meta.dev;
    const isHttp = protocol === 'http:';
    const isLocalLike = hostname === 'localhost' || hostname === '127.0.0.1' || /^(?:\d{1,3}\.){3}\d{1,3}$/.test(hostname);

    // 开发模式下优先同主机访问后端，避免 localhost/IP 混用导致 Cookie 丢失。
    if (isDev && isHttp && isLocalLike && backendPort) {
        return `${protocol}//${hostname}:${backendPort}`;
    }

    return fallback;
}

export function useAuthClient() {
    const config = useRuntimeConfig();
    const userStore = useUserStore();
    return createAuthClient({
        baseURL: resolveAuthBaseURL(config),
        basePath: "/auth",
        plugins: [
            emailOTPClient(),
            passkeyClient(),
            siweClient(),
            jwtClient(),
        ],
        fetchOptions: {
            credentials: "include",
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
