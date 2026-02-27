<script setup lang="ts">
definePageMeta({ layout: 'main' })

const { isAdmin } = useAdminAccess()
const route = useRoute()

const menuItems = computed(() => [
  { to: '/settings/general', label: '通用设置', icon: 'mingcute:settings-3-line' },
  { to: '/settings/ai', label: 'AI 设置', icon: 'mingcute:ai-line' },
  { to: '/settings/bots', label: '机器人管理', icon: 'mingcute:ai-line' },
  { to: '/settings/notification', label: '通知设置', icon: 'mingcute:notification-line' },
  { to: '/settings/privacy', label: '隐私设置', icon: 'mingcute:shield-line' },
  { to: '/settings/theme', label: '主题设置', icon: 'mingcute:paint-line' },
  { to: '/settings/about', label: '关于 Junction', icon: 'mingcute:information-line' },
  ...(isAdmin.value ? [{ to: '/admin', label: '管理员后台', icon: 'mingcute:shield-line' }] : []),
])

const activeLabel = computed(() => {
  const current = menuItems.value.find(item => route.path.startsWith(item.to))
  return current?.label || '设置'
})

onMounted(() => {
  if (route.path === '/settings') {
    navigateTo(menuItems.value[0]?.to || '/settings/general', { replace: true })
  }
})
</script>

<template>
  <div class="h-full overflow-y-auto bg-transparent px-3 py-4 md:px-6 md:py-6 xl:px-8 xl:py-8">
    <div class="mx-auto w-full max-w-[1320px] space-y-4 md:space-y-6">
      <section class="rounded-2xl border border-base-content/10 bg-base-100/20 p-4 shadow-sm backdrop-blur-md md:p-6">
        <div class="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div class="flex items-center gap-3">
            <div class="relative h-12 w-12 md:h-14 md:w-14">
              <div class="absolute inset-0 rounded-2xl bg-primary/15 backdrop-blur-sm"></div>
              <div class="absolute inset-[3px] grid place-items-center rounded-xl border border-primary/25 bg-base-100/30 text-primary">
                <Icon name="mingcute:settings-3-line" size="24" />
              </div>
            </div>
            <div>
              <h1 class="text-xl font-bold md:text-2xl">设置</h1>
              <p class="text-sm text-base-content/60">管理账户、通知、隐私与应用偏好</p>
            </div>
          </div>
          <div class="badge badge-ghost border-base-content/10 px-3 py-3 text-xs md:text-sm">
            当前模块：{{ activeLabel }}
          </div>
        </div>
      </section>

      <section class="grid grid-cols-1 gap-4 lg:grid-cols-[260px_minmax(0,1fr)] lg:gap-6">
        <aside class="hidden lg:block">
          <div class="sticky top-4 rounded-2xl border border-base-content/10 bg-base-100/20 p-2 shadow-sm backdrop-blur-md">
            <ul class="menu w-full gap-1">
              <li v-for="item in menuItems" :key="item.to">
                <NuxtLink :to="item.to"
                  active-class="!bg-base-content !text-base-100 font-semibold"
                  class="rounded-xl px-4 py-3 text-sm text-base-content/70 transition hover:bg-base-200 hover:text-base-content">
                  <Icon :name="item.icon" size="18" />
                  {{ item.label }}
                </NuxtLink>
              </li>
            </ul>
          </div>
        </aside>

        <div class="space-y-3 md:space-y-4">
          <div class="flex gap-2 overflow-x-auto rounded-2xl border border-base-content/10 bg-base-100/20 p-2 shadow-sm backdrop-blur-md lg:hidden [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
            <NuxtLink v-for="item in menuItems" :key="item.to" :to="item.to"
              active-class="!bg-base-content !text-base-100"
              class="inline-flex shrink-0 items-center gap-2 rounded-xl px-3 py-2 text-xs text-base-content/70 transition hover:bg-base-200 hover:text-base-content">
              <Icon :name="item.icon" size="16" />
              <span>{{ item.label }}</span>
            </NuxtLink>
          </div>

          <div class="rounded-2xl border border-base-content/10 bg-base-100/20 p-2 shadow-sm backdrop-blur-md md:p-3">
            <div class="settings-content
              [&_.card]:rounded-2xl
              [&_.card]:!border
              [&_.card]:!border-base-content/10
              [&_.card]:!bg-base-100/20
              [&_.card]:!backdrop-blur-md
              [&_.card]:!shadow-none
              [&_.card-body]:!p-4
              md:[&_.card-body]:!p-6
              [&_.card-title]:!mb-3
              [&_.divider]:!my-4
              [&_.input]:rounded-xl
              [&_.select]:rounded-xl
              [&_.textarea]:rounded-xl
              [&_.btn:not(.btn-link)]:rounded-xl
              [&_.input]:!border-base-content/10
              [&_.select]:!border-base-content/10
              [&_.textarea]:!border-base-content/10
              [&_.input]:!bg-base-100/20
              [&_.select]:!bg-base-100/20
              [&_.textarea]:!bg-base-100/20
              [&_.border-base-200]:!border-base-content/10
              [&_.bg-base-100]:!bg-base-100/20
              [&_.max-w-2xl]:!max-w-none">
              <NuxtPage />
            </div>
          </div>
        </div>
      </section>
    </div>
  </div>
</template>
