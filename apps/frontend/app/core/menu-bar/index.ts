
/**
 * 菜单项
 */
export class MenuItem {
    id: number;  // ID
    name: string;  // 菜单项名
    icon: string;  // ICON
    sort: number = Date.now();  // 排序
    pin: boolean = false;  // 是否固定显示
    path?: string;
    clickHandler: () => void;

    /**
     * 创建菜单项
     * @param id ID
     * @param name 菜单项名
     * @param icon 菜单图标
     * @param pin 是否固定显示
     * @param sort 排序
     */
    constructor(data: MenuItem) {
        this.id = data.id;
        this.name = data.name;
        this.icon = data.icon;
        this.sort = data.sort;
        this.pin = data.pin;
        this.path = data.path;
        this.clickHandler = data.clickHandler;
    }
}

/**
 * 菜单栏
 */
export class MenuBar {
    private static instance: MenuBar | null = null;
    private menuList = reactive<MenuItem[]>([]);

    private constructor() {
        this.addMenuItem(new MenuItem({
            id: 1,
            name: "消息",
            icon: "mingcute:chat-4-fill",
            path: "/",
            sort: 1,
            clickHandler: function () {
                navigateTo(this.path, { replace: true })
            },
            pin: false
        }))
        this.addMenuItem(new MenuItem({
            id: 2,
            name: "At",
            icon: "mingcute:at-fill",
            path: "/test",
            sort: 2,
            clickHandler: function () {
                navigateTo(this.path, { replace: true })
            },
            pin: false
        }))
        this.addMenuItem(new MenuItem({
            id: 3,
            name: "功能",
            icon: "mingcute:classify-2-fill",
            path: "",
            sort: 3,
            clickHandler: function () {
                navigateTo(this.path, { replace: true })
            },
            pin: false
        }))
        this.addMenuItem(new MenuItem({
            id: 4,
            name: "AI",
            icon: "mingcute:ai-fill",
            path: "",
            sort: 4,
            clickHandler: function () {
                navigateTo(this.path, { replace: true })
            },
            pin: false
        }))
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