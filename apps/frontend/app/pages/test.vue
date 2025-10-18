<template>
    <div class="grid grid-cols-4">
        <button class="btn btn-primary" @click="test">test</button>
    </div>
</template>

<script setup lang="ts">
definePageMeta({
    layout: 'main-window'
})
import { Window } from '@tauri-apps/api/window';
async function test() {
    const win = await Window.getByLabel('main');
    console.log(win);

}
</script>
