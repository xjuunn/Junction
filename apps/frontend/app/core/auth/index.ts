import { createAuthClient } from "better-auth/vue"
import { emailOTPClient, passkeyClient, siweClient, jwtClient } from 'better-auth/client/plugins'

export function useAuthClient() {
    const config = useRuntimeConfig();
    return createAuthClient({
        baseURL: config.public.apiUrl,
        basePath: "/auth",
        plugins: [
            emailOTPClient(),
            passkeyClient(),
            siweClient(),
            jwtClient(),
        ],
        // fetchOptions: {
        //     onRequest: async (context) => {
        //         if (import.meta.client) {
        //             // const token = localStorage.getItem('better-auth.token') || localStorage.getItem('token');
        //             const token = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MjIsIm5hbWUiOiJhZG1pbiIsInJvbGUiOiJBRE1JTiIsImlhdCI6MTc1MDU2ODg2N30.i3AN8XjPAreEp00al1Xe8bZpcB8JiTMvsBobnUqfBRU";
        //             console.log(token);

        //             if (token) {
        //                 if (!context.headers) {
        //                     // @ts-ignore
        //                     context.headers = {};
        //                 }
        //                 if (context.headers instanceof Headers) {
        //                     context.headers.set("Authorization", `Bearer ${token}`);
        //                 } else {
        //                     context.headers = {
        //                         // @ts-ignore
        //                         ...context.headers,
        //                         Authorization: `Bearer ${token}`,
        //                     };
        //                 }
        //             }
        //         }
        //     }
        // }
    })
}