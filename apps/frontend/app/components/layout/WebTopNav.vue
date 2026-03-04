<script setup lang="ts">
const route = useRoute()

const navItems = [
  { to: '/web/download', label: '下载' },
]

const isActive = (to: string) => route.path === to
</script>

<template>
  <header class="fixed top-6 left-1/2 z-50 w-full max-w-5xl -translate-x-1/2 px-4 sm:px-6">
    <div class="flex items-center justify-between rounded-full border border-base-content/5 bg-base-100/40 px-6 py-4 shadow-[0_8px_30px_rgba(0,0,0,0.04)] backdrop-blur-2xl transition-all duration-500 hover:bg-base-100/60">
      <NuxtLink to="/web" class="group flex cursor-pointer items-center gap-4">
        <div class="flex h-10 w-10 items-center justify-center rounded-full border border-base-content/5 bg-base-content/[0.03] text-base-content transition-all duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:scale-105 group-hover:bg-base-content group-hover:text-base-100">
          <Icon name="mingcute:asterisk-fill" size="1.8rem" class="h-10 w-10 transition-transform duration-700 group-hover:rotate-180" />
        </div>
        <div class="flex flex-col">
          <span class="text-sm font-bold tracking-wide">Junction</span>
          <span class="text-[10px] font-medium uppercase tracking-widest text-base-content/40">Team Platform</span>
        </div>
      </NuxtLink>

      <div class="flex items-center gap-3">
        <NuxtLink
          v-for="item in navItems"
          :key="item.to"
          :to="item.to"
          class="rounded-full px-5 py-2.5 text-xs font-semibold tracking-wider transition-colors duration-300"
          :class="isActive(item.to) ? 'bg-base-content/[0.08]' : 'hover:bg-base-content/[0.04]'"
        >
          {{ item.label }}
        </NuxtLink>
        <NuxtLink to="/auth/sign-in" class="rounded-full bg-base-content px-6 py-2.5 text-xs font-semibold tracking-wider text-base-100 shadow-md transition-transform duration-300 hover:scale-105 active:scale-95">
          登录
        </NuxtLink>
      </div>
    </div>
  </header>
</template>
