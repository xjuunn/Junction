<template>
    <LayoutListDetail :show-detail="isDetailOpen" @back="router.back()">
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
                        <input v-model="searchQuery" @input="updateUrlQuery" type="text" placeholder="搜索..."
                            class="w-full h-11 pl-10 pr-9 bg-base-200/40 hover:bg-base-200/70 focus:bg-base-200 focus:ring-2 focus:ring-primary/10 focus:outline-none rounded-2xl text-[15px] font-medium transition-all placeholder:text-base-content/30 text-base-content" />
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
                    <div v-if="filteredList.length > 0" class="space-y-1 pb-10">
                        <div v-for="item in filteredList" :key="item.id" @click="handleItemClick(item)"
                            class="group relative flex items-center gap-4 px-3 py-3.5 rounded-2xl cursor-pointer transition-all duration-200"
                            :class="[
                                activeItemId === item.id
                                    ? 'bg-base-200/80'
                                    : 'hover:bg-base-200/40 bg-transparent'
                            ]">

                            <div class="relative shrink-0">
                                <div class="w-11 h-11 rounded-2xl flex items-center justify-center transition-all duration-300 overflow-hidden"
                                    :class="[activeItemId === item.id ? 'bg-base-100 shadow-sm scale-100' : 'bg-base-200/50 group-hover:bg-base-200 group-hover:scale-105']">
                                    <img v-if="item.avatar" :src="item.avatar" class="w-full h-full object-cover" />
                                    <Icon v-else :name="item.icon" size="22" class="transition-colors"
                                        :class="activeItemId === item.id ? 'text-primary' : 'text-base-content/60'" />
                                </div>
                                <div v-if="item.type === 'contact' && activeItemId !== item.id"
                                    class="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-success rounded-full border-[2px] border-base-100">
                                </div>
                            </div>

                            <div class="flex-1 min-w-0 flex flex-col justify-center gap-0.5">
                                <div class="flex items-center justify-between">
                                    <span class="font-semibold text-[15px] truncate leading-tight"
                                        :class="activeItemId === item.id ? 'text-base-content' : 'text-base-content/80'"
                                        v-html="highlightText(item.title, searchQuery)"></span>
                                    <span v-if="item.time" class="text-[11px] font-medium text-base-content/30">
                                        {{ item.time }}
                                    </span>
                                </div>
                                <div class="flex items-center justify-between h-4">
                                    <span class="text-[13px] truncate max-w-[180px] leading-tight"
                                        :class="activeItemId === item.id ? 'text-base-content/60' : 'text-base-content/40'">
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
                        <p class="text-sm font-medium">无搜索结果</p>
                    </div>
                </div>
            </div>
        </template>

        <template #detail>
            <div class="flex flex-col h-full bg-base-100 relative">
                <div v-if="selectedItem"
                    class="shrink-0 px-10 py-8 bg-base-100/80 backdrop-blur-xl z-20 border-b border-base-100">
                    <div class="max-w-3xl mx-auto w-full">
                        <div class="flex items-start gap-6 mb-8">
                            <div
                                class="w-20 h-20 rounded-[24px] shadow-sm bg-base-200/50 flex items-center justify-center overflow-hidden shrink-0 ring-1 ring-base-content/5">
                                <img v-if="selectedItem.avatar" :src="selectedItem.avatar"
                                    class="w-full h-full object-cover" />
                                <Icon v-else :name="selectedItem.icon" size="40"
                                    :class="selectedItem.iconColor || 'text-base-content/70'" />
                            </div>

                            <div class="flex-1 pt-1 min-w-0">
                                <div class="flex items-center justify-between mb-2">
                                    <div class="flex items-center gap-2">
                                        <span
                                            class="px-2.5 py-1 rounded-lg bg-base-200/60 text-base-content/60 text-[11px] font-bold uppercase tracking-wider">
                                            {{ getTypeName(selectedItem.type) }}
                                        </span>
                                        <span v-if="selectedItem.tags" v-for="tag in selectedItem.tags" :key="tag"
                                            class="px-2.5 py-1 rounded-lg border border-base-content/10 text-base-content/50 text-[11px] font-medium">
                                            {{ tag }}
                                        </span>
                                    </div>
                                    <div class="flex gap-1">
                                        <button
                                            class="btn btn-sm btn-square btn-ghost text-base-content/40 hover:text-base-content hover:bg-base-200 rounded-lg">
                                            <Icon name="mingcute:share-forward-line" size="18" />
                                        </button>
                                        <button
                                            class="btn btn-sm btn-square btn-ghost text-base-content/40 hover:text-base-content hover:bg-base-200 rounded-lg">
                                            <Icon name="mingcute:more-2-line" size="18" />
                                        </button>
                                    </div>
                                </div>
                                <h1 class="text-3xl font-extrabold text-base-content tracking-tight mb-1">{{
                                    selectedItem.title }}</h1>
                                <p class="text-base text-base-content/50 font-medium truncate">{{
                                    selectedItem.detailInfo || selectedItem.subtitle }}</p>
                            </div>
                        </div>

                        <div class="flex items-center gap-3">
                            <button
                                class="btn btn-neutral rounded-xl px-6 min-w-[140px] shadow-sm hover:shadow-md transition-all gap-2 h-11 border-none">
                                <Icon :name="getPrimaryAction(selectedItem.type).icon" size="18" />
                                <span class="font-bold">{{ getPrimaryAction(selectedItem.type).label }}</span>
                            </button>

                            <button v-for="action in getSecondaryActions(selectedItem.type)" :key="action.label"
                                class="btn btn-ghost bg-base-200/50 hover:bg-base-200 rounded-xl px-5 h-11 text-base-content/70 font-medium gap-2 border-none">
                                <Icon :name="action.icon" size="18" />
                                {{ action.label }}
                            </button>
                        </div>
                    </div>
                </div>

                <div class="flex-1 overflow-y-auto bg-base-50/50">
                    <div class="max-w-3xl mx-auto w-full p-10">
                        <NuxtPage />
                    </div>
                </div>
            </div>
        </template>

        <template #empty>
            <div class="flex flex-col items-center justify-center h-full text-base-content/30 gap-4">
                <div class="w-24 h-24 rounded-full bg-base-200/50 flex items-center justify-center animate-pulse">
                    <Icon name="mingcute:layout-5-line" size="40" />
                </div>
                <span class="text-sm font-medium tracking-wide">选择左侧项目以查看详情</span>
            </div>
        </template>
    </LayoutListDetail>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';

