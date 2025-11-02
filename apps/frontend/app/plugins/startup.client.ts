export default defineNuxtPlugin(async (nuxtApp) => {
    console.log('🚀 应用启动中...')
    const html = document.getElementsByTagName('html')[0];
    if (html) html.addEventListener('contextmenu', e => e.preventDefault())

    await AppTheme.getInstance().init();
})
