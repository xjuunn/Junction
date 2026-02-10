import tailwindcss from "@tailwindcss/vite"
import { config } from 'dotenv';
import { resolve } from 'path';
config({ path: resolve(__dirname, '../../.env') })

export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  devtools: { enabled: true },
  vite: {
    plugins: [tailwindcss()],
    server: {
      strictPort: true,
      allowedHosts: [
        'localhost',
        '127.0.0.1',
        'app.junct.dpdns.org',
      ],
      fs: {
        strict: false
      }
    }
  },
  // nitro: {
  //   preset: 'cloudflare-pages',
  //   output: {
  //     dir: '.output'
  //   }
  // },
  runtimeConfig: {
    public: {
      appName: process.env.NUXT_PUBLIC_APP_NAME,
      apiUrl: process.env.NUXT_PUBLIC_API_URL,
      httpType: process.env.NUXT_PUBLIC_HTTP_TYPE,
      serverHost: process.env.NUXT_PUBLIC_SERVER_HOST,
      tauriServerHost: process.env.NUXT_PUBLIC_TAURI_SERVER_HOST,
      backendPort: process.env.NUXT_PUBLIC_BACKEND_PORT,
      frontendPort: process.env.NUXT_PUBLIC_FRONTEND_PORT,
      rtcIceServers: process.env.NUXT_PUBLIC_RTC_ICE_SERVERS,
      livekitUrl: process.env.NUXT_PUBLIC_LIVEKIT_URL,
      ai: {
        defaultProvider: process.env.NUXT_PUBLIC_AI_DEFAULT_PROVIDER || 'deepseek',
        providers: {
          deepseek: {
            apiKey: process.env.DEEPSEEK_API_KEY,
            baseUrl: process.env.DEEPSEEK_API_BASE_URL,
            defaultModel: process.env.DEEPSEEK_DEFAULT_MODEL,
          },
        },
      },
    },
    authSecret: process.env.AUTH_SECRET,
  },
  imports: {
    dirs: [
      'core/**',
      'stores/**'
    ]
  },
  css: ["~/assets/app.css"],
  app: {
    head: {
      title: process.env.NUXT_PUBLIC_APP_NAME,
      charset: 'utf-8',
    },
    layoutTransition: { name: "layout", mode: 'out-in' },
    pageTransition: { name: "page", mode: "out-in" },
    viewTransition: "always"
  },
  modules: [
    "@nuxt/icon",
    "@pinia/nuxt",
    "@vueuse/nuxt",
    "@nuxtjs/color-mode",
    "@nuxtjs/device",
    "@vueuse/motion/nuxt"
  ],
  routeRules: {
    "/": { ssr: false },
    "/auth/**": { ssr: false },
    "/chat/**": { ssr: false },
    "/tools/**": { ssr: false }
  }
})
