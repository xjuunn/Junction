import axios, {
  type AxiosInstance,
  type AxiosResponse,
  AxiosHeaders,
  type InternalAxiosRequestConfig,
} from 'axios'
import { ApiResponse } from '@junction/types'
import { logger } from './logger'
import { resolveApiBaseUrl } from '~/utils/backend-endpoint'

interface PaginationQuery {
  page?: number
  limit?: number
}

interface RequestOptions {
  headers?: Record<string, string>
}

let redirectingToNoSignal = false

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

        const apiUrl = resolveApiBaseUrl()
        if (!config.baseURL && !config.url?.startsWith('http')) {
          config.baseURL = apiUrl
        }

        if (import.meta.client) {
          const token = useUserStore().authToken.value
          if (token) config.headers.set('Authorization', `Bearer ${token}`)
        }

        return config
      },
      (error) => Promise.reject(error),
    )

    this.instance.interceptors.response.use(
      (response: AxiosResponse) => {
        const res = response.data
        logger.api(response.config.url || '', response.status, res)
        if (!res.success) {
          return Promise.reject(new Error(res.error || '未知错误'))
        }
        return res
      },
      (error) => {
        const message = error?.response?.data?.error || error?.message || '网络错误'
        const status = error?.response?.status || 500
        const url = error?.config?.url || 'Unknown URL'
        logger.api(url, status, error.response?.data || error, true)

        if (import.meta.client) {
          const isNetworkError =
            error?.code === 'ERR_NETWORK' ||
            !error?.response ||
            /network error/i.test(String(error?.message || ''))

          if (isNetworkError) {
            if (!redirectingToNoSignal) {
              redirectingToNoSignal = true
              const from = `${window.location.pathname || '/'}${window.location.search || ''}`
              void navigateTo(
                {
                  path: '/no-signal',
                  query: {
                    reason: 'unreachable',
                    probe: 'network-error',
                    from,
                  },
                },
                { replace: true },
              )
            }
            return Promise.reject(new Error('NETWORK_ERROR'))
          }

          if (status === 401) {
            void navigateTo('/auth/sign-in', { replace: true })
            return Promise.reject(new Error('未登录'))
          }

          useToast().error(message)
        }

        return Promise.reject(new Error(message))
      },
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
    return (await this.instance.get<ApiResponse<T>>(url, { params, ...options })) as any
  }

  async post<T = any>(url: string, data?: any, params?: PaginationQuery, options?: RequestOptions): Promise<ApiResponse<T>> {
    const query = this.applyPaginationOptions(params)
    return (await this.instance.post<ApiResponse<T>>(url, data, { params: query, ...options })) as any
  }

  async patch<T = any>(url: string, data?: any, params?: PaginationQuery, options?: RequestOptions): Promise<ApiResponse<T>> {
    const query = params && Object.keys(params).length > 0 ? this.applyPaginationOptions(params) : undefined
    return (await this.instance.patch<ApiResponse<T>>(url, data, { params: query, ...options })) as any
  }

  async put<T = any>(url: string, data?: any, options?: RequestOptions): Promise<ApiResponse<T>> {
    return (await this.instance.put<ApiResponse<T>>(url, data, { ...options })) as any
  }

  async delete<T = any>(url: string, data?: any, options?: RequestOptions): Promise<ApiResponse<T>> {
    return (await this.instance.delete<ApiResponse<T>>(url, { data, ...options })) as any
  }
}

export const api = new Api()
