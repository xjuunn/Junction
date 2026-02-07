export default defineNuxtPlugin(async (nuxtApp) => {
    const html = document.getElementsByTagName('html')[0];
    await AppTheme.getInstance().init();

    const userStore = useUserStore();
    if (userStore.authToken.value) {
        try {
            await userStore.refresh();
        } catch {
            userStore.clearAuth();
        }
    } else {
        userStore.markAuthChecked();
    }

    const socket = useSocket('app');
    socket.emit('init', (user) => {
        userStore.setUser(user);
    });
    socket.on('new-notification', (notification) => {
        console.log('收到通知:', notification);
        if (notification.content)
            useToast().info(notification.content)
    });
    
})
