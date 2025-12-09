<template>
    <LayoutListDetail :show-detail="isDetailOpen" @back="handleBack">
        <template #list>
            <div class="flex flex-col h-full bg-base-100 select-none border-r border-base-200">
                <div class="px-5 pt-8 pb-4 shrink-0 space-y-5">
                    <div class="flex items-center justify-between px-1">
                        <h1 class="text-2xl font-extrabold tracking-tight text-base-content">搜索</h1>
                        <div class="text-xs font-medium text-base-content/40 bg-base-200/50 px-2 py-1 rounded-md">⌘ K
                        </div>
                    </div>

                    <div class="relative group">
                        <div
                            class="absolute left-3.5 top-1/2 -translate-y-1/2 text-base-content/30 group-focus-within:text-primary transition-colors duration-300">
                            <Icon name="mingcute:search-3-line" size="18" />
                        </div>
                        <input v-model="searchQuery" type="text" placeholder="搜索用户..."
                            class="w-full h-11 pl-10 pr-9 bg-base-200/40 hover:bg-base-200/70 focus:bg-base-200 focus:ring-2 focus:ring-primary/10 focus:outline-none rounded-2xl text-[15px] font-medium transition-all placeholder:text-base-content/30 text-base-content"
                            @input="handleInput" />
                        <button v-if="searchQuery" @click="clearSearch"
                            class="absolute right-3 top-1/2 -translate-y-1/2 text-base-content/30 hover:text-base-content transition-colors p-0.5">
                            <Icon name="mingcute:close-circle-fill" size="16" />
                        </button>
                    </div>

                    <div class="flex items-center justify-between">
                        <div class="flex items-center gap-1.5 overflow-x-auto no-scrollbar mask-linear-fade py-1">
                            <button v-for="tab in filterTabs" :key="tab.key" @click="activeFilter = tab.key"
                                class="px-3.5 py-1.5 rounded-xl text-[13px] font-semibold transition-all whitespace-nowrap"
                                :class="activeFilter === tab.key
                                    ? 'bg-base-content text-base-100 shadow-sm'
                                    : 'bg-transparent text-base-content/50 hover:bg-base-200/60 hover:text-base-content'">
                                {{ tab.label }}
                            </button>
                        </div>
                        <button class="btn btn-sm btn-circle btn-ghost text-base-content/40 hover:bg-base-200">
                            <Icon name="mingcute:filter-3-line" size="18" />
                        </button>
                    </div>
                </div>

                <div class="flex-1 overflow-y-auto px-3 py-2 scroll-smooth">
                    <div v-if="isLoading" class="space-y-3 px-1">
                        <div v-for="i in 5" :key="i" class="flex items-center gap-4 px-3 py-3.5">
                            <div class="w-11 h-11 rounded-2xl bg-base-200/70 animate-pulse shrink-0"></div>
                            <div class="flex-1 space-y-2">
                                <div class="h-4 bg-base-200/70 rounded w-1/3 animate-pulse"></div>
                                <div class="h-3 bg-base-200/50 rounded w-2/3 animate-pulse"></div>
                            </div>
                        </div>
                    </div>

                    <div v-else-if="filteredList.length > 0" class="space-y-1 pb-10">
                        <div v-for="item in filteredList" :key="item.id" @click="handleItemClick(item)"
                            class="group relative flex items-center gap-4 px-3 py-3.5 rounded-2xl cursor-pointer transition-all duration-200"
                            :class="[
                                isActive(item.id)
                                    ? 'bg-base-200/80'
                                    : 'hover:bg-base-200/40 bg-transparent'
                            ]">

                            <div class="relative shrink-0">
                                <div class="w-11 h-11 rounded-2xl flex items-center justify-center transition-all duration-300 overflow-hidden"
                                    :class="[isActive(item.id) ? 'bg-base-100 shadow-sm scale-100' : 'bg-base-200/50 group-hover:bg-base-200 group-hover:scale-105']">
                                    <img v-if="item.avatar" :src="item.avatar" class="w-full h-full object-cover" />
                                    <Icon v-else :name="item.icon" size="22" class="transition-colors"
                                        :class="isActive(item.id) ? 'text-primary' : 'text-base-content/60'" />
                                </div>
                                <div v-if="item.type === 'contact' && !isActive(item.id)"
                                    class="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-success rounded-full border-[2px] border-base-100">
                                </div>
                            </div>

                            <div class="flex-1 min-w-0 flex flex-col justify-center gap-0.5">
                                <div class="flex items-center justify-between">
                                    <span class="font-semibold text-[15px] truncate leading-tight"
                                        :class="isActive(item.id) ? 'text-base-content' : 'text-base-content/80'"
                                        v-html="highlightText(item.title, searchQuery)"></span>
                                    <span v-if="item.time" class="text-[11px] font-medium text-base-content/30">
                                        {{ item.time }}
                                    </span>
                                </div>
                                <div class="flex items-center justify-between h-4">
                                    <span class="text-[13px] truncate max-w-[180px] leading-tight"
                                        :class="isActive(item.id) ? 'text-base-content/60' : 'text-base-content/40'">
                                        {{ item.subtitle }}
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div v-else class="flex flex-col items-center justify-center h-[60vh] text-base-content/20 gap-4">
                        <div class="w-20 h-20 rounded-3xl bg-base-200/30 flex items-center justify-center">
                            <Icon name="mingcute:box-3-line" size="40" />
                        </div>
                        <p class="text-sm font-medium">无相关结果</p>
                    </div>
                </div>
            </div>
        </template>

        <template #detail>
            <NuxtPage></NuxtPage>
        </template>

        <template #empty>
            <div class="flex flex-col items-center justify-center h-full text-base-content/30 gap-4">
                <div class="w-24 h-24 rounded-full bg-base-200/50 flex items-center justify-center">
                    <Icon name="mingcute:layout-5-line" size="40" />
                </div>
                <span class="text-sm font-medium tracking-wide">选择左侧项目以查看详情</span>
            </div>
        </template>
    </LayoutListDetail>
