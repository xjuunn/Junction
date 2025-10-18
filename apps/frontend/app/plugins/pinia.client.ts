import type { Pinia } from "pinia";
import { TauriPluginPinia } from '@tauri-store/pinia';
import piniaPluginPersistedstate from 'pinia-plugin-persistedstate';

export default defineNuxtPlugin((nuxtApp) => {
    const pinia = nuxtApp.vueApp.$nuxt.$pinia as Pinia;
    if (isTauri()) pinia.use(TauriPluginPinia({ autoStart: true }));
    else pinia.use(piniaPluginPersistedstate)
})