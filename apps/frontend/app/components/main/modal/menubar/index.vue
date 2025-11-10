<template>
    <div v-if="!md" class="dock bg-transparent">
        <button :class="{
            'dock-active': route.path === item.path
        }" v-for="item in sortedMenuList" :key="item.id" @click="item.clickHandler()" v-motion-pop-visible-once>
            <icon :name="item.icon" size="1.2rem"></icon>
            <span class="dock-label">{{ item.name }}</span>
        </button>
    </div>
</template>

<script lang="ts" setup>
const { md } = useTailwindBreakpoints();
const menubarInstance = MenuBar.getInstance();
const menuList = menubarInstance.getMenuList();
const sortedMenuList = computed(() =>
    [...menuList].sort((a, b) => a.sort - b.sort)
)
const route = useRoute();

</script>