</template>

<script setup lang="ts">
import * as User from '~/api/user';

definePageMeta({ layout: "main" })

const route = useRoute();
const router = useRouter();

type ItemType = 'module' | 'file' | 'contact' | 'chat' | 'system';

interface SearchItem {
    id: string;
    type: ItemType;
    title: string;
    subtitle: string;
    detailInfo?: string;
    time?: string;
    icon: string;
    iconColor?: string;
    avatar?: string;
    tags?: string[];
}

const searchQuery = ref('');
const activeFilter = ref('all');
const activeItemId = ref<string | null>(null);
const searchResults = ref<SearchItem[]>([]);
const isLoading = ref(false);
let debounceTimer: NodeJS.Timeout | null = null;

const filterTabs = [
    { key: 'all', label: '全部' },
    { key: 'contact', label: '联系人' },
    { key: 'module', label: '应用' },
    { key: 'file', label: '文件' },
];

const isDetailOpen = computed(() => !!route.params.id || !!activeItemId.value);

const selectedItem = computed(() => searchResults.value.find(i => i.id === activeItemId.value));

const filteredList = computed(() => {
    if (activeFilter.value === 'all') return searchResults.value;
    return searchResults.value.filter(item => item.type === activeFilter.value);
});

onMounted(() => {
    initializeState();
});

watch(
    () => route.query.q,
    (newQ) => {
        const newVal = (newQ as string) || '';
        if (newVal !== searchQuery.value) {
            searchQuery.value = newVal;
            performSearch();
        }
    }
);

watch(
    () => route.params.id,
    (newId) => {
        activeItemId.value = (newId as string) || null;
    },
    { immediate: true }
);

function initializeState() {
    if (route.query.q) {
        searchQuery.value = route.query.q as string;
        performSearch();
    }
}

function handleInput() {
    if (debounceTimer) clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
        if (activeItemId.value) {
            activeItemId.value = null;
        }
        router.replace({
            path: '/search',
            query: { q: searchQuery.value }
        });
        performSearch();
    }, 300);
}

function handleBack() {
    activeItemId.value = null;
    router.push({
        path: '/search',
        query: { q: searchQuery.value }
    });
}

function clearSearch() {
    searchQuery.value = '';
    searchResults.value = [];
    activeItemId.value = null;
    router.replace({ path: '/search' });
}

async function performSearch() {
    if (!searchQuery.value.trim()) {
        if (!activeItemId.value) {
            searchResults.value = [];
        }
        return;
    }

    isLoading.value = true;
    try {
        const { data: result, success } = await User.search(searchQuery.value, { page: 1, limit: 50 });
        if (success && result) {
            searchResults.value = result.items.map((user: any) => mapUserToItem(user));
        }
    } catch (error) {
        console.error(error);
    } finally {
        isLoading.value = false;
    }
}

function mapUserToItem(user: any): SearchItem {
    return {
        id: user.id,
        type: 'contact',
        title: user.name || 'Unknown User',
        subtitle: user.email || 'No email provided',
        detailInfo: user.email,
        icon: 'mingcute:user-3-line',
        iconColor: 'text-primary',
        avatar: user.avatar,
        tags: ['用户'],
        time: ''
    };
}

function handleItemClick(item: SearchItem) {
    activeItemId.value = item.id;
    navigateTo({
        path: `/search/user/${item.id}`,
        query: { ...route.query, q: searchQuery.value }
    });
}

function isActive(id: string) {
    return activeItemId.value === id;
}

function getTypeName(type: ItemType) {
    const map: Record<ItemType, string> = {
        module: '应用', file: '文件', contact: '联系人', chat: '会话', system: '设置'
    };
    return map[type] || '未知';
}

function highlightText(text: string, query: string) {
    if (!query) return text;
    const safeQuery = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const reg = new RegExp(`(${safeQuery})`, 'gi');
    return text.replace(reg, '<span class="text-primary font-bold bg-primary/10 px-0.5 rounded-sm">$1</span>');
}
</script>

<style scoped>
.no-scrollbar::-webkit-scrollbar {
    display: none;
}

.no-scrollbar {
    -ms-overflow-style: none;
    scrollbar-width: none;
}

.mask-linear-fade {
    mask-image: linear-gradient(to right, transparent 0%, black 5%, black 95%, transparent 100%);
    -webkit-mask-image: linear-gradient(to right, transparent 0%, black 5%, black 95%, transparent 100%);
}
</style>