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
  css: ["~/assets/app.css"],
  app: {
    head: {
      title: "Junction"
    }
  },
  modules: [
    "@nuxt/icon",
    "@pinia/nuxt",
    "@vueuse/nuxt",
    "@nuxtjs/color-mode",
    "nuxt-tiptap-editor",
    "@nuxtjs/device",
    "@hypernym/nuxt-anime"
  ]
})