import axios, { type AxiosInstance, type AxiosResponse, AxiosHeaders, type InternalAxiosRequestConfig } from 'axios'
import { ApiResponse } from '@junction/types';

interface PaginationQuery {
    page?: number;
    limit?: number;
}

interface RequestOptions {
    headers?: Record<string, string>;
}

class Api {
    private instance: AxiosInstance
    private defaultPagination: PaginationQuery = { page: 1, limit: 20 }

    constructor() {
        this.instance = axios.create({
            timeout: 15000,
            withCredentials: true,
            headers: new AxiosHeaders({ 'Content-Type': 'application/json' }),
        })
        this.instance.interceptors.request.use(
            (config: InternalAxiosRequestConfig) => {
                if (!config.headers) config.headers = new AxiosHeaders()
                const runtimeConfig = useRuntimeConfig()
                const apiUrl = runtimeConfig.public.apiUrl as string
                if (!config.baseURL && !config.url?.startsWith('http')) {
                    config.baseURL = apiUrl
                }
                if (import.meta.client) {
                    const token = localStorage.getItem('token')
                    if (token) config.headers.set('Authorization', `Bearer ${token}`)
                }

                return config
            },
            (error) => Promise.reject(error)
        )

        this.instance.interceptors.response.use(
            (response: AxiosResponse) => {
                const res = response.data
                if (!res.success) {
                    return Promise.reject(new Error(res.error || '未知错误'))
                }
                return res
            },
            (error) => {
                const message = error?.response?.data?.error || error?.message || '网络错误'
                if (import.meta.client) {
                    useToast().error(message);
                }
                return Promise.reject(new Error(message))
            }
        )
    }

    private applyPaginationOptions(params?: any): any {
        return {
            ...this.defaultPagination,
            ...(params || {}),
        }
    }

    async get<T = any>(url: string, params?: any, options?: RequestOptions): Promise<ApiResponse<T>> {
        params = this.applyPaginationOptions(params)
        return await this.instance.get<ApiResponse<T>>(url, { params, ...options, }) as any
    }

    async post<T = any>(url: string, data?: any, params?: PaginationQuery, options?: RequestOptions): Promise<ApiResponse<T>> {
        const query = this.applyPaginationOptions(params)
        return await this.instance.post<ApiResponse<T>>(url, data, { params: query, ...options, }) as any
    }

    async patch<T = any>(url: string, data?: any, params?: PaginationQuery, options?: RequestOptions): Promise<ApiResponse<T>> {
        const query = this.applyPaginationOptions(params)
        return await this.instance.patch<ApiResponse<T>>(url, data, { params: query, ...options, }) as any
    }

    async put<T = any>(url: string, data?: any, options?: RequestOptions): Promise<ApiResponse<T>> {
        return await this.instance.put<ApiResponse<T>>(url, data, { ...options, }) as any
    }

    async delete<T = any>(url: string, data?: any, options?: RequestOptions): Promise<ApiResponse<T>> {
        return await this.instance.delete<ApiResponse<T>>(url, { data, ...options, }) as any
    }
}

export const api = new Api()