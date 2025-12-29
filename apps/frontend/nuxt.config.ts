import tailwindcss from "@tailwindcss/vite"
// config({ path: resolve(__dirname, '../../.env') })

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
      appName: '',
      apiUrl: '',
      httpType: '',
      serverHost: '',
      backendPort: '',
      frontendPort: '',
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