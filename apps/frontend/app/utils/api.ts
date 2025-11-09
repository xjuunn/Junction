import axios, { type AxiosInstance, type AxiosResponse, type InternalAxiosRequestConfig, AxiosHeaders } from 'axios'
import { ApiResponse } from '@junction/types';

class Api {
    private instance: AxiosInstance

    constructor(baseURL: string) {
        this.instance = axios.create({
            baseURL,
            timeout: 15000,
            headers: new AxiosHeaders({ 'Content-Type': 'application/json' }),
        })

        this.instance.interceptors.request.use(
            (config: InternalAxiosRequestConfig) => {
                // 确保 headers 存在
                if (!config.headers) config.headers = new AxiosHeaders()

                const token = localStorage.getItem('token')
                if (token) {
                    config.headers.set('Authorization', `Bearer ${token}`)
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
                const message =
                    error?.response?.data?.error ||
                    error?.message ||
                    '网络错误'
                console.error('[API Error]', message)
                return Promise.reject(new Error(message))
            }
        )
    }

    async get<T = any>(url: string, params?: any): Promise<ApiResponse<T>> {
        return await this.instance.get<ApiResponse<T>>(url, { params }) as any
    }

    async post<T = any>(url: string, data?: any): Promise<ApiResponse<T>> {
        return await this.instance.post<ApiResponse<T>>(url, data) as any
    }

    async put<T = any>(url: string, data?: any): Promise<ApiResponse<T>> {
        return await this.instance.put<ApiResponse<T>>(url, data) as any
    }

    async delete<T = any>(url: string, data?: any): Promise<ApiResponse<T>> {
        return await this.instance.delete<ApiResponse<T>>(url, { data }) as any
    }
}

export const api = new Api('/bgapi/')


