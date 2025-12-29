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
  nitro: {
    preset: 'cloudflare-pages',
    output: {
      dir: '.output'
    }
  },
  runtimeConfig: {
    public: {
      appName: process.env.NUXT_PUBLIC_APP_NAME,
      apiUrl: process.env.NUXT_PUBLIC_API_URL,
      httpType: process.env.NUXT_PUBLIC_HTTP_TYPE,
      serverHost: process.env.NUXT_PUBLIC_SERVER_HOST,
      backendPort: process.env.NUXT_PUBLIC_BACKEND_PORT,
      frontendPort: process.env.NUXT_PUBLIC_FRONTEND_PORT,
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
  ]
})