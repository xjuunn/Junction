import tailwindcss from "@tailwindcss/vite"
import { config } from 'dotenv';
import { resolve } from 'path';
config({ path: resolve(__dirname, '../../.env') })
export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  devtools: { enabled: true },
  vite: {
    plugins: [tailwindcss()]
  },
  nitro: {
    preset: 'cloudflare-pages',
    output: {
      dir: '.output'
    }
  },
  runtimeConfig: {
    public: {
      appName: process.env.APP_NAME || 'Junction',
      apiUrl: `${process.env.HTTP_TYPE || 'http'}://${process.env.SERVER_HOST || 'backend.junct.dpdns.org'}:${process.env.BACKEND_PORT || '8080'}`,
      httpType: process.env.HTTP_TYPE || 'http',
      serverHost: process.env.SERVER_HOST || 'backend.junct.dpdns.org',
      backendPort: process.env.BACKEND_PORT || '8080',
      frontendPort: process.env.FRONTEND_PORT || '3000',
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
      title: process.env.APP_NAME,
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