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
      apiUrl: process.env.API_URL
    }
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
        target: process.env.API_URL,
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