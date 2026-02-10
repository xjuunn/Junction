<script setup lang="ts">
import { isTauri } from '~/utils/check';

definePageMeta({ layout: 'main' });
useHead({ title: '功能中心' });

const toast = useToast();

const featureGroups = [
  {
    title: '系统与连接',
    items: [
      {
        id: 'scrcpy',
        name: '远程控制',
        desc: '低延迟安卓投屏与桌面端同步控制',
        icon: 'heroicons:device-phone-mobile-20-solid',
        path: '/tools/scrcpy',
        isReady: true,
        isDesktopOnly: true,
        tag: '核心',
      },
      {
        id: 'terminal',
        name: '串口调试',
        desc: '嵌入式通信与实时日志抓取工具',
        icon: 'heroicons:command-line-20-solid',
        path: '',
        isReady: false,
        isDesktopOnly: true,
        tag: '开发中',
      },
    ]
  },
  {
    title: '游戏与服务',
    items: [
      {
        id: 'minecraft',
        name: '我的世界',
        desc: '高性能游戏服务端监控与管理看板',
        icon: 'heroicons:server-stack-20-solid',
        path: '',
        isReady: false,
        isDesktopOnly: false,
        tag: '规划中',
      }
    ]
  }
];

const handleAction = (item: any) => {
  if (!item.isReady) {
    toast.info('该模块正在构建中，敬请期待');
    return;
  }
  if (item.isDesktopOnly && !isTauri()) {
    toast.warning('此功能仅支持桌面客户端');
    return;
  }
  if (item.path) navigateTo(item.path);
};
</script>

<template>
  <div class="h-full bg-base-100 overflow-y-auto selection:bg-primary/10">
    <div class="mx-auto max-w-5xl px-8 py-20 lg:px-12">
      <header class="mb-5 space-y-3">
        <h1 class="text-4xl font-black tracking-tighter text-base-content">
          功能中心
        </h1>
        <!-- <p class="text-[11px] font-bold opacity-30 uppercase tracking-[0.4em]">
          模块化专业工具集 ／ 系统版本 4.2
        </p> -->
      </header>
      <div class="space-y-16">
        <section v-for="group in featureGroups" :key="group.title" class="space-y-6">
          <div class="flex items-center gap-4 opacity-25">
            <span class="text-[10px] font-black uppercase tracking-[0.2em]">{{ group.title }}</span>
            <div class="h-[1px] flex-1 bg-base-content/10"></div>
          </div>
          <div class="grid grid-cols-1 gap-4 md:grid-cols-2">
            <button v-for="item in group.items" :key="item.id" @click="handleAction(item)" :class="[
              'group relative flex items-center gap-5 rounded-2xl p-5 text-left transition-all duration-300 border border-base-content/5',
              item.isReady
                ? 'bg-base-200 hover:bg-base-300 hover:border-primary/20 hover:shadow-2xl shadow-primary/5'
                : 'bg-base-200/50 opacity-40 cursor-not-allowed grayscale'
            ]">
              <div :class="[
                'flex h-11 w-11 flex-none items-center justify-center rounded-xl bg-base-100 transition-all duration-500 group-hover:scale-110 shadow-sm',
                item.isReady ? 'text-primary' : 'text-base-content/40'
              ]">
                <Icon :name="item.icon" class="text-2xl" />
              </div>
              <div class="flex-1 min-w-0 space-y-1">
                <div class="flex items-center gap-2">
                  <h3 class="text-sm font-black tracking-tight text-base-content truncate">{{ item.name }}</h3>
                  <span v-if="item.isDesktopOnly"
                    class="text-[9px] font-bold opacity-30 border border-base-content/10 px-1.5 py-0.5 rounded-[4px] leading-none">桌面端</span>
                </div>
                <p class="text-[11px] font-medium opacity-40 truncate">{{ item.desc }}</p>
              </div>
              <div class="flex flex-col items-end gap-1.5 flex-none">
                <div v-if="item.isReady"
                  class="h-1.5 w-1.5 rounded-full bg-success shadow-[0_0_8px_rgba(34,197,94,0.4)] animate-pulse"></div>
                <span class="text-[9px] font-bold opacity-20 group-hover:opacity-50 transition-opacity tracking-widest">
                  {{ item.tag }}
                </span>
              </div>
            </button>
          </div>
        </section>
      </div>
    </div>
  </div>
</template>
