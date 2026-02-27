export type MenuClickContext = any

export interface MenuOptions<Ctx = MenuClickContext> {
  id: string | number
  name: string
  icon: string
  path?: string
  group?: string
  meta?: Record<string, any>
  extraClass?: string
  replace?: boolean | ((item: MenuItem<Ctx>, context?: Ctx) => boolean)
  show?: boolean | Ref<boolean> | ComputedRef<boolean> | ((item: MenuItem<Ctx>, context?: Ctx) => boolean)
  handler?: (item: MenuItem<Ctx>, context?: Ctx) => void | Promise<void>
}

export class MenuItem<Ctx = MenuClickContext> {
  public readonly id: string | number
  public name: string
  public icon: string
  public path?: string
  public group: string
  public meta: Record<string, any>
  public extraClass?: string

  protected _replaceOption: boolean | ((item: MenuItem<Ctx>, context?: Ctx) => boolean)
  protected _showOption: boolean | Ref<boolean> | ComputedRef<boolean> | ((item: MenuItem<Ctx>, context?: Ctx) => boolean)
  protected _handler?: (item: MenuItem<Ctx>, context?: Ctx) => void | Promise<void>

  constructor(options: MenuOptions<Ctx>) {
    this.id = options.id
    this.name = options.name
    this.icon = options.icon
    this.path = options.path
    this.group = options.group || 'default'
    this.meta = options.meta || {}
    this.extraClass = options.extraClass
    this._replaceOption = options.replace ?? false
    this._showOption = options.show ?? true
    this._handler = options.handler
  }

  public getShouldReplace(context?: Ctx): boolean {
    if (typeof this._replaceOption === 'function') return this._replaceOption(this, context)
    return this._replaceOption
  }

  public getShouldShow(context?: Ctx): boolean {
    if (isRef(this._showOption)) return this._showOption.value
    if (typeof this._showOption === 'function') return this._showOption(this, context)
    return !!this._showOption
  }

  public click(context?: Ctx): void {
    if (this._handler) {
      void this._handler(this, context)
      return
    }
    if (this.path) {
      void navigateTo(this.path, { replace: this.getShouldReplace(context) })
    }
  }
}

export class MenuService {
  private static instance: MenuService
  private menuList: Ref<MenuItem[]>

  private constructor() {
    this.menuList = ref([])
    this.initDefault()
  }

  public static getInstance(): MenuService {
    if (!MenuService.instance) MenuService.instance = new MenuService()
    return MenuService.instance
  }

  private initDefault() {
    this.add({
      id: 'chat',
      name: '会话',
      icon: 'mingcute:chat-4-line',
      path: '/chat',
      group: 'main',
    })

    this.add({
      id: 'contacts',
      name: '通讯录',
      icon: 'mingcute:contacts-3-line',
      path: '/contacts',
      group: 'main',
      replace: true,
    })

    this.add({
      id: 'features',
      name: '功能',
      icon: 'mingcute:classify-2-line',
      path: '/dashboard',
      group: 'main',
      replace: true,
    })

    this.add({
      id: 'profile',
      name: '个人资料',
      icon: 'mingcute:profile-line',
      path: '/profile',
      group: 'main',
      replace: true,
    })

    this.addBatch([
      {
        id: 'notification',
        name: '通知',
        icon: 'mingcute:notification-line',
        path: '/notification',
        group: 'system',
        extraClass: 'xl:hidden',
      },
      {
        id: 'settings',
        name: '设置',
        icon: 'mingcute:settings-3-line',
        path: '/settings',
        group: 'system',
      },
      {
        id: 'theme',
        name: '主题',
        icon: 'mingcute:sun-line',
        handler: async (item, context: any) => {
          const isDark = await AppTheme.getInstance().toggleTheme({
            x: context?.clientX ?? 0,
            y: context?.clientY ?? 0,
          })
          if (isDark) {
            item.icon = 'mingcute:sun-line'
            item.name = '浅色模式'
          } else {
            item.icon = 'mingcute:moon-line'
            item.name = '深色模式'
          }
        },
        group: 'system',
      },
    ])
  }

  public add(options: MenuOptions): MenuItem {
    const existingItem = this.menuList.value.find(item => item.id === options.id)
    if (existingItem) return existingItem
    const item = new MenuItem(options)
    this.menuList.value.push(item)
    return item
  }

  public addBatch(optionsList: MenuOptions[]): void {
    optionsList.forEach(option => this.add(option))
  }

  public remove(id: string | number): void {
    const index = this.menuList.value.findIndex(item => item.id === id)
    if (index > -1) this.menuList.value.splice(index, 1)
  }

  public getMenus(): MenuItem[] {
    return this.menuList.value
  }

  public getGroupedMenus(): ComputedRef<Record<string, MenuItem[]>> {
    return computed(() => {
      const groups: Record<string, MenuItem[]> = {}
      this.menuList.value.forEach((item) => {
        if (!item.getShouldShow()) return
        if (!groups[item.group]) groups[item.group] = []
        groups[item.group].push(item)
      })
      return groups
    })
  }

  public clear(): void {
    this.menuList.value = []
  }
}

export const menuService = MenuService.getInstance()
