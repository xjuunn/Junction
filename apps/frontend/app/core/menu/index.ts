/**
 * 菜单上下文类型
 */
export type MenuClickContext = any;

/**
 * 菜单项配置接口
 */
export interface MenuOptions<Ctx = MenuClickContext> {
    /** 唯一标识 */
    id: string | number;
    /** 显示名称 */
    name: string;
    /** 图标代码 (Iconify) */
    icon: string;
    /** 路由路径 */
    path?: string;
    /** 分组标识 (默认 'default') */
    group?: string;
    /** 扩展元数据 (权限、标签等) */
    meta?: Record<string, any>;
    /** 
     * 跳转模式配置 
     * - boolean: 强制指定 (true=replace, false=push)
     * - function: 运行时动态计算
     */
    replace?: boolean | ((item: MenuItem<Ctx>, context?: Ctx) => boolean);
    /** 
     * 自定义点击事件 
     * 若存在，将优先执行此回调，不再自动触发 path 跳转(除非回调内手动处理)
     */
    handler?: (item: MenuItem<Ctx>, context?: Ctx) => void;
}

/**
 * 菜单项类
 * 实现了数据与行为的封装
 */
export class MenuItem<Ctx = MenuClickContext> {
    /** 唯一标识 (只读) */
    public readonly id: string | number;
    /** 菜单名称 */
    public name: string;
    /** 图标 */
    public icon: string;
    /** 跳转路径 */
    public path?: string;
    /** 分组 */
    public group: string;
    /** 元数据 */
    public meta: Record<string, any>;

    /**
     * @internal
     * 内部存储 replace 配置，受保护字段
     */
    protected _replaceOption: boolean | ((item: MenuItem<Ctx>, context?: Ctx) => boolean);

    /**
     * @internal
     * 内部存储 handler 配置，受保护字段
     */
    protected _handler?: (item: MenuItem<Ctx>, context?: Ctx) => void;

    /**
     * 创建菜单项实例
     * @param options 配置对象
     */
    constructor(options: MenuOptions<Ctx>) {
        this.id = options.id;
        this.name = options.name;
        this.icon = options.icon;
        this.path = options.path;
        this.group = options.group || 'default';
        this.meta = options.meta || {};

        // 初始化内部状态
        this._replaceOption = options.replace ?? false;
        this._handler = options.handler;
    }

    /**
     * 计算当前是否需要 Replace 跳转
     * @param context 运行时上下文
     */
    public getShouldReplace(context?: Ctx): boolean {
        if (typeof this._replaceOption === 'function') {
            return this._replaceOption(this, context);
        }
        return this._replaceOption;
    }

    /**
     * 触发菜单点击行为
     * 组件层应调用此方法，而非直接跳转
     * @param context 运行时上下文
     */
    public click(context?: Ctx): void {
        // 1. 优先执行自定义 Handler
        if (this._handler) {
            this._handler(this, context);
            return;
        }

        // 2. 执行默认路由跳转
        if (this.path) {
            const isReplace = this.getShouldReplace(context);
            navigateTo(this.path, { replace: isReplace });
        }
    }
}

/**
 * 菜单管理器
 * 全局单例，管理菜单的生命周期与响应式状态
 */
export class MenuService {
    private static instance: MenuService;

    /* 菜单列表 */
    private menuList: Ref<MenuItem[]>;

    private constructor() {
        // 初始化为空数组
        this.menuList = ref([]);
        this.initDefault();
    }

    /**
     * 获取全局单例
     */
    public static getInstance(): MenuService {
        if (!MenuService.instance) {
            MenuService.instance = new MenuService();
        }
        return MenuService.instance;
    }

    /**
     * 初始化默认菜单 (示例)
     */
    private initDefault() {
        this.add({
            id: 'chat',
            name: '会话',
            icon: 'mingcute:chat-4-fill',
            path: '/',
            group: 'main'
        });

        this.add({
            id: 'contacts',
            name: '通讯录',
            icon: 'mingcute:contacts-3-fill',
            path: '/contacts',
            group: 'main',
            replace: true
        });

        this.add({
            id: 'features',
            name: '功能',
            icon: 'mingcute:classify-2-fill',
            path: '/features',
            group: 'main',
            replace: true
        });

        this.add({
            id: 'profile',
            name: "档案",
            icon: "mingcute:profile-fill",
            path: "/profile",
            group: 'main',
            replace: true
        })
    }

    /**
     * 添加菜单项
     * @param options 菜单配置
     * @returns 新创建的菜单项实例
     */
    public add(options: MenuOptions): MenuItem {
        // 查重：避免重复添加
        const existingItem = this.menuList.value.find(i => i.id === options.id);
        if (existingItem) {
            console.warn(`[MenuService] 重复菜单ID: ${options.id}`);
            return existingItem;
        }

        const newItem = new MenuItem(options);
        this.menuList.value.push(newItem);
        return newItem;
    }

    /**
     * 批量添加菜单
     * @param optionsList 配置数组
     */
    public addBatch(optionsList: MenuOptions[]): void {
        optionsList.forEach(opt => this.add(opt));
    }

    /**
     * 移除菜单项
     * @param id 菜单 ID
     */
    public remove(id: string | number): void {
        const index = this.menuList.value.findIndex(item => item.id === id);
        if (index > -1) {
            this.menuList.value.splice(index, 1);
        }
    }

    /**
     * 获取所有菜单列表 (响应式)
     * @returns MenuItem 数组
     */
    public getMenus(): MenuItem[] {
        return this.menuList.value;
    }

    /**
     * 获取分组后的菜单
     * @returns 计算属性：按 group 分组的菜单对象
     */
    public getGroupedMenus(): ComputedRef<Record<string, MenuItem[]>> {
        return computed(() => {
            const groups: Record<string, MenuItem[]> = {};

            this.menuList.value.forEach((item) => {
                const groupName = item.group;
                if (!groups[groupName]) {
                    groups[groupName] = [];
                }
                groups[groupName].push(item);
            });

            return groups;
        });
    }

    /**
     * 清空菜单
     */
    public clear(): void {
        this.menuList.value = [];
    }
}

// 导出单例实例
export const menuService = MenuService.getInstance();