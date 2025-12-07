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
        class="flex flex-col h-full w-80 bg-base-200 text-base-content rounded-box p-4 select-none overflow-y-auto font-sans border border-base-content/5">

        <!-- ================= User Profile ================= -->
        <div class="flex items-center justify-between mb-6 px-1 pt-2">
            <div class="flex items-center gap-3">
                <!-- 头像 -->
                <div class="avatar avatar-placeholder">
                    <div class="bg-success text-success-content rounded-full w-11 h-11">
                        <span class="text-sm font-bold">Jun</span>
                    </div>
                </div>
                <!-- 信息 -->
                <div class="flex flex-col justify-center gap-0.5">
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
            <div class="flex items-center gap-1">
                <button class="btn btn-square btn-ghost btn-sm text-base-content/60 hover:text-base-content">
                    <Icon name="mingcute:notification-line" size="18" />
                </button>
                <button class="btn btn-square btn-ghost btn-sm text-base-content/60 hover:text-base-content">
                    <Icon name="mingcute:layout-left-line" size="18" />
                </button>
            </div>
        </div>

        <!-- ================= Search ================= -->
        <div
            class="input input-sm h-10 bg-base-300 focus:bg-base-100 rounded-xl relative w-full mb-6 group border-transparent focus:border-base-content/10 placeholder:text-base-content/40 transition-all">
            <div
                class="absolute inset-y-0 left-3 flex items-center pointer-events-none text-base-content/50 group-focus-within:text-base-content/80 transition-colors">
                <Icon name="mingcute:search-line" size="18" />
            </div>
            <input type="text" placeholder="搜索" class="pl-10 pr-12 text-sm">
            <div class="absolute inset-y-0 right-3 flex items-center pointer-events-none">
                <kbd
                    class="kbd kbd-sm bg-base-100 border-base-content/10 text-[10px] min-h-[20px] h-[20px] px-1.5 text-base-content/50 font-sans">
                    ⌘K
                </kbd>
            </div>
        </div>

        <!-- ================= Main Menu ================= -->
        <nav class="flex flex-col gap-1 mb-8">
            <template v-if="groups['main']">
                <div v-for="item in groups['main']" :key="item.id" @click="handleItemClick(item)"
                    class="flex items-center gap-3 px-3 py-2.5 rounded-xl cursor-pointer transition-all duration-200 group"
                    :class="[
                        isActive(item.path)
                            ? 'bg-base-100 text-base-content shadow-sm'
                            : 'text-base-content/60 hover:bg-base-content/5 hover:text-base-content'
                    ]">
                    <Icon :name="item.icon" size="20" class="transition-colors"
                        :class="isActive(item.path) ? 'text-base-content' : 'group-hover:text-base-content'" />
                    <span class="text-sm font-medium">{{ item.name }}</span>

                    <!-- 动态 Badge (例如 Inbox 的 3) -->
                    <span v-if="item.meta?.badge"
                        class="ml-auto badge badge-sm h-5 min-w-[1.25rem] border-none flex items-center justify-center rounded-full text-[10px] font-bold text-white"
                        :class="item.meta.badgeColor || 'badge-primary'">
                        {{ item.meta.badge }}
                    </span>
                </div>
            </template>
        </nav>
        <div class="flex-1">

        </div>

        <!-- ================= Help Card ================= -->
        <div
            class="card bg-base-300/50 border border-base-content/5 shadow-none rounded-2xl mt-6 p-4 relative overflow-hidden">
            <!-- Close Button -->
            <button
                class="btn btn-circle btn-ghost btn-xs absolute top-2 right-2 text-base-content/40 hover:text-base-content z-10">
                <Icon name="mingcute:close-line" size="14" />
            </button>

            <div
                class="w-8 h-8 rounded-full bg-base-300 flex items-center justify-center text-base-content/70 mb-3 border border-base-content/5">
                <Icon name="mingcute:mail-line" size="16" />
            </div>

            <h3 class="text-sm font-bold text-base-content mb-1">Have questions?</h3>
            <p class="text-xs text-base-content/50 mb-3 leading-relaxed">
                Feel free to reach out to us via email or support page
            </p>

            <button
                class="btn btn-sm btn-block bg-base-100 hover:bg-base-100/80 border-base-content/5 text-base-content shadow-sm text-xs h-9 min-h-0 normal-case rounded-lg">
                Reach out
            </button>
        </div>

        <!-- ================= Footer (System Menu) ================= -->
        <div class="flex flex-col gap-1 mt-4 pt-2">
            <template v-if="groups['system']">
                <div v-for="item in groups['system']" :key="item.id" @click="handleItemClick(item)"
                    class="flex items-center gap-3 px-3 py-2 rounded-xl cursor-pointer transition-colors group" :class="[
                        isActive(item.path)
                            ? 'bg-base-100 text-base-content'
                            : 'text-base-content/60 hover:bg-base-content/5 hover:text-base-content'
                    ]">
                    <Icon :name="item.icon" size="20" class="transition-colors"
                        :class="isActive(item.path) ? 'text-base-content' : 'group-hover:text-base-content'" />
                    <span class="text-sm font-medium">{{ item.name }}</span>
                </div>
            </template>
        </div>

    </div>
</template>

<style scoped>
/* 可选：隐藏滚动条但保留功能 */
.overflow-y-auto::-webkit-scrollbar {
    width: 4px;
}

.overflow-y-auto::-webkit-scrollbar-track {
    background: transparent;
}

.overflow-y-auto::-webkit-scrollbar-thumb {
    background-color: transparent;
    border-radius: 20px;
}

.overflow-y-auto:hover::-webkit-scrollbar-thumb {
    background-color: oklch(var(--bc) / 0.1);
}
</style>