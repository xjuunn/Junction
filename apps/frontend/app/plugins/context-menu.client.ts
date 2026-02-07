import type { ContextMenuBindingValue } from '~/composables/useContextMenu'

interface ContextMenuElement extends HTMLElement {
  __contextMenuHandler__?: (event: MouseEvent) => void
  __contextMenuBinding__?: ContextMenuBindingValue
}

export default defineNuxtPlugin((nuxtApp) => {
  const { openContextMenu } = useContextMenu()
  /**
   * 禁用浏览器默认右键菜单
   */
  const preventNativeContextMenu = (event: MouseEvent) => {
    event.preventDefault()
  }

  nuxtApp.vueApp.directive('context-menu', {
    mounted(el, binding) {
      const target = el as ContextMenuElement
      target.__contextMenuBinding__ = binding.value
      target.__contextMenuHandler__ = (event: MouseEvent) => {
        const value = resolveBindingValue(target.__contextMenuBinding__, event)
        if (!value) return
        const disabled = typeof value.disabled === 'function' ? value.disabled(event) : value.disabled
        if (disabled) return
        openContextMenu({
          event,
          items: value.items,
          context: value.context,
          ...value.options,
        })
      }
      el.addEventListener('contextmenu', target.__contextMenuHandler__)
    },
    updated(el, binding) {
      const target = el as ContextMenuElement
      target.__contextMenuBinding__ = binding.value
    },
    unmounted(el) {
      const target = el as ContextMenuElement
      if (target.__contextMenuHandler__) {
        el.removeEventListener('contextmenu', target.__contextMenuHandler__)
      }
      delete target.__contextMenuHandler__
      delete target.__contextMenuBinding__
    },
  })

  document.addEventListener('contextmenu', preventNativeContextMenu, true)
  nuxtApp.hook('app:beforeUnmount', () => {
    document.removeEventListener('contextmenu', preventNativeContextMenu, true)
  })
})

/**
 * 解析指令绑定值
 */
function resolveBindingValue(
  value: ContextMenuBindingValue | undefined,
  event: MouseEvent,
) {
  if (!value) return null
  if (typeof value === 'function') return value(event)
  return value
}
