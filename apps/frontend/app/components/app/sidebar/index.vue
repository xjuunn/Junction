<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { menuService } from '~/core/menu';
const userStore = useUserStore();
const route = useRoute();
const router = useRouter();
const groups = menuService.getGroupedMenus();
const isActive = (path?: string) => {
    if (!path) return false;
    return path === '/' ? route.path === '/' : route.path.startsWith(path);
};

const handleItemClick = (item: any) => {
    item.click();
};

const isCollapsed = ref(false);
const searchQuery = ref('');

const toggleSidebar = () => {
    isCollapsed.value = !isCollapsed.value;
};

const handleSearch = () => {
    if (searchQuery.value.trim()) {
        router.push({ path: '/search', query: { q: searchQuery.value } });
    }
};

const handleIconClick = () => {
    if (isCollapsed.value) {
        router.push('/search');
    }
};

onMounted(() => {
    menuService.add({
        id: 'fold',
        name: '折叠',
        icon: 'mingcute:layout-right-line',
        group: 'system',
        show: isCollapsed,
        handler: toggleSidebar
    })
    if (window.innerWidth < 1280) {
        isCollapsed.value = true;
    }
    window.addEventListener('resize', () => {
        if (window.innerWidth < 1280 && !isCollapsed.value) {
            isCollapsed.value = true;
        } else if (window.innerWidth >= 1280 && isCollapsed.value) {
            isCollapsed.value = false;
        }
    });
});

onUnmounted(() => {
    menuService.remove('fold');
})
</script>

