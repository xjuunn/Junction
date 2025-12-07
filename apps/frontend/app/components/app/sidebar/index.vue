<script setup lang="ts">
import { useRoute } from 'vue-router';
import { menuService } from '~/core/menu';

const route = useRoute();
const groups = menuService.getGroupedMenus();
const isActive = (path?: string) => {
    if (!path) return false;
    return route.path === path;
};

const handleItemClick = (item: any) => {
    item.click();
};
</script>

<template>
    <div
        class="flex flex-col h-full w-20 xl:w-80 bg-base-200 text-base-content rounded-box py-4 select-none overflow-y-auto overflow-x-hidden font-sans border border-base-content/5 transition-[width] duration-300 ease-in-out">

        <!-- ================= User Profile ================= -->
        <div
            class="flex items-center justify-center xl:justify-between mb-6 px-2 xl:px-5 pt-2 shrink-0 transition-all duration-300">
            <div class="flex items-center gap-0 xl:gap-3 transition-all duration-300">
                <!-- 头像 -->
                <div class="avatar avatar-placeholder shrink-0">
                    <div
                        class="bg-success text-success-content rounded-full w-10 h-10 xl:w-11 xl:h-11 transition-all duration-300">
                        <span class="text-sm font-bold">Jun</span>
                    </div>
                </div>
                <!-- 信息 -->
                <div
                    class="flex flex-col justify-center gap-0.5 w-0 xl:w-auto overflow-hidden opacity-0 xl:opacity-100 transition-all duration-300 whitespace-nowrap">
                    <div class="flex items-center gap-2">
                        <span class="text-sm font-bold text-base-content">Junhsiun</span>
                        <span
                            class="badge badge-sm badge-success badge-soft border-base-content/10 text-[10px] h-5 px-1.5 font-medium text-base-content/60">
                            在线
                        </span>
                    </div>
                    <div class="text-xs text-base-content/50">xjuunn@gmail.com</div>
                </div>
            </div>
            <!-- 图标按钮 -->
            <div
                class="flex items-center gap-1 w-0 xl:w-auto overflow-hidden opacity-0 xl:opacity-100 transition-all duration-300">
                <button class="btn btn-square btn-ghost btn-sm text-base-content/60 hover:text-base-content">
                    <Icon name="mingcute:notification-line" size="18" />
                </button>
                <button class="btn btn-square btn-ghost btn-sm text-base-content/60 hover:text-base-content">
                    <Icon name="mingcute:layout-left-line" size="18" />
                </button>
            </div>
        </div>

        <!-- ================= Search ================= -->
        <div class="px-2 hidden xl:block pb-4 shrink-0 transition-all duration-300">
            <div class="relative group flex justify-center xl:block">
                <div
                    class="xl:absolute xl:inset-y-0 xl:left-3 flex items-center justify-center pointer-events-none text-base-content/50 group-focus-within:text-base-content/80 transition-colors w-10 xl:w-auto h-10 xl:h-auto">
                    <Icon name="mingcute:search-line" size="18" />
                </div>
                <input type="text" placeholder="搜索"
                    class="input input-sm h-10 w-0 xl:w-full bg-transparent xl:bg-base-300 xl:focus:bg-base-100 rounded-xl pl-0 xl:pl-10 pr-0 xl:pr-12 border-transparent focus:border-base-content/10 placeholder:text-base-content/40 transition-all duration-300 opacity-0 xl:opacity-100 p-0 text-sm">
                <div
                    class="absolute inset-y-0 right-3 flex items-center pointer-events-none opacity-0 xl:opacity-100 transition-opacity duration-300">
                    <kbd
                        class="kbd kbd-sm bg-base-100 border-base-content/10 text-[10px] min-h-[20px] h-[20px] px-1.5 text-base-content/50 font-sans">
                        ⌘K
                    </kbd>
                </div>
            </div>
        </div>

        <!-- ================= Main Menu ================= -->
        <nav class="flex flex-col gap-1 mb-8 px-2 xl:px-4 transition-all duration-300">
            <template v-if="groups['main']">
                <div v-for="item in groups['main']" :key="item.id" @click="handleItemClick(item)"
                    class="flex items-center justify-center xl:justify-start gap-0 xl:gap-3 px-0 xl:px-3 py-2.5 rounded-xl cursor-pointer transition-all duration-200 group h-10"
                    :class="[
                        isActive(item.path)
                            ? 'bg-base-100 text-base-content shadow-sm'
                            : 'text-base-content/60 hover:bg-base-content/5 hover:text-base-content'
                    ]">
                    <Icon :name="item.icon" size="20" class="transition-colors shrink-0"
                        :class="isActive(item.path) ? 'text-base-content' : 'group-hover:text-base-content'" />

                    <span
                        class="text-sm font-medium w-0 xl:w-auto overflow-hidden opacity-0 xl:opacity-100 transition-all duration-300 whitespace-nowrap delay-75">
                        {{ item.name }}
                    </span>

                    <!-- 动态 Badge -->
                    <span v-if="item.meta?.badge"
                        class="ml-auto badge badge-sm h-5 min-w-[1.25rem] border-none flex items-center justify-center rounded-full text-[10px] font-bold text-white w-0 xl:w-auto overflow-hidden opacity-0 xl:opacity-100 transition-all duration-300"
                        :class="item.meta.badgeColor || 'badge-primary'">
                        {{ item.meta.badge }}
                    </span>

                    <!-- 折叠状态下的红点 -->
                    <span v-if="item.meta?.badge"
                        class="absolute top-2 right-2 w-2 h-2 rounded-full bg-error border border-base-200 xl:hidden"></span>
                </div>
            </template>
        </nav>

        <div class="flex-1"></div>

        <!-- ================= Help Card ================= -->
        <div class="px-2 xl:px-4 transition-all duration-300">
            <div
                class="card bg-base-300/50 border border-base-content/5 shadow-none rounded-2xl mt-6 p-0 xl:p-4 relative overflow-hidden transition-all duration-300 w-0 xl:w-auto h-0 xl:h-auto opacity-0 xl:opacity-100">
                <!-- Close Button -->
                <button
                    class="btn btn-circle btn-ghost btn-xs absolute top-2 right-2 text-base-content/40 hover:text-base-content z-10">
                    <Icon name="mingcute:close-line" size="14" />
                </button>

                <div
                    class="w-8 h-8 rounded-full bg-base-300 flex items-center justify-center text-base-content/70 mb-3 border border-base-content/5">
                    <Icon name="mingcute:mail-line" size="16" />
                </div>

                <h3 class="text-sm font-bold text-base-content mb-1 whitespace-nowrap">Have questions?</h3>
                <p class="text-xs text-base-content/50 mb-3 leading-relaxed whitespace-nowrap">
                    Feel free to reach out...
                </p>

                <button
                    class="btn btn-sm btn-block bg-base-100 hover:bg-base-100/80 border-base-content/5 text-base-content shadow-sm text-xs h-9 min-h-0 normal-case rounded-lg whitespace-nowrap">
                    Reach out
                </button>
            </div>
        </div>

        <!-- ================= Footer (System Menu) ================= -->
        <div class="flex flex-col gap-1 mt-4 pt-2 px-2 xl:px-4 transition-all duration-300">
            <template v-if="groups['system']">
                <div v-for="item in groups['system']" :key="item.id" @click="handleItemClick(item)"
                    class="flex items-center justify-center xl:justify-start gap-0 xl:gap-3 px-0 xl:px-3 py-2 rounded-xl cursor-pointer transition-colors group h-10"
                    :class="[
                        isActive(item.path)
                            ? 'bg-base-100 text-base-content'
                            : 'text-base-content/60 hover:bg-base-content/5 hover:text-base-content'
                    ]">
                    <Icon :name="item.icon" size="20" class="transition-colors shrink-0"
                        :class="isActive(item.path) ? 'text-base-content' : 'group-hover:text-base-content'" />
                    <span
                        class="text-sm font-medium w-0 xl:w-auto overflow-hidden opacity-0 xl:opacity-100 transition-all duration-300 whitespace-nowrap delay-75">
                        {{ item.name }}
                    </span>
                </div>
            </template>
        </div>

    </div>
</template>

<style scoped>
.overflow-y-auto::-webkit-scrollbar {
    width: 0px;
}
</style>