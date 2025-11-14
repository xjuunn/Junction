
export type AwaitedReturnType<T extends (...args: any) => any> = Awaited<ReturnType<T>>;
export type AwaitedReturnOmit<T extends (...args: any) => any, K extends keyof Awaited<ReturnType<T>>> = Omit<Awaited<ReturnType<T>>, K>;
export type PaginationOptions = { page?: number, limit?: number };