<template>

    <div class="border-r border-base-content/10 h-full w-16 flex flex-col items-center py-3 gap-2"
        data-tauri-drag-region>
        <button v-for="item in sortedMenuList" :key="item.id" @click="item.clickHandler()"
            class="btn btn-sm btn-ghost text-base-content/80 hover:text-base-content transition hover:scale-105 hover:rotate-6">
            <icon :name="item.icon" size="1.2rem"></icon>
        </button>
    </div>
</template>

<script lang="ts" setup>
const menubarInstance = MenuBar.getInstance();
const menuList = menubarInstance.getMenuList();
const sortedMenuList = computed(() =>
    [...menuList].sort((a, b) => a.sort - b.sort)
)
</script>