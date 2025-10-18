import type { Pinia } from "pinia";
import { TauriPluginPinia } from '@tauri-store/pinia';

export default defineNuxtPlugin((nuxtApp) => {
    (nuxtApp.vueApp.$nuxt.$pinia as Pinia).use(TauriPluginPinia({
        autoStart: true
    }));
})