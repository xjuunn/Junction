<script setup lang="ts">
import type { ResolvedContextMenuEntry, ResolvedContextMenuItem } from '~/composables/useContextMenu'

const { state, closeContextMenu } = useContextMenu()

const menuRef = ref<HTMLElement | null>(null)
const position = ref({ x: 0, y: 0 })

const menuStyle = computed(() => ({
  left: `${position.value.x}px`,
  top: `${position.value.y}px`,
  minWidth: `${state.value.minWidth}px`,
  maxHeight: `${state.value.maxHeight}px`,
}))

const items = computed<ResolvedContextMenuEntry[]>(() => state.value.items)

watch(
  () => state.value.visible,
  async (visible) => {
    if (!visible) return
    await nextTick()
    updatePosition()
  },
)

watch(
  () => [state.value.x, state.value.y, state.value.items.length],
  () => {
    if (!state.value.visible) return
    nextTick().then(updatePosition)
  },
)

onMounted(() => {
  window.addEventListener('resize', handleWindowClose)
  window.addEventListener('scroll', handleWindowClose, true)
  window.addEventListener('keydown', handleEscape)
})

onBeforeUnmount(() => {
  window.removeEventListener('resize', handleWindowClose)
  window.removeEventListener('scroll', handleWindowClose, true)
  window.removeEventListener('keydown', handleEscape)
})

/**
 * 处理菜单项点击
 */
function handleSelect(item: ResolvedContextMenuItem) {
  if (item.disabled) return
  item.onSelect()
}

/**
 * 计算菜单显示位置
 */
function updatePosition() {
  const menu = menuRef.value
  if (!menu) return
  const padding = 8
  const rect = menu.getBoundingClientRect()
  const maxX = window.innerWidth - rect.width - padding
  const maxY = window.innerHeight - rect.height - padding
  position.value = {
    x: Math.max(padding, Math.min(state.value.x, maxX)),
    y: Math.max(padding, Math.min(state.value.y, maxY)),
  }
}

/**
 * 统一关闭菜单的全局事件处理
 */
function handleWindowClose() {
  if (!state.value.visible) return
  closeContextMenu()
}

/**
 * 处理键盘关闭动作
 */
function handleEscape(event: KeyboardEvent) {
  if (event.key !== 'Escape') return
  closeContextMenu()
}

/**
 * 计算菜单项样式
 */
function getItemClass(item: ResolvedContextMenuItem) {
  if (item.disabled) return 'opacity-40 cursor-not-allowed'
  if (item.danger) return 'text-error hover:bg-error/10'
  return 'hover:bg-base-200'
}
</script>

<template>
  <div v-if="state.visible" class="fixed inset-0 z-[200]" @mousedown="closeContextMenu" @contextmenu.prevent>
    <ul
      ref="menuRef"
      class="menu bg-base-100 border border-base-200 rounded-xl shadow-xl p-2 fixed"
      :style="menuStyle"
      @mousedown.stop
    >
      <li v-for="item in items" :key="item.type === 'separator' ? item.id ?? 'separator' : item.id">
        <div v-if="item.type === 'separator'" class="h-px my-1 bg-base-200"></div>
        <button
          v-else
          type="button"
          class="flex items-center justify-between gap-3 rounded-lg px-3 py-2 text-sm transition"
          :class="getItemClass(item)"
          @click="handleSelect(item)"
        >
          <span class="flex items-center gap-2">
            <Icon v-if="item.icon" :name="item.icon" size="16" />
            <span>{{ item.label }}</span>
          </span>
          <span v-if="item.shortcut" class="text-xs text-base-content/50">{{ item.shortcut }}</span>
        </button>
      </li>
    </ul>
  </div>
</template>
