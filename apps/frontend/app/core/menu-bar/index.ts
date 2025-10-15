
/**
 * 菜单项
 */
export class MenuItem {
    id: number;  // ID
    name: string;  // 菜单项名
    icon: string;  // ICON
    sort: number = Date.now();  // 排序
    pin: boolean = false;  // 是否固定显示
    clickHandler: Function;

    /**
     * 创建菜单项
     * @param id ID
     * @param name 菜单项名
     * @param icon 菜单图标
     * @param pin 是否固定显示
     * @param sort 排序
     */
    constructor(id: number, name: string, icon: string, clickHandler: Function, sort: number = Date.now(), pin: boolean = false) {
        this.id = id;
        this.name = name;
        this.icon = icon;
        this.sort = sort;
        this.pin = pin;
        this.clickHandler = clickHandler;
    }
}

/**
 * 菜单栏
 */
export class MenuBar {
    private static instance: MenuBar | null = null;
    private menuList = reactive<MenuItem[]>([]);

    private constructor() {
        this.addMenuItem(new MenuItem(1, '消息', 'mingcute:chat-4-fill', () => console.log("消息"), 1, true))
        this.addMenuItem(new MenuItem(2, 'At', 'mingcute:at-fill', () => console.log("At"), 3, true))
        this.addMenuItem(new MenuItem(3, '功能', 'mingcute:classify-2-fill', () => console.log("功能"), 2, true))
        this.addMenuItem(new MenuItem(4, 'AI', 'mingcute:ai-fill', () => console.log("AI"), 4, true))
    }

    public static getInstance(): MenuBar {
        if (MenuBar.instance === null) MenuBar.instance = new MenuBar();
        return MenuBar.instance;
    }

    /**
     * 添加菜单项
     * @param menu 菜单项
     */
    public addMenuItem(menu: MenuItem) {
        for (const item of this.menuList) {
            if (item.id === menu.id) throw new Error(`已经存在 ID 为 ${menu.id} 的 Menu : ${JSON.stringify(item)}`)
        }
        this.menuList.push(menu);
    }

    /**
     * 获取菜单列表
     * @returns 菜单列表
     */
    public getMenuList() {
        return this.menuList;
    }

    /**
     * 移除菜单项
     * @param id 要移除的菜单项 ID
     */
    public removeMenuItem(id: number) {
        const index = this.menuList.findIndex(item => item.id === id)
        if (index !== -1) this.menuList.splice(index, 1)
    }
}