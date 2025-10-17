<template>
    <div class="grid grid-cols-4">
        <!-- <label class="swap swap-rotate">
            <input type="checkbox" @change="themeChange">
            <icon name="mingcute:sun-line" size="2rem" class="swap-on"></icon>
            <icon name="mingcute:moon-line" size="2rem" class="swap-off"></icon>
        </label> -->
        <div v-for="item in 50">
            <button class="btn btn-primary" @click="toggleTheme">test</button>
        </div>
    </div>
</template>

<script setup lang="ts">
definePageMeta({
    layout: 'main-window'
})
import { type } from '@tauri-apps/plugin-os';
// function themeChange(e: Event) {
//     const target = e.target as HTMLInputElement;
//     const html = document.getElementsByTagName('html')[0];
//     if (target.checked) {
//         if (html && isTauri() && (type() === 'windows' || type() === 'macos'))
//             html.style.background = 'transparent';
//     } else {
//         if (html && isTauri() && (type() === 'windows' || type() === 'macos'))
//             html.style.background = '';
//     }
// }
const theme = AppTheme.getInstance()
const toggleTheme = (event: MouseEvent) => {
    // 获取点击位置作为波纹中心
    const pos = { x: event.clientX, y: event.clientY }
    theme.toggleTheme(pos)
}
</script>
