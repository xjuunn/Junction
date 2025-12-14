export default defineNuxtPlugin(async (nuxtApp) => {
    const html = document.getElementsByTagName('html')[0];
    if (html) html.addEventListener('contextmenu', e => e.preventDefault())
    await AppTheme.getInstance().init();

    const socket = useSocket('app');
    socket.emit('init', (user) => {
        // console.log('socket初始化:', user);
        useUserStore().setUser(user);
    });
    socket.on('new-notification', (notification) => {
        console.log('收到通知:', notification);
        if (notification.content)
            useToast().info(notification.content)
    });
})
