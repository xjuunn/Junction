import axios, { type AxiosInstance, type AxiosResponse, type InternalAxiosRequestConfig, AxiosHeaders } from 'axios'

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
            (response: AxiosResponse) => response.data,
            (error) => {
                console.error('[API Error]', error.response?.data || error.message)
                return Promise.reject(error)
            }
        )
    }

    get<T = any>(url: string, params?: any) {
        return this.instance.get<T>(url, { params })
    }

    post<T = any>(url: string, data?: any) {
        return this.instance.post<T>(url, data)
    }

    put<T = any>(url: string, data?: any) {
        return this.instance.put<T>(url, data)
    }

    delete<T = any>(url: string, data?: any) {
        return this.instance.delete<T>(url, { data })
    }
}

export const api = new Api('/api/')


