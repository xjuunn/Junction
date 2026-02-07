import type { ComputedRef, Ref } from 'vue'
import { unref } from 'vue'

export type ContextMenuPredicate<Ctx> =
  | boolean
  | Ref<boolean>
  | ComputedRef<boolean>
  | ((context: Ctx) => boolean)

export interface ContextMenuSeparator {
  type: 'separator'
  id?: string
}

export interface ContextMenuItem<Ctx = unknown> {
  type?: 'item'
  id: string
  label: string
  icon?: string
  shortcut?: string
  danger?: boolean
  keepOpen?: boolean
  meta?: Record<string, unknown>
  disabled?: ContextMenuPredicate<Ctx>
  show?: ContextMenuPredicate<Ctx>
  handler?: (payload: ContextMenuAction<Ctx>) => void
}

export type ContextMenuEntry<Ctx = unknown> = ContextMenuItem<Ctx> | ContextMenuSeparator

export interface ContextMenuAction<Ctx = unknown> {
  context: Ctx
  item: ContextMenuItem<Ctx>
  close: () => void
}

export interface ContextMenuOpenOptions<Ctx = unknown> {
  event: MouseEvent
  items: ContextMenuEntry<Ctx>[]
  context: Ctx
  minWidth?: number
  maxHeight?: number
  offset?: number
}

export interface ContextMenuBinding<Ctx = unknown> {
  items: ContextMenuEntry<Ctx>[]
  context: Ctx
  options?: Omit<ContextMenuOpenOptions<Ctx>, 'event' | 'items' | 'context'>
  disabled?: boolean | ((event: MouseEvent) => boolean)
}

export type ContextMenuBindingValue<Ctx = unknown> =
  | ContextMenuBinding<Ctx>
  | ((event: MouseEvent) => ContextMenuBinding<Ctx> | null | undefined)

export interface ResolvedContextMenuItem {
  type: 'item'
  id: string
  label: string
  icon?: string
  shortcut?: string
  danger?: boolean
  disabled: boolean
  meta?: Record<string, unknown>
  onSelect: () => void
}

export type ResolvedContextMenuEntry = ResolvedContextMenuItem | ContextMenuSeparator

interface ContextMenuState {
  visible: boolean
  x: number
  y: number
  minWidth: number
  maxHeight: number
  items: ResolvedContextMenuEntry[]
}

const defaultState: ContextMenuState = {
  visible: false,
  x: 0,
  y: 0,
  minWidth: 200,
  maxHeight: 320,
  items: [],
}

/**
 * 定义右键菜单项，保留泛型类型信息
 */
export function defineContextMenu<Ctx>(items: ContextMenuEntry<Ctx>[]) {
  return items
}

/**
 * 获取全局右键菜单控制器
 */
export function useContextMenu() {
  const state = useState<ContextMenuState>('context-menu', () => ({ ...defaultState }))

  /**
   * 打开右键菜单并完成一次性数据解析
   */
  function openContextMenu<Ctx>(options: ContextMenuOpenOptions<Ctx>) {
    options.event.preventDefault()
    options.event.stopPropagation()
    const items = normalizeEntries(options.items, options.context, closeContextMenu)
    const offset = options.offset ?? 6
    state.value.items = items
    state.value.minWidth = options.minWidth ?? defaultState.minWidth
    state.value.maxHeight = options.maxHeight ?? defaultState.maxHeight
    state.value.x = options.event.clientX + offset
    state.value.y = options.event.clientY + offset
    state.value.visible = items.length > 0
  }

  /**
   * 关闭右键菜单
   */
  function closeContextMenu() {
    state.value.visible = false
  }

  return {
    state,
    openContextMenu,
    closeContextMenu,
  }
}

function normalizeEntries<Ctx>(
  entries: ContextMenuEntry<Ctx>[],
  context: Ctx,
  close: () => void,
) {
  const resolved: ResolvedContextMenuEntry[] = []
  entries.forEach((entry) => {
    if (entry.type === 'separator') {
      resolved.push(entry)
      return
    }
    const visible = resolvePredicate(entry.show, context, true)
    if (!visible) return
    const disabled = resolvePredicate(entry.disabled, context, false)
    const onSelect = () => {
      if (disabled) return
      entry.handler?.({ context, item: entry, close })
      if (!entry.keepOpen) close()
    }
    resolved.push({
      type: 'item',
      id: entry.id,
      label: entry.label,
      icon: entry.icon,
      shortcut: entry.shortcut,
      danger: entry.danger,
      disabled,
      meta: entry.meta,
      onSelect,
    })
  })
  return trimSeparators(resolved)
}

function resolvePredicate<Ctx>(
  value: ContextMenuPredicate<Ctx> | undefined,
  context: Ctx,
  fallback: boolean,
) {
  if (typeof value === 'function') return value(context)
  if (value === undefined) return fallback
  return Boolean(unref(value))
}

function trimSeparators(entries: ResolvedContextMenuEntry[]) {
  const result: ResolvedContextMenuEntry[] = []
  entries.forEach((entry) => {
    const last = result[result.length - 1]
    if (entry.type === 'separator' && (!last || last.type === 'separator')) return
    result.push(entry)
  })
  if (result.length && result[0].type === 'separator') result.shift()
  if (result.length && result[result.length - 1].type === 'separator') result.pop()
  return result
}