<template>
    <div class="flex flex-col h-full bg-base-200 text-base-content rounded-box py-4 select-none overflow-y-auto overflow-x-hidden font-sans border border-base-content/5 transition-[width] duration-200 ease-in-out will-change-[width]"
        :class="isCollapsed ? 'w-20' : 'w-80'">
        <!-- ================= User Profile ================= -->
        <div class="flex items-center mb-6 px-2 pt-2 shrink-0 transition-all duration-300"
            :class="isCollapsed ? 'justify-center px-2' : 'justify-between px-5'">
            <div class="flex items-center transition-all duration-300" :class="isCollapsed ? 'gap-0' : 'gap-3'">
                <!-- 头像 -->
                <BaseAvatar :text="userStore.user.value?.name" :src="resolveAssetUrl(userStore.user.value?.image)"
                    :placeholder-length="2" size="42px" />
                <!-- 信息 -->
                <div class="flex flex-col justify-center gap-0.5 overflow-hidden transition-all duration-300 whitespace-nowrap"
                    :class="isCollapsed ? 'w-0 opacity-0' : 'w-auto opacity-100'">
                    <div class="flex items-center gap-2">
                        <span class="text-sm font-bold text-base-content">{{ userStore.user.value?.name }}</span>
                        <span
                            class="badge badge-sm badge-success badge-soft border-base-content/10 text-[10px] h-5 px-1.5 font-medium text-base-content/60">
                            在线
                        </span>
                    </div>
                    <div class="text-xs text-base-content/50">{{ userStore.user.value?.email }}</div>
                </div>
            </div>
            <!-- 图标按钮 -->
            <div class="flex items-center gap-1 overflow-hidden transition-all duration-300"
                :class="isCollapsed ? 'w-0 opacity-0' : 'w-auto opacity-100'">
                <nuxt-link to="/notification"
                    class="btn btn-square btn-ghost btn-sm text-base-content/60 hover:text-base-content">
                    <Icon name="mingcute:notification-line" size="18" />
                </nuxt-link>
                <button class="btn btn-square btn-ghost btn-sm text-base-content/60 hover:text-base-content"
                    @click="toggleSidebar">
                    <Icon name="mingcute:layout-left-line" size="18" />
                </button>
            </div>
        </div>

        <!-- ================= Search ================= -->
        <div class="pb-4 shrink-0 transition-all duration-300" :class="isCollapsed ? 'px-2' : 'px-5'">
            <div class="relative group flex" :class="isCollapsed ? 'justify-center' : 'block'">
                <div class="flex items-center justify-center text-base-content/50 group-focus-within:text-base-content/80 transition-colors z-10"
                    :class="[
                        isCollapsed ? 'static w-10 h-10 cursor-pointer' : 'absolute inset-y-0 left-3 pointer-events-none'
                    ]" @click="handleIconClick">
                    <Icon name="mingcute:search-line" size="18" />
                </div>
                <input type="text" placeholder="搜索" v-model="searchQuery" @keydown.enter="handleSearch"
                    class="input input-sm h-10 bg-base-300 focus:bg-base-100 rounded-xl border-transparent focus:border-base-content/10 placeholder:text-base-content/40 transition-all duration-300 p-0 text-sm"
                    :class="isCollapsed ? 'w-0 opacity-0 pl-0 pr-0' : 'w-full opacity-100 pl-10 pr-12'">
                <div class="absolute inset-y-0 right-3 flex items-center pointer-events-none transition-opacity duration-300"
                    :class="isCollapsed ? 'opacity-0' : 'opacity-100'">
                    <kbd
                        class="kbd kbd-sm bg-base-100 border-base-content/10 text-[10px] min-h-[20px] h-[20px] px-1.5 text-base-content/50 font-sans">
                        ⌘K
                    </kbd>
                </div>
            </div>
        </div>

        <!-- ================= Main Menu ================= -->
        <nav class="flex flex-col gap-1 mb-8 transition-all duration-300" :class="isCollapsed ? 'px-2' : 'px-4'">
            <template v-if="groups['main']">
                <div v-for="item in groups['main']" :key="item.id" @click="handleItemClick(item)"
                    v-show="item.getShouldShow"
                    class="flex items-center py-2.5 rounded-xl cursor-pointer transition-all duration-200 group h-10"
                    :class="[
                        isActive(item.path)
                            ? 'bg-base-100 text-base-content shadow-sm'
                            : 'text-base-content/60 hover:bg-base-content/5 hover:text-base-content',
                        isCollapsed ? 'justify-center px-0' : 'justify-start px-3 gap-3',
                        item.extraClass
                    ]">
                    <Icon :name="item.icon" size="20" class="transition-colors shrink-0"
                        :class="isActive(item.path) ? 'text-base-content' : 'group-hover:text-base-content'" />

                    <span
                        class="text-sm font-medium overflow-hidden transition-all duration-300 whitespace-nowrap delay-75"
                        :class="isCollapsed ? 'w-0 opacity-0' : 'w-auto opacity-100'">
                        {{ item.name }}
                    </span>

                    <span v-if="item.meta?.badge"
                        class="ml-auto badge badge-sm h-5 min-w-[1.25rem] border-none flex items-center justify-center rounded-full text-[10px] font-bold text-white overflow-hidden transition-all duration-300"
                        :class="[
                            item.meta.badgeColor || 'badge-primary',
                            isCollapsed ? 'w-0 opacity-0' : 'w-auto opacity-100'
                        ]">
                        {{ item.meta.badge }}
                    </span>

                    <span v-if="item.meta?.badge && isCollapsed"
                        class="absolute top-2 right-2 w-2 h-2 rounded-full bg-error border border-base-200"></span>
                </div>
            </template>
        </nav>

        <div class="flex-1"></div>

        <!-- ================= Footer (System Menu) ================= -->
        <div class="flex flex-col gap-1 transition-all duration-300" :class="isCollapsed ? 'px-2' : 'px-4'">
            <template v-if="groups['system']">
                <div v-for="item in groups['system']" :key="item.id" @click="handleItemClick(item)"
                    v-show="item.getShouldShow"
                    class="flex items-center py-2 rounded-xl cursor-pointer transition-colors group h-10" :class="[
                        isActive(item.path)
                            ? 'bg-base-100 text-base-content'
                            : 'text-base-content/60 hover:bg-base-content/5 hover:text-base-content',
                        isCollapsed ? 'justify-center px-0' : 'justify-start px-3 gap-3',
                        item.extraClass,
                    ]">
                    <Icon :name="item.icon" size="20" class="transition-colors shrink-0"
                        :class="isActive(item.path) ? 'text-base-content' : 'group-hover:text-base-content'" />
                    <span
                        class="text-sm font-medium overflow-hidden transition-all duration-300 whitespace-nowrap delay-75"
                        :class="isCollapsed ? 'w-0 opacity-0' : 'w-auto opacity-100'">
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
