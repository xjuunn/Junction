/**
 * 编辑器上传服务
 * 企业级文件上传管理
 */

import { api } from '~/utils/api'

/**
 * 上传响应
 */
export interface UploadResponse {
  /**
   * 是否成功
   */
  success: boolean
  /**
   * 文件URL
   */
  url?: string
  /**
   * 错误信息
   */
  error?: string
  /**
   * 原始响应
   */
  data?: any
}

/**
 * 上传服务配置
 */
export interface UploadServiceConfig {
  /**
   * 上传端点
   */
  endpoint: string
  /**
   * 默认上传类型
   */
  defaultType: string
  /**
   * 最大文件大小（字节）
   */
  maxSize: number
  /**
   * 允许的文件类型
   */
  accept: string[]
  /**
   * 是否允许多文件上传
   */
  multiple: boolean
}

/**
 * 上传文件选项
 */
export interface UploadFileOptions {
  /**
   * 上传类型
   */
  type?: string
  /**
   * 自定义端点
   */
  endpoint?: string
  /**
   * 上传进度回调
   */
  onProgress?: (progress: number) => void
  /**
   * 自定义标头
   */
  headers?: Record<string, string>
}

/**
 * 上传服务类
 */
export class UploadService {
  private config: UploadServiceConfig

  constructor(config: Partial<UploadServiceConfig> = {}) {
    this.config = {
      endpoint: '/upload/files',
      defaultType: 'editor',
      maxSize: 5 * 1024 * 1024, // 5MB
      accept: ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'],
      multiple: true,
      ...config,
    }
  }

  /**
   * 验证文件
   */
  validateFile(file: File): string | null {
    // 检查文件大小
    if (file.size > this.config.maxSize) {
      return `文件大小不能超过 ${this.formatFileSize(this.config.maxSize)}`
    }

    // 检查文件类型
    if (this.config.accept.length > 0 && !this.config.accept.includes(file.type)) {
      const acceptedTypes = this.config.accept.join(', ')
      return `只支持以下文件类型: ${acceptedTypes}`
    }

    return null
  }

  /**
   * 上传单个文件
   */
  async uploadFile(file: File, options: UploadFileOptions = {}): Promise<UploadResponse> {
    try {
      // 验证文件
      const error = this.validateFile(file)
      if (error) {
        return {
          success: false,
          error,
        }
      }

      const type = options.type || this.config.defaultType
      const endpoint = options.endpoint || this.config.endpoint

      // 创建FormData
      const formData = new FormData()
      formData.append('type', type)
      formData.append('files', file)

      // 执行上传
      const response = await api.post(endpoint, formData, {}, {
        headers: {
          'Content-Type': 'multipart/form-data',
          ...options.headers,
        },
      })

      return this.handleUploadResponse(response)
    } catch (error: any) {
      return {
        success: false,
        error: error.message || '上传过程中发生错误',
      }
    }
  }

  /**
   * 处理上传响应
   */
  private handleUploadResponse(response: any): UploadResponse {
    if (response.success && response.data?.files?.[0]) {
      const fileUrl = response.data.files[0]
      return {
        success: true,
        url: this.normalizeUrl(fileUrl),
        data: response.data,
      }
    }

    return {
      success: false,
      error: response.error || '上传失败',
      data: response.data,
    }
  }

  /**
   * 上传多个文件
   */
  async uploadFiles(files: File[], options: UploadFileOptions = {}): Promise<UploadResponse[]> {
    const uploadPromises = files.map(file => this.uploadFile(file, options))
    return Promise.all(uploadPromises)
  }

  /**
   * 处理图片上传（Tiptap专用）
   */
  async handleImageUpload(file: File): Promise<string> {
    const result = await this.uploadFile(file, { type: 'image' })
    
    if (!result.success) {
      throw new Error(result.error || '图片上传失败')
    }

    if (!result.url) {
      throw new Error('上传成功但未返回URL')
    }

    return result.url
  }

  /**
   * 处理拖放上传
   */
  async handleDropUpload(dataTransfer: DataTransfer, options: UploadFileOptions = {}): Promise<UploadResponse[]> {
    const files: File[] = []
    
    for (let i = 0; i < dataTransfer.files.length; i++) {
      const file = dataTransfer.files[i]
      if (file && this.validateFile(file) === null) {
        files.push(file)
      }
    }

    if (files.length === 0) {
      return []
    }

    return this.uploadFiles(files, options)
  }

  /**
   * 处理粘贴上传
   */
  async handlePasteUpload(clipboardData: DataTransfer, options: UploadFileOptions = {}): Promise<UploadResponse[]> {
    return this.handleDropUpload(clipboardData, options)
  }

  /**
   * 格式化文件大小
   */
  private formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes'
    
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  /**
   * 标准化URL
   */
  private normalizeUrl(url: string): string {
    if (url.startsWith('http')) {
      return url
    }
    
    // 添加基础路径
    try {
      const runtimeConfig = useRuntimeConfig()
      const baseUrl = runtimeConfig.public.apiUrl as string || ''
      
      if (url.startsWith('/')) {
        return baseUrl + url
      }
      
      return baseUrl + '/' + url
    } catch {
      return url
    }
  }

  /**
   * 更新配置
   */
  updateConfig(config: Partial<UploadServiceConfig>) {
    this.config = { ...this.config, ...config }
  }

  /**
   * 获取配置
   */
  getConfig(): UploadServiceConfig {
    return { ...this.config }
  }

  /**
   * 创建图片上传处理函数
   */
  createImageUploadHandler() {
    return async (file: File) => {
      return this.handleImageUpload(file)
    }
  }
}

/**
 * 创建默认上传服务
 */
export const createUploadService = (config: Partial<UploadServiceConfig> = {}) => {
  return new UploadService(config)
}

/**
 * 默认上传服务实例
 */
export const defaultUploadService = createUploadService()