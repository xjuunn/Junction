<script setup lang="ts">
definePageMeta({ layout: "main" });

const menuItems = [
    { to: '/settings/general', label: '通用设置', icon: 'mingcute:settings-3-line' },
    { to: '/settings/ai', label: 'AI 设置', icon: 'mingcute:ai-line' },
    { to: '/settings/bots', label: '机器人管理', icon: 'mingcute:ai-line' },
    { to: '/settings/notification', label: '通知设置', icon: 'mingcute:notification-line' },
    { to: '/settings/privacy', label: '隐私设置', icon: 'mingcute:shield-line' },
    { to: '/settings/theme', label: '主题设置', icon: 'mingcute:paint-line' },
    { to: '/settings/about', label: '关于 Junction', icon: 'mingcute:information-line' },
];
</script>

<template>
    <div class="h-full bg-base-200 p-4 md:p-8 overflow-y-auto">
        <div class="mx-auto max-w-6xl space-y-6">
            <div class="flex items-center gap-3">
                <div class="avatar placeholder">
                    <div class="bg-primary text-primary-content rounded-xl w-12 h-12">
                        <Icon name="mingcute:settings-3-line" size="24" />
                    </div>
                </div>
                <div>
                    <h1 class="text-2xl font-bold tracking-tight">设置</h1>
                    <p class="text-base-content/60 text-sm">管理您的账户和应用偏好</p>
                </div>
            </div>

            <div class="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
                <div class="md:col-span-3 lg:col-span-3">
                    <div class="bg-base-100 rounded-2xl border border-base-200 p-2 shadow-sm sticky top-4">
                        <ul class="menu w-full gap-1">
                            <li v-for="item in menuItems" :key="item.to">
                                <NuxtLink :to="item.to"
                                    active-class="!bg-primary !text-primary-content font-bold shadow-md shadow-primary/20"
                                    class="rounded-xl py-3 px-4 text-base-content/70 hover:bg-base-200 transition-all">
                                    <Icon :name="item.icon" size="20" />
                                    {{ item.label }}
                                </NuxtLink>
                            </li>
                        </ul>
                    </div>
                </div>

                <div class="md:col-span-9 lg:col-span-9">
                    <NuxtPage />
                </div>
            </div>
        </div>
    </div>
</template>

