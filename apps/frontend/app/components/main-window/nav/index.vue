<template>
    <div class="border-b border-base-content/10 navbar min-h-[3.5rem] px-3 select-none" data-tauri-drag-region>
        <div class="navbar-start" data-tauri-drag-region>
            <span class="font-modernia text-base-content" data-tauri-drag-region>Junc</span>
        </div>
        <div class="navbar-end" data-tauri-drag-region>
            <span v-show="isTauri()" class="flex gap-3">
                <icon @click="minimizeWindow" class="text-base-content/60 hover:text-base-content cursor-pointer"
                    name="mingcute:minimize-line" size="0.9rem"></icon>
                <icon v-if="!maximized" @click="maximizeWindow"
                    class="text-base-content/60 hover:text-base-content cursor-pointer" name="mingcute:square-line"
                    size="0.9rem"></icon>
                <icon v-else @click="unmaximizeWindow"
                    class="text-base-content/60 hover:text-base-content cursor-pointer" name="mingcute:copy-2-line"
                    size="0.9rem"></icon>
                <icon @click="closeWindow" class="text-base-content/60 hover:text-error cursor-pointer"
                    name="mingcute:close-line" size="0.9rem"></icon>
            </span>
        </div>
    </div>
</template>

<script setup lang="ts">
import { getCurrentWindow } from '@tauri-apps/api/window'

const maximized = ref(false)

async function checkMaximized() {
    maximized.value = await getCurrentWindow().isMaximized()
}

async function minimizeWindow() {
    await getCurrentWindow().minimize()
}

async function maximizeWindow() {
    await getCurrentWindow().maximize()
    maximized.value = true
}

async function unmaximizeWindow() {
    await getCurrentWindow().unmaximize()
    maximized.value = false
}

async function closeWindow() {
    await getCurrentWindow().close()
}

onMounted(async () => {
    if (isTauri()) {
        await checkMaximized()
        getCurrentWindow().onResized(async () => {
            maximized.value = await getCurrentWindow().isMaximized()
        })
    }
})
</script>
