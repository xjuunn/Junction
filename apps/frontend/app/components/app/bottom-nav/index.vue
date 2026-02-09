<script setup lang="ts">
import { useRoute } from 'vue-router';
import { menuService } from '~/core/menu';

const route = useRoute();
const groups = menuService.getGroupedMenus();

const isActive = (path?: string) => {
    if (!path) return false;
    return path === '/' ? route.path === '/' : route.path.startsWith(path);
};

const handleItemClick = (item: any) => {
    item.click();
};
</script>

<template>
    <div
        class="fixed bottom-0 left-0 right-0 z-50 bg-base-100/80 backdrop-blur-xl border-t border-base-content/5 pb-[env(safe-area-inset-bottom)] transition-all duration-300">
        <div class="flex items-center justify-around h-16 px-1">
            <template v-if="groups['main']">
                <button v-for="item in groups['main']" :key="item.id" v-show="item.getShouldShow"
                    @click="handleItemClick(item)"
                    class="relative flex pb-1 flex-1 flex-col items-center justify-center gap-1 h-full cursor-pointer select-none group active:scale-95 transition-transform duration-200 ease-out">
                    <div class="relative z-10 p-0.5 transition-transform duration-300"
                        :class="isActive(item.path) ? '-translate-y-0.5' : 'translate-y-0.5'">
                        <Icon :name="item.icon" size="24" class="transition-colors duration-300"
                            :class="isActive(item.path) ? 'text-primary' : 'text-base-content/40 group-hover:text-base-content/60'" />
                        <span v-if="item.meta?.badge"
                            class="absolute top-0 right-0 min-w-[8px] h-2 rounded-full bg-error ring-2 ring-base-100 animate-pulse">
                        </span>
                    </div>
                    <span class="z-10 text-[10px] font-medium tracking-wide transition-all duration-300" :class="[
                        isActive(item.path)
                            ? 'text-base-content font-bold translate-y-0 opacity-100'
                            : 'text-base-content/40 translate-y-1 opacity-80 group-hover:text-base-content/60'
                    ]">
                        {{ item.name }}
                    </span>
                </button>
            </template>
        </div>
    </div>
</template>
