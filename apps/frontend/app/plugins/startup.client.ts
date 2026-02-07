export default defineNuxtPlugin(async (nuxtApp) => {
    const html = document.getElementsByTagName('html')[0];
    await AppTheme.getInstance().init();

    const socket = useSocket('app');
    socket.emit('init', (user) => {
        useUserStore().setUser(user);
    });
    socket.on('new-notification', (notification) => {
        console.log('收到通知:', notification);
        if (notification.content)
            useToast().info(notification.content)
    });
    
})
