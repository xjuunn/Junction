<script setup lang="ts">
import { breakpointsTailwind, useBreakpoints } from '@vueuse/core';

definePageMeta({ layout: 'main' });

const toast = useToast();
const breakpoints = useBreakpoints(breakpointsTailwind);
const isMobile = breakpoints.smaller('md');
const isTablet = breakpoints.between('md', 'lg');

interface FeatureItem {
    id: string;
    name: string;
    description: string;
    icon: string;
    iconBg: string;
    iconColor: string;
    path?: string;
    badge?: string;
    badgeColor?: string;
    statusLabel?: string;
    statusColor?: string;
    disabled?: boolean;
    category: string;
}

const featureGroups: Array<{
    category: string;
    title: string;
    icon: string;
    color: string;
    description: string;
    items: FeatureItem[];
}> = [
    {
        category: 'communication',
        title: '通讯',
        description: '即时协作与沟通能力',
        icon: 'mingcute:chat-3-line',
        color: 'text-primary',
        items: [
            {
                id: 'chat',
                name: '聊天',
                description: '与好友即时通讯',
                icon: 'mingcute:chat-4-fill',
                iconBg: 'bg-primary/10',
                iconColor: 'text-primary',
                path: '/chat',
                category: 'communication',
            },
            {
                id: 'contacts',
                name: '联系人',
                description: '管理好友与群组',
                icon: 'tabler:users',
                iconBg: 'bg-success/10',
                iconColor: 'text-success',
                path: '/contacts',
                category: 'communication',
            },
            {
                id: 'groups',
                name: '群组',
                description: '创建与管理群聊',
                icon: 'tabler:users-group',
                iconBg: 'bg-info/10',
                iconColor: 'text-info',
                path: '/groups',
                category: 'communication',
            },
        ],
    },
    {
        category: 'social',
        title: '社交',
        description: '互动与动态更新',
        icon: 'mingcute:heart-line',
        color: 'text-error',
        items: [
            {
                id: 'notifications',
                name: '通知',
                description: '查看系统通知',
                icon: 'mingcute:notification-line',
                iconBg: 'bg-warning/10',
                iconColor: 'text-warning',
                path: '/notification',
                badge: '3',
                badgeColor: 'badge-error',
                category: 'social',
            },
            {
                id: 'friend-requests',
                name: '好友请求',
                description: '处理好友申请',
                icon: 'mingcute:user-add-2-line',
                iconBg: 'bg-secondary/10',
                iconColor: 'text-secondary',
                path: '/friend-requests',
                category: 'social',
            },
            {
                id: 'moments',
                name: '动态',
                description: '分享生活点滴',
                icon: 'tabler:photo',
                iconBg: 'bg-accent/10',
                iconColor: 'text-accent',
                path: '/moments',
                category: 'social',
            },
        ],
    },
    {
        category: 'tools',
        title: '效率工具',
        description: '搜索、文件与配置',
        icon: 'mingcute:tool-line',
        color: 'text-base-content/70',
        items: [
            {
                id: 'search',
                name: '搜索',
                description: '全局搜索内容',
                icon: 'mingcute:search-3-line',
                iconBg: 'bg-base-200',
                iconColor: 'text-base-content/60',
                path: '/search',
                category: 'tools',
            },
            {
                id: 'files',
                name: '文件',
                description: '管理文件与媒体',
                icon: 'mingcute:folder-2-line',
                iconBg: 'bg-base-200',
                iconColor: 'text-base-content/60',
                path: '/files',
                category: 'tools',
            },
            {
                id: 'settings',
                name: '设置',
                description: '应用配置选项',
                icon: 'mingcute:settings-3-line',
                iconBg: 'bg-base-200',
                iconColor: 'text-base-content/60',
                path: '/profile/general',
                category: 'tools',
            },
        ],
    },
    {
        category: 'profile',
        title: '个人',
        description: '账户与隐私管理',
        icon: 'mingcute:user-3-line',
        color: 'text-primary',
        items: [
            {
                id: 'profile',
                name: '个人资料',
                description: '编辑个人信息',
                icon: 'mingcute:profile-line',
                iconBg: 'bg-primary/10',
                iconColor: 'text-primary',
                path: '/profile',
                category: 'profile',
            },
            {
                id: 'security',
                name: '安全',
                description: '账户安全设置',
                icon: 'tabler:shield-check',
                iconBg: 'bg-error/10',
                iconColor: 'text-error',
                path: '/profile/security',
                category: 'profile',
            },
            {
                id: 'privacy',
                name: '隐私',
                description: '隐私保护设置',
                icon: 'mingcute:eye-close-line',
                iconBg: 'bg-warning/10',
                iconColor: 'text-warning',
                path: '/profile/privacy',
                category: 'profile',
            },
        ],
    },
    {
        category: 'lab',
        title: '扩展功能',
        description: '持续扩展的功能中心',
        icon: 'mingcute:rocket-line',
        color: 'text-info',
        items: [
            {
                id: 'mini-games',
                name: '小游戏中心',
                description: '轻量娱乐与社交互动',
                icon: 'mingcute:game-2-line',
                iconBg: 'bg-info/10',
                iconColor: 'text-info',
                statusLabel: '即将上线',
                statusColor: 'badge-ghost',
                disabled: true,
                category: 'lab',
            },
            {
                id: 'scrcpy',
                name: 'Scrcpy 远程控制',
                description: '手机投屏与远程控制',
                icon: 'tabler:device-mobile',
                iconBg: 'bg-success/10',
                iconColor: 'text-success',
                path: '/tools/scrcpy',
                statusLabel: '桌面端',
                statusColor: 'badge-ghost',
                category: 'lab',
            },
            {
                id: 'minecraft',
                name: 'Minecraft 服务器',
                description: '启动、监控与管理服务器',
                icon: 'mingcute:server-2-line',
                iconBg: 'bg-primary/10',
                iconColor: 'text-primary',
                statusLabel: '规划中',
                statusColor: 'badge-ghost',
                disabled: true,
                category: 'lab',
            },
        ],
    },
];

