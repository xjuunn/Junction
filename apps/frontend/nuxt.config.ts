import tailwindcss from "@tailwindcss/vite"
import { config } from 'dotenv';
import { resolve } from 'path';
config({ path: resolve(__dirname, '../../.env') })

const httpType = (process.env.NUXT_PUBLIC_HTTP_TYPE || 'http').trim()
const serverHost = (process.env.NUXT_PUBLIC_SERVER_HOST || 'localhost').trim()
const backendPort = (process.env.NUXT_PUBLIC_BACKEND_PORT || '8080').trim()
const frontendPort = (process.env.NUXT_PUBLIC_FRONTEND_PORT || '3000').trim()
const livekitPort = (process.env.LIVEKIT_PORT || '7880').trim()
const tauriServerHost = (process.env.NUXT_PUBLIC_TAURI_SERVER_HOST || '').trim()
const appName = (process.env.NUXT_PUBLIC_APP_NAME || 'Junction').trim()

const buildUrl = (protocol: string, host: string, port: string) => `${protocol}://${host}${port ? `:${port}` : ''}`
const resolvedApiUrl = buildUrl(httpType, serverHost, backendPort)
const resolvedLivekitUrl = buildUrl(httpType, serverHost, livekitPort)

export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  devtools: { enabled: true },
  experimental: {
    appManifest: false,
  },
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
      appName,
      apiUrl: resolvedApiUrl,
      httpType,
      serverHost,
      tauriServerHost,
      backendPort,
      frontendPort,
      rtcIceServers: process.env.NUXT_PUBLIC_RTC_ICE_SERVERS,
      livekitUrl: resolvedLivekitUrl,
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
      title: appName,
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
    "/call/**": { ssr: false },
    "/tools/**": { ssr: false }
  }
})
