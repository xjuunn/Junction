<script setup lang="ts">
import { ref, nextTick, watch, onMounted, onUnmounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { menuService } from '~/core/menu'

const userStore = useUserStore()
const authClient = useAuthClient() as any
const dialog = useDialog()
const toast = useToast()
const { isAdmin } = useAdminAccess()

const route = useRoute()
const router = useRouter()
const groups = menuService.getGroupedMenus()

const isCollapsed = ref(false)
const searchQuery = ref('')

const profileTriggerRef = ref<HTMLElement | null>(null)
const profileMenuRef = ref<HTMLElement | null>(null)
const isProfileMenuOpen = ref(false)
const profileMenuStyle = ref<Record<string, string>>({
  top: '0px',
  left: '0px',
})

const isActive = (path?: string) => {
  if (!path) return false
  return path === '/' ? route.path === '/' : route.path.startsWith(path)
}

const handleItemClick = (item: MenuItem, event: Event) => {
  item.click(event)
}

const toggleSidebar = () => {
  isCollapsed.value = !isCollapsed.value
}

const handleSearch = () => {
  if (!searchQuery.value.trim()) return
  router.push({ path: '/search', query: { q: searchQuery.value } })
}

const handleIconClick = () => {
  if (isCollapsed.value) {
    router.push('/search')
  }
}

const closeProfileMenu = () => {
  isProfileMenuOpen.value = false
}

const updateProfileMenuPosition = () => {
  const trigger = profileTriggerRef.value
  if (!trigger) return

  const rect = trigger.getBoundingClientRect()
  const gap = 10
  const menuWidth = 288
  const menuHeight = profileMenuRef.value?.offsetHeight ?? 232

  let top = rect.bottom + gap
  let left = isCollapsed.value ? rect.right - menuWidth : rect.left

  const minInset = 8
  left = Math.max(minInset, Math.min(left, window.innerWidth - menuWidth - minInset))
  if (top + menuHeight > window.innerHeight - minInset) {
    top = Math.max(minInset, rect.top - menuHeight - gap)
  }

  profileMenuStyle.value = {
    top: `${top}px`,
    left: `${left}px`,
  }
}

const toggleProfileMenu = async () => {
  isProfileMenuOpen.value = !isProfileMenuOpen.value
  if (!isProfileMenuOpen.value) return
  await nextTick()
  updateProfileMenuPosition()
}

const handleOpenProfile = () => {
  closeProfileMenu()
  router.push('/profile/general')
}

const handleOpenSettings = () => {
  closeProfileMenu()
  router.push('/settings')
}

const handleOpenAdmin = () => {
  closeProfileMenu()
  router.push('/admin')
}

const handleLogout = async () => {
  closeProfileMenu()

  const confirmed = await dialog.confirm({
    title: '退出登录',
    content: '确认退出当前账号吗？',
    type: 'warning',
    confirmText: '退出',
    cancelText: '取消',
  })
  if (!confirmed) return

  try {
    if (typeof authClient?.signOut === 'function') {
      await authClient.signOut()
    }
  } catch (error) {
    console.error('[Sidebar] signOut failed:', error)
  } finally {
    userStore.clearAuth()
    toast.success('已退出登录')
    await navigateTo('/auth/sign-in', { replace: true })
  }
}

const handleWindowResize = () => {
  if (window.innerWidth < 1280 && !isCollapsed.value) {
    isCollapsed.value = true
  } else if (window.innerWidth >= 1280 && isCollapsed.value) {
    isCollapsed.value = false
  }

  if (isProfileMenuOpen.value) {
    updateProfileMenuPosition()
  }
}

const handleGlobalPointerDown = (event: MouseEvent) => {
  if (!isProfileMenuOpen.value) return
  const target = event.target as Node
  if (profileTriggerRef.value?.contains(target)) return
  if (profileMenuRef.value?.contains(target)) return
  closeProfileMenu()
}

const handleGlobalKeydown = (event: KeyboardEvent) => {
  if (!isProfileMenuOpen.value) return
  if (event.key === 'Escape') {
    closeProfileMenu()
  }
}

onMounted(() => {
  menuService.add({
    id: 'fold',
    name: '折叠',
    icon: 'mingcute:layout-right-line',
    group: 'system',
    show: isCollapsed,
    handler: toggleSidebar,
  })

  if (window.innerWidth < 1280) {
    isCollapsed.value = true
  }

  window.addEventListener('resize', handleWindowResize)
  window.addEventListener('scroll', handleWindowResize, true)
  document.addEventListener('mousedown', handleGlobalPointerDown)
  document.addEventListener('keydown', handleGlobalKeydown)
})

onUnmounted(() => {
  menuService.remove('fold')
  window.removeEventListener('resize', handleWindowResize)
  window.removeEventListener('scroll', handleWindowResize, true)
  document.removeEventListener('mousedown', handleGlobalPointerDown)
  document.removeEventListener('keydown', handleGlobalKeydown)
})

watch(() => route.fullPath, () => {
  closeProfileMenu()
})
</script>

<template>
  <div
    class="flex h-full flex-col overflow-x-visible overflow-y-auto rounded-box border-r border-base-content/5 bg-base-200 py-4 font-sans text-base-content transition-[width] duration-200 ease-in-out will-change-[width]"
    data-tauri-drag-region
    :class="isCollapsed ? 'w-20' : 'w-80'"
  >
    <div class="relative z-[120] mb-6 flex shrink-0 items-center px-2 pt-2 transition-all duration-300" :class="isCollapsed ? 'justify-center px-2' : 'justify-between px-5'">
      <div>
        <button
          ref="profileTriggerRef"
          type="button"
          class="group flex items-center rounded-2xl p-1 transition-all duration-300 hover:bg-base-content/5"
          :class="isCollapsed ? 'gap-0' : 'gap-3'"
          :aria-expanded="isProfileMenuOpen"
          aria-haspopup="menu"
          @click.stop="toggleProfileMenu"
        >
          <BaseAvatar
            :text="userStore.user.value?.name"
            :src="resolveAssetUrl(userStore.user.value?.image)"
            :placeholder-length="2"
            size="42px"
          />
          <div
            class="flex flex-col justify-center gap-0.5 overflow-hidden whitespace-nowrap transition-all duration-300"
            :class="isCollapsed ? 'w-0 opacity-0' : 'w-auto opacity-100'"
          >
            <div class="flex items-center gap-2">
              <div class="max-w-28 truncate text-sm font-bold text-base-content">{{ userStore.user.value?.name }}</div>
              <span class="badge badge-sm badge-success badge-soft h-5 border-base-content/10 px-1.5 text-[10px] font-medium text-base-content/60">
                在线
              </span>
            </div>
            <div class="max-w-32 truncate text-xs text-base-content/50">{{ userStore.user.value?.email }}</div>
          </div>
        </button>
      </div>

      <Teleport to="body">
        <transition name="profile-menu-fade">
          <div
            v-if="isProfileMenuOpen"
            ref="profileMenuRef"
            class="fixed z-[10000] w-72 rounded-2xl border border-base-content/10 bg-base-100/80 p-3 shadow-xl backdrop-blur-xl"
            :style="profileMenuStyle"
            @click.stop
          >
            <div class="flex items-start gap-3 rounded-xl bg-base-100/20 p-3">
              <BaseAvatar
                :text="userStore.user.value?.name"
                :src="resolveAssetUrl(userStore.user.value?.image)"
                :placeholder-length="2"
                size="40px"
              />
              <div class="min-w-0 flex-1 space-y-1">
                <div class="truncate text-sm font-semibold text-base-content">{{ userStore.user.value?.name || '用户' }}</div>
                <div class="truncate text-xs text-base-content/65">{{ userStore.user.value?.email || '未绑定邮箱' }}</div>
                <div class="truncate text-[11px] text-base-content/45">用户ID：{{ userStore.user.value?.id || '-' }}</div>
              </div>
            </div>

            <div class="mt-3 grid grid-cols-2 gap-2">
              <button class="btn btn-soft btn-sm justify-start" @click="handleOpenProfile">
                <Icon name="mingcute:user-info-line" size="16" />
                个人资料
              </button>
              <button class="btn btn-soft btn-sm justify-start" @click="handleOpenSettings">
                <Icon name="mingcute:settings-3-line" size="16" />
                设置
              </button>
              <button v-if="isAdmin" class="btn btn-soft btn-sm justify-start" @click="handleOpenAdmin">
                <Icon name="mingcute:shield-line" size="16" />
                管理后台
              </button>
              <button class="btn btn-soft btn-sm justify-start text-error hover:bg-error/10 hover:text-error" @click="handleLogout">
                <Icon name="mingcute:exit-door-line" size="16" />
                退出登录
              </button>
            </div>
          </div>
        </transition>
      </Teleport>

      <div
        class="flex items-center gap-1 overflow-hidden transition-all duration-300"
        data-tauri-drag-region
        :class="isCollapsed ? 'w-0 opacity-0' : 'w-auto opacity-100'"
      >
        <NuxtLink to="/notification" class="btn btn-square btn-ghost btn-sm text-base-content/60 hover:text-base-content">
          <Icon name="mingcute:notification-line" size="18" />
        </NuxtLink>
        <button class="btn btn-square btn-ghost btn-sm text-base-content/60 hover:text-base-content" @click="toggleSidebar">
          <Icon name="mingcute:layout-left-line" size="18" />
        </button>
      </div>
    </div>

    <div class="shrink-0 pb-4 transition-all duration-300" :class="isCollapsed ? 'px-2' : 'px-5'" data-tauri-drag-region>
      <div class="group relative flex" :class="isCollapsed ? 'justify-center' : 'block'">
        <div
          class="z-10 flex items-center justify-center text-base-content/50 transition-colors group-focus-within:text-base-content/80"
          :class="[isCollapsed ? 'static h-10 w-10 cursor-pointer' : 'pointer-events-none absolute inset-y-0 left-3']"
          @click="handleIconClick"
        >
          <Icon name="mingcute:search-line" size="18" />
        </div>
        <input
          v-model="searchQuery"
          type="text"
          placeholder="搜索"
          class="input input-sm h-10 rounded-xl border-transparent bg-base-300 p-0 text-sm transition-all duration-300 placeholder:text-base-content/40 focus:border-base-content/10 focus:bg-base-100"
          :class="isCollapsed ? 'w-0 opacity-0 pl-0 pr-0' : 'w-full opacity-100 pl-10 pr-12'"
          @keydown.enter="handleSearch"
        >
        <div class="pointer-events-none absolute inset-y-0 right-3 flex items-center transition-opacity duration-300" :class="isCollapsed ? 'opacity-0' : 'opacity-100'">
          <kbd class="kbd kbd-sm h-[20px] min-h-[20px] border-base-content/10 bg-base-100 px-1.5 font-sans text-[10px] text-base-content/50">
            Ctrl+K
          </kbd>
        </div>
      </div>
    </div>

    <nav class="mb-8 flex flex-col gap-1 transition-all duration-300" :class="isCollapsed ? 'px-2' : 'px-4'" data-tauri-drag-region>
      <template v-if="groups['main']">
        <div
          v-for="item in groups['main']"
          :key="item.id"
          v-show="item.getShouldShow"
          class="group flex h-10 cursor-pointer items-center rounded-xl py-2.5 transition-all duration-200"
          :class="[
            isActive(item.path)
              ? 'bg-base-100 text-base-content shadow-sm'
              : 'text-base-content/60 hover:bg-base-content/5 hover:text-base-content',
            isCollapsed ? 'justify-center px-0' : 'justify-start gap-3 px-3',
            item.extraClass,
          ]"
          @click="handleItemClick(item, $event)"
        >
          <Icon
            :name="item.icon"
            size="20"
            class="shrink-0 transition-colors"
            :class="isActive(item.path) ? 'text-base-content' : 'group-hover:text-base-content'"
          />

          <span
            class="delay-75 overflow-hidden whitespace-nowrap text-sm font-medium transition-all duration-300"
            :class="isCollapsed ? 'w-0 opacity-0' : 'w-auto opacity-100'"
          >
            {{ item.name }}
          </span>

          <span
            v-if="item.meta?.badge"
            class="badge badge-sm ml-auto flex h-5 min-w-[1.25rem] items-center justify-center overflow-hidden rounded-full border-none text-[10px] font-bold text-white transition-all duration-300"
            :class="[item.meta.badgeColor || 'badge-primary', isCollapsed ? 'w-0 opacity-0' : 'w-auto opacity-100']"
          >
            {{ item.meta.badge }}
          </span>

          <span v-if="item.meta?.badge && isCollapsed" class="absolute right-2 top-2 h-2 w-2 rounded-full border border-base-200 bg-error"></span>
        </div>
      </template>
    </nav>

    <div class="flex-1" data-tauri-drag-region></div>

    <div class="flex flex-col gap-1 transition-all duration-300" :class="isCollapsed ? 'px-2' : 'px-4'" data-tauri-drag-region>
      <template v-if="groups['system']">
        <div
          v-for="item in groups['system']"
          :key="item.id"
          v-show="item.getShouldShow"
          class="group flex h-10 cursor-pointer items-center rounded-xl py-2 transition-colors"
          :class="[
            isActive(item.path)
              ? 'bg-base-100 text-base-content'
              : 'text-base-content/60 hover:bg-base-content/5 hover:text-base-content',
            isCollapsed ? 'justify-center px-0' : 'justify-start gap-3 px-3',
            item.extraClass,
          ]"
          @click="handleItemClick(item, $event)"
        >
          <Icon
            :name="item.icon"
            size="20"
            class="shrink-0 transition-colors"
            :class="isActive(item.path) ? 'text-base-content' : 'group-hover:text-base-content'"
          />
          <span
            class="delay-75 overflow-hidden whitespace-nowrap text-sm font-medium transition-all duration-300"
            :class="isCollapsed ? 'w-0 opacity-0' : 'w-auto opacity-100'"
          >
            {{ item.name }}
          </span>
        </div>
      </template>
    </div>
  </div>
</template>

<style scoped>
.overflow-y-auto::-webkit-scrollbar {
  width: 0;
}

.profile-menu-fade-enter-active,
.profile-menu-fade-leave-active {
  transition:
    opacity 0.16s ease,
    transform 0.2s ease;
}

.profile-menu-fade-enter-from,
.profile-menu-fade-leave-to {
  opacity: 0;
  transform: translateY(-4px);
}
</style>