const handleFeatureClick = (item: FeatureItem) => {
    if (item.disabled || !item.path) {
        toast.info('该功能正在开发中，敬请期待');
        return;
    }
    navigateTo(item.path);
};

const getGridCols = () => {
    if (isMobile.value) return 'grid-cols-2';
    if (isTablet.value) return 'grid-cols-3';
    return 'grid-cols-4';
};

const getCardPadding = () => {
    return isMobile.value ? 'p-3' : 'p-4';
};

const getIconSize = () => {
    return isMobile.value ? 'w-10 h-10' : 'w-12 h-12';
};

const getTitleSize = () => {
    return isMobile.value ? 'text-sm' : 'text-base';
};

const getDescSize = () => {
    return isMobile.value ? 'text-[10px]' : 'text-xs';
};
</script>

<template>
    <div class="h-full overflow-y-auto bg-base-100 scroll-smooth">
        <div class="min-h-full px-4 py-6 sm:px-6 lg:px-8">
            <div class="mx-auto max-w-6xl space-y-8">
                <header class="space-y-4">
                    <div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                        <div class="space-y-2">
                            <h1 class="text-2xl font-bold tracking-tight text-base-content sm:text-3xl">
                                功能中心
                            </h1>
                            <p class="text-sm text-base-content/50 sm:text-base">
                                快速访问所有核心能力，并持续扩展新的功能场景。
                            </p>
                        </div>
                        <div class="flex flex-wrap items-center gap-2">
                            <span class="badge badge-ghost text-base-content/60">全部功能</span>
                            <span class="badge badge-ghost text-base-content/60">效率提升</span>
                            <span class="badge badge-ghost text-base-content/60">扩展计划</span>
                        </div>
                    </div>
                </header>

                <div class="space-y-8">
                    <section v-for="group in featureGroups" :key="group.category" class="space-y-4">
                        <div class="flex flex-wrap items-center gap-3">
                            <div class="flex items-center justify-center w-9 h-9 rounded-xl bg-base-200">
                                <Icon :name="group.icon" :class="group.color" size="18" />
                            </div>
                            <div class="space-y-1">
                                <h2 class="text-lg font-semibold text-base-content">
                                    {{ group.title }}
                                </h2>
                                <p class="text-xs text-base-content/50 sm:text-sm">
                                    {{ group.description }}
                                </p>
                            </div>
                        </div>

                        <div class="grid gap-3 sm:gap-4" :class="getGridCols()">
                            <div
                                v-for="item in group.items"
                                :key="item.id"
                                @click="handleFeatureClick(item)"
                                class="group relative flex flex-col rounded-2xl border border-base-200 bg-base-100 transition-all duration-300 sm:rounded-3xl"
                                :class="[
                                    getCardPadding(),
                                    item.disabled
                                        ? 'cursor-not-allowed opacity-70'
                                        : 'cursor-pointer hover:border-base-300 hover:bg-base-200/50 hover:shadow-lg hover:shadow-base-content/5 hover:-translate-y-0.5 active:scale-[0.98]',
                                ]"
                            >
                                <div class="flex items-start justify-between">
                                    <div class="flex items-center gap-3 sm:gap-4">
                                        <div
                                            class="flex shrink-0 items-center justify-center rounded-xl transition-transform duration-300 group-hover:scale-110"
                                            :class="[item.iconBg, getIconSize()]"
                                        >
                                            <Icon :name="item.icon" :class="item.iconColor" size="22" />
                                        </div>
                                        <div class="min-w-0 flex-1">
                                            <h3
                                                class="font-semibold truncate transition-colors"
                                                :class="[getTitleSize(), 'text-base-content group-hover:text-primary']"
                                            >
                                                {{ item.name }}
                                            </h3>
                                            <p
                                                class="mt-0.5 truncate transition-colors"
                                                :class="[getDescSize(), 'text-base-content/40 group-hover:text-base-content/60']"
                                            >
                                                {{ item.description }}
                                            </p>
                                        </div>
                                    </div>
                                    <div class="flex shrink-0 items-center gap-2">
                                        <span
                                            v-if="item.statusLabel"
                                            class="badge badge-sm text-base-content/60"
                                            :class="item.statusColor || 'badge-ghost'"
                                        >
                                            {{ item.statusLabel }}
                                        </span>
                                        <span v-if="item.badge" class="badge badge-sm badge-circle" :class="item.badgeColor || 'badge-primary'">
                                            {{ item.badge }}
                                        </span>
                                    </div>
                                </div>

                                <div
                                    v-if="!item.disabled"
                                    class="absolute inset-x-4 bottom-4 flex items-center justify-end opacity-0 transition-all duration-300 group-hover:opacity-100 sm:inset-x-5"
                                >
                                    <div class="flex items-center gap-1 rounded-full bg-base-content/5 px-2 py-1 text-xs font-medium text-base-content/60">
                                        <span>前往</span>
                                        <Icon name="mingcute:arrow-right-line" size="12" />
                                    </div>
                                </div>
                            </div>
                        </div>
                    </section>
                </div>

                <section class="rounded-3xl border border-base-200 bg-gradient-to-br from-primary/5 via-base-100 to-secondary/5 p-6 sm:p-8">
                    <div class="flex flex-col items-center text-center gap-4 sm:flex-row sm:text-left sm:gap-6">
                        <div class="flex shrink-0 items-center justify-center w-16 h-16 rounded-2xl bg-primary/10 sm:w-20 sm:h-20">
                            <Icon name="mingcute:sparkles-line" class="text-primary" size="32" />
                        </div>
                        <div class="flex-1 space-y-2">
                            <h3 class="text-lg font-semibold text-base-content">
                                探索更多功能
                            </h3>
                            <p class="text-sm text-base-content/50 sm:text-base">
                                我们正在持续完善功能中心，欢迎提交建议或新功能设想。
                            </p>
                        </div>
                        <button class="btn btn-primary btn-sm rounded-full sm:btn-md">
                            反馈建议
                            <Icon name="mingcute:arrow-right-line" size="16" />
                        </button>
                    </div>
                </section>
            </div>
        </div>
    </div>
</template>
