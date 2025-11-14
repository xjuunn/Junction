
// 基础API响应
export class ApiResponse<T> {
    // 是否成功
    success: boolean;
    // 错误
    error: string | null;
    // 数据
    data: T | null;
    /**
     * 创建响应对象
     * @param data 数据
     * @param success 是否成功
     * @param error 错误
     */
    constructor(data: T | null, success: boolean = true, error: string | null = null) {
        this.data = data;
        this.success = success;
        this.error = error;
    }
}

// 分页元数据
export class PaginationMeta {
    // 数据总量
    total: number;
    // 页码
    page: number;
    // 分页大小
    limit: number;
    /**
     * 创建分页元数据
     * @param page 页码
     * @param pageSize 分页大小
     * @param total 数据总量
     */
    constructor(page: number, limit: number, total: number) {
        this.page = page;
        this.limit = limit;
        this.total = total;
    }
}

// 分页响应数据
export class PaginationData<T> {
    // 子项
    items: T[];
    // 元数据
    meta: PaginationMeta;
    /**
     * 创建分页元数据
     * @param items 子项
     * @param meta 元数据
     */
    constructor(items: T[], meta: PaginationMeta) {
        this.items = items;
        this.meta = meta;
    }
}