definePageMeta({ layout: "main" })
const route = useRoute();
const router = useRouter();

const isDetailOpen = computed(() => !!route.params.id);

type ItemType = 'module' | 'file' | 'contact' | 'chat' | 'system';

interface SearchItem {
    id: number;
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

const mockData: SearchItem[] = [
    {
        id: 1, type: 'module', title: '用户管理中心', subtitle: '系统模块 / 权限控制',
        time: '刚刚', icon: 'mingcute:user-security-line', iconColor: 'text-blue-500',
        detailInfo: 'v2.4.0 · 已启用', tags: ['核心', '安全']
    },
    {
        id: 2, type: 'contact', title: 'Sarah Jenkins', subtitle: '产品经理 · 在线',
        time: '12:30', icon: '', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Sarah',
        detailInfo: '深圳总部 · 设计部', tags: ['工作', 'VIP']
    },
    {
        id: 3, type: 'file', title: '2025_Q1_Roadmap.pdf', subtitle: '/Documents/Work/Plans',
        time: '昨天', icon: 'mingcute:pdf-line', iconColor: 'text-red-500',
        detailInfo: '2.4 MB · PDF 文档'
    },
    {
        id: 4, type: 'chat', title: '研发二组群', subtitle: '阿里: 下午的代码评审会议延后...',
        time: '09:41', icon: 'mingcute:group-line', iconColor: 'text-green-600',
        detailInfo: '24 人 · 3 条未读'
    },
    {
        id: 5, type: 'system', title: '网络设置', subtitle: '配置 / WiFi & LAN',
        time: '', icon: 'mingcute:wifi-line', iconColor: 'text-base-content',
        detailInfo: '系统偏好设置'
    },
    {
        id: 6, type: 'file', title: 'design-system.fig', subtitle: '/Design/Assets',
        time: '周一', icon: 'mingcute:figma-line', iconColor: 'text-purple-500',
        detailInfo: '45 MB · Figma 文件'
    },
];

const searchQuery = ref('');
const activeFilter = ref('all');
const activeItemId = ref<number>(1);

const filterTabs = [
    { key: 'all', label: '全部' },
    { key: 'module', label: '应用' },
    { key: 'file', label: '文件' },
    { key: 'contact', label: '联系人' },
    { key: 'chat', label: '消息' },
];

onMounted(() => {
    if (route.query.q) {
        searchQuery.value = route.query.q as string;
    }
});

watch(
    () => route.query.q,
    (newQ) => {
        searchQuery.value = (newQ as string) || '';
    }
);

const updateUrlQuery = () => {
    router.replace({ query: { ...route.query, q: searchQuery.value || undefined } });
};

const clearSearch = () => {
    searchQuery.value = '';
    updateUrlQuery();
};

const filteredList = computed(() => {
    return mockData.filter(item => {
        if (activeFilter.value !== 'all' && item.type !== activeFilter.value) return false;
        if (!searchQuery.value) return true;
        const q = searchQuery.value.toLowerCase();
        return item.title.toLowerCase().includes(q) || item.subtitle.toLowerCase().includes(q);
    });
});

const selectedItem = computed(() => mockData.find(i => i.id === activeItemId.value));

const handleItemClick = (item: SearchItem) => {
    activeItemId.value = item.id;
    navigateTo('/search/user/' + item.id)
};

const getTypeIcon = (type: ItemType) => {
    const map: Record<ItemType, string> = {
        module: 'mingcute:plugin-fill',
        file: 'mingcute:file-fill',
        contact: 'mingcute:user-3-fill',
        chat: 'mingcute:chat-4-fill',
        system: 'mingcute:settings-3-fill'
    };
    return map[type] || 'mingcute:more-line';
};

const getTypeName = (type: ItemType) => {
    const map: Record<ItemType, string> = {
        module: '应用', file: '文件', contact: '联系人', chat: '会话', system: '设置'
    };
    return map[type];
};

const highlightText = (text: string, query: string) => {
    if (!query) return text;
    const reg = new RegExp(`(${query})`, 'gi');
    return text.replace(reg, '<span class="text-primary font-bold bg-primary/10 px-0.5 rounded-sm">$1</span>');
};

const getPrimaryAction = (type: ItemType) => {
    switch (type) {
        case 'module': return { label: '打开', icon: 'mingcute:rocket-line' };
        case 'contact': return { label: '发消息', icon: 'mingcute:message-2-line' };
        case 'file': return { label: '预览', icon: 'mingcute:eye-2-line' };
        case 'chat': return { label: '进入', icon: 'mingcute:enter-door-line' };
        default: return { label: '查看', icon: 'mingcute:arrow-right-line' };
    }
};

const getSecondaryActions = (type: ItemType) => {
    switch (type) {
        case 'module': return [
            { label: '设置', icon: 'mingcute:settings-2-line' }
        ];
        case 'contact': return [
            { label: '通话', icon: 'mingcute:phone-line' }
        ];
        case 'file': return [
            { label: '位置', icon: 'mingcute:folder-open-line' },
            { label: '下载', icon: 'mingcute:download-2-line' }
        ];
        default: return [];
    }
};
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