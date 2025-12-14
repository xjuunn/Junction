<script setup lang="ts">
import { getCurrentWindow } from '@tauri-apps/api/window';
const { isDesktop } = useDevice();
const isMaximized = ref(false);
const isTauriEnv = isTauri();

onMounted(async () => {
    if (isTauriEnv) {
        const appWindow = getCurrentWindow();
        isMaximized.value = await appWindow.isMaximized();
        await appWindow.onResized(async () => {
            isMaximized.value = await appWindow.isMaximized();
        });
    }
});

const minimizeWindow = async () => {
    if (isTauriEnv) await getCurrentWindow().minimize();
};

const toggleMaximize = async () => {
    if (!isTauriEnv) return;
    const appWindow = getCurrentWindow();
    if (isMaximized.value) {
        await appWindow.unmaximize();
    } else {
        await appWindow.maximize();
    }
    isMaximized.value = await appWindow.isMaximized();
};

const closeWindow = async () => {
    if (isTauriEnv) await getCurrentWindow().close();
};
</script>
<template>
    <div v-if="isTauriEnv" data-tauri-drag-region
        class="flex items-center justify-between h-7 min-h-0 px-3 backdrop-blur select-none z-50 shrink-0">
        <div class="flex-1 h-full" data-tauri-drag-region></div>
        <div class="flex items-center gap-1.5 shrink-0" data-tauri-drag-region>
            <span v-if="isTauriEnv && isDesktop" class="flex items-center gap-1">
                <button @click="minimizeWindow"
                    class="btn btn-ghost btn-square btn-xs w-6 h-6 min-h-0 rounded-md text-base-content/60 hover:text-base-content border-none shadow-none">
                    <Icon name="mingcute:minimize-line" size="12" />
                </button>
                <button @click="toggleMaximize"
                    class="btn btn-ghost btn-square btn-xs w-6 h-6 min-h-0 rounded-md text-base-content/60 hover:text-base-content border-none shadow-none">
                    <Icon :name="isMaximized ? 'mingcute:copy-2-line' : 'mingcute:square-line'" size="11" />
                </button>
                <button @click="closeWindow"
                    class="btn btn-ghost btn-square btn-xs w-6 h-6 min-h-0 rounded-md text-base-content/60 hover:bg-error hover:text-error-content border-none shadow-none">
                    <Icon name="mingcute:close-line" size="12" />
                </button>
            </span>
        </div>
    </div>
</template>