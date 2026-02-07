<script setup lang="ts">
import * as adminApi from '~/api/admin'

const route = useRoute()

const menuGroups = [
  {
    title: '控制台',
    items: [
      { to: '/admin/overview', label: '概览', icon: 'mingcute:classify-2-line' }
    ]
  },
  {
    title: '数据表',
    items: [
      { to: '/admin/tables/user', label: '用户表', icon: 'mingcute:user-3-line' },
      { to: '/admin/tables/aiBot', label: '机器人表', icon: 'mingcute:ai-line' },
      { to: '/admin/tables/conversation', label: '会话表', icon: 'mingcute:chat-4-line' },
      { to: '/admin/tables/message', label: '消息表', icon: 'mingcute:message-4-line' },
      { to: '/admin/tables/friendship', label: '好友关系表', icon: 'mingcute:link-line' },
      { to: '/admin/tables/notification', label: '通知表', icon: 'mingcute:notification-line' },
      { to: '/admin/tables/emojiCategory', label: '表情分类表', icon: 'mingcute:folder-line' },
      { to: '/admin/tables/emoji', label: '表情表', icon: 'mingcute:emoji-line' },
      { to: '/admin/tables/aiLog', label: 'AI 日志表', icon: 'mingcute:document-line' }
    ]
  }
]

const isVerifying = ref(true)
const verifyError = ref('')

const isActive = (path?: string) => {
  if (!path) return false
  return route.path === path || route.path.startsWith(`${path}/`)
}

const verifyAdmin = async () => {
  try {
    await adminApi.getAdminStatus()
  } catch (error: any) {
    verifyError.value = error?.message || '无权限访问'
    navigateTo('/chat')
  } finally {
    isVerifying.value = false
  }
}

onMounted(verifyAdmin)
</script>

<template>
  <div class="flex h-screen w-full bg-base-100 text-base-content overflow-hidden font-sans">
    <aside class="w-80 border-r border-base-200 bg-base-200/50 backdrop-blur-md">
      <div class="h-full flex flex-col">
        <div class="p-6 border-b border-base-200">
          <div class="flex items-center gap-3">
            <div class="w-12 h-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center">
              <Icon name="mingcute:shield-line" size="24" />
            </div>
            <div>
              <div class="text-sm text-base-content/60">管理员控制台</div>
              <div class="text-lg font-bold">数据治理中心</div>
            </div>
          </div>
          <div class="mt-4 flex items-center gap-2">
            <span v-if="isVerifying" class="badge badge-ghost badge-sm">正在校验</span>
            <span v-else class="badge badge-success badge-soft badge-sm">已认证</span>
            <span v-if="verifyError" class="badge badge-error badge-soft badge-sm">{{ verifyError }}</span>
          </div>
        </div>
        <div class="flex-1 overflow-y-auto p-4 space-y-5">
          <div v-for="group in menuGroups" :key="group.title">
            <div class="px-3 text-xs uppercase tracking-widest text-base-content/40">{{ group.title }}</div>
            <div class="mt-2 space-y-1">
              <NuxtLink
                v-for="item in group.items"
                :key="item.to"
                :to="item.to"
                class="flex items-center gap-3 rounded-xl px-4 py-2.5 text-sm transition-all"
                :class="isActive(item.to) ? 'bg-base-100 text-base-content shadow-sm' : 'text-base-content/60 hover:bg-base-100/70 hover:text-base-content'"
              >
                <Icon :name="item.icon" size="18" />
                <span class="font-medium">{{ item.label }}</span>
              </NuxtLink>
            </div>
          </div>
        </div>
      </div>
    </aside>
    <main class="flex-1 h-full min-w-0 flex flex-col bg-base-100">
      <header class="flex-none border-b border-base-200 bg-base-100/70 backdrop-blur">
        <AppWindowController />
      </header>
      <section class="flex-1 overflow-y-auto">
        <div class="min-h-full">
          <slot />
        </div>
      </section>
    </main>
  </div>
</template>
