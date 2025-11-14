import axios, { type AxiosInstance, type AxiosResponse, type InternalAxiosRequestConfig, AxiosHeaders } from 'axios'
import { ApiResponse } from '@junction/types';

interface PaginationQuery {
    page?: number;
    limit?: number;
}

class Api {
    private instance: AxiosInstance
    private defaultPagination: PaginationQuery = { page: 1, limit: 20 }

    constructor(baseURL: string) {
        this.instance = axios.create({
            baseURL,
            timeout: 15000,
            headers: new AxiosHeaders({ 'Content-Type': 'application/json' }),
        })

        // 请求拦截
        this.instance.interceptors.request.use(
            (config) => {
                if (!config.headers) config.headers = new AxiosHeaders()
                const token = localStorage.getItem('token')
                if (token) config.headers.set('Authorization', `Bearer ${token}`)
                return config
            },
            (error) => Promise.reject(error)
        )

        // 响应拦截
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
                console.error('[API Error]', message)
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

    async get<T = any>(url: string, params?: any): Promise<ApiResponse<T>> {
        params = this.applyPaginationOptions(params)
        return await this.instance.get<ApiResponse<T>>(url, { params }) as any
    }

    async post<T = any>(url: string, data?: any, params?: PaginationQuery): Promise<ApiResponse<T>> {
        const query = this.applyPaginationOptions(params)
        return await this.instance.post<ApiResponse<T>>(url, data, { params: query }) as any
    }

    async patch<T = any>(url: string, data?: any, params?: PaginationQuery): Promise<ApiResponse<T>> {
        const query = this.applyPaginationOptions(params)
        return await this.instance.patch<ApiResponse<T>>(url, data, { params: query }) as any
    }

    async put<T = any>(url: string, data?: any): Promise<ApiResponse<T>> {
        return await this.instance.put<ApiResponse<T>>(url, data) as any
    }

    async delete<T = any>(url: string, data?: any): Promise<ApiResponse<T>> {
        return await this.instance.delete<ApiResponse<T>>(url, { data }) as any
    }
}

export const api = new Api('/bgapi/')
