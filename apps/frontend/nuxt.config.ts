import tailwindcss from "@tailwindcss/vite"
export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  devtools: { enabled: true },
  vite: {
    plugins: [tailwindcss()]
  },
  css:["~/assets/app.css"],
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