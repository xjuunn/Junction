
export type AwaitedReturnType<T extends (...args: any) => any> = Awaited<ReturnType<T>>;
export type AwaitedReturnOmit<T extends (...args: any) => any, K extends keyof Awaited<ReturnType<T>>> = Omit<Awaited<ReturnType<T>>, K>;
export type PaginationOptions = { page?: number, limit?: number };

// 帮助类型：提取 API 返回的数据类型
export type ExtractDataType<T> = T extends { success: boolean; data: infer D } ? D : never;