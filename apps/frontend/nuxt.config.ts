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
      apiUrl: `${process.env.NUXT_PUBLIC_HTTP_TYPE || 'http'}://${process.env.NUXT_PUBLIC_SERVER_HOST || 'backend.junct.dpdns.org'}:${process.env.NUXT_PUBLIC_BACKEND_PORT || '8080'}`,
      httpType: process.env.NUXT_PUBLIC_HTTP_TYPE || 'http',
      serverHost: process.env.NUXT_PUBLIC_SERVER_HOST || 'backend.junct.dpdns.org',
      backendPort: process.env.NUXT_PUBLIC_BACKEND_PORT || '8080',
      frontendPort: process.env.NUXT_PUBLIC_FRONTEND_PORT || '3000',
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