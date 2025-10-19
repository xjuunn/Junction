import tailwindcss from "@tailwindcss/vite"
import { config } from 'dotenv';
import { resolve } from 'path';
config({ path: resolve(__dirname, '../../.env') })
export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  devtools: { enabled: false },
  vite: {
    plugins: [tailwindcss()]
  },
  runtimeConfig: {
    public: {
      apiUrl: `${process.env.HTTP_TYPE}://${process.env.SERVER_HOST}:${process.env.FRONTEND_PORT}`,
      httpType: process.env.HTTP_TYPE,
      serverHost: process.env.SERVER_HOST,
      backendPort: process.env.BACKEND_PORT,
      frontendPort: process.env.FRONTEND_PORT,
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
      title: "Junction"
    }
  },
  nitro: {
    devProxy: {
      '/api': {
        target: `${process.env.HTTP_TYPE}://${process.env.SERVER_HOST}:${process.env.BACKEND_PORT}`,
        changeOrigin: true,
        prependPath: true,
      },
    },
  },
  modules: [
    "@nuxt/icon",
    "@pinia/nuxt",
    "@vueuse/nuxt",
    "@nuxtjs/color-mode",
    "nuxt-tiptap-editor",
    "@nuxtjs/device",
    "@vueuse/motion/nuxt"
  ]
})