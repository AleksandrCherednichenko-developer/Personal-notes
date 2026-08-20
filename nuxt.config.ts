export default defineNuxtConfig({
  compatibilityDate: '2026-08-20',
  css: ['~/assets/styles/main.scss'],
  devtools: { enabled: false },
  modules: ['@pinia/nuxt', '@nuxt/eslint'],
  ssr: false,
  typescript: {
    strict: true,
    typeCheck: true,
  },
})
