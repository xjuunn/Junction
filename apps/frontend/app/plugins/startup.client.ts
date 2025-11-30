export default defineNuxtPlugin(async (nuxtApp) => {
    const html = document.getElementsByTagName('html')[0];
    if (html) html.addEventListener('contextmenu', e => e.preventDefault())
    await AppTheme.getInstance().init();

    const socket = useSocket('app');
    socket.emit('init', (user) => {
        // console.log('socket初始化:', user);
    });
    socket.on('notification', (notification) => {
        console.log('收到通知:', notification);
    });
})
