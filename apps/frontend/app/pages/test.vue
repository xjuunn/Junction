<template>
    <div class="grid grid-cols-4">
        <!-- <label class="swap swap-rotate">
            <input type="checkbox" @change="themeChange">
            <icon name="mingcute:sun-line" size="2rem" class="swap-on"></icon>
            <icon name="mingcute:moon-line" size="2rem" class="swap-off"></icon>
        </label> -->
        <button class="btn btn-primary" @click="toggleTheme">toggleTheme</button>
        <button class="btn btn-primary" @click="test">test</button>

    </div>
</template>

<script setup lang="ts">
import { Window } from '@tauri-apps/api/window'
definePageMeta({
    layout: 'main-window'
})
const theme = AppTheme.getInstance()
const toggleTheme = (event: MouseEvent) => {
    // 获取点击位置作为波纹中心
    const pos = { x: event.clientX, y: event.clientY }
    theme.toggleTheme(pos)
}
let isTrans = false;
async function test() {
    isTrans = !isTrans;
    theme.setBgTransparent(isTrans);

}
</script>
