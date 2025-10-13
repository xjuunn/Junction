import { type } from '@tauri-apps/plugin-os';
export default defineNuxtPlugin(async (nuxtApp) => {
    console.log('🚀 应用启动中...')
    const html = document.getElementsByTagName('html')[0];
    if (html && isTauri() && (type() === 'windows' || type() === 'macos'))
        html.style.background = 'transparent';
    if (html) html.addEventListener('contextmenu', e => e.preventDefault())

})
