<template>
    <div>
        <button class="btn btn-primary" @click="btnAdd">添加</button>
        <button class="btn btn-primary" @click="btnRemove">移除</button>
    </div>
</template>

<script setup lang="ts">
definePageMeta({
    layout: 'main-window'
})
function btnAdd() {
    MenuBar.getInstance().addMenuItem(new MenuItem(6, 'test', 'mingcute:chat-4-fill', () => console.log("test")))
}
function btnRemove() {
    MenuBar.getInstance().removeMenuItem(6);
}
</script>
