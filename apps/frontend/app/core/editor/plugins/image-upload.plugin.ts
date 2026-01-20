/**
 * Tiptap图片上传插件
 * 企业级图片上传解决方案
 */

import { Plugin, PluginKey } from '@tiptap/pm/state'
import { uploadFiles } from '~/api/upload'
import type { ImageUploadHandler } from '../config/extensions'

/**
 * 图片上传插件配置
 */
export interface ImageUploadPluginConfig {
  /**
   * 图片上传处理函数
   */
  uploadHandler: ImageUploadHandler
  /**
   * 最大文件大小（字节）
   */
  maxFileSize?: number
  /**
   * 允许的文件类型
   */
  accept?: string[]
  /**
   * 上传失败时的错误处理
   */
  onError?: (error: Error) => void
  /**
   * 上传开始时的回调
   */
  onStart?: () => void
  /**
   * 上传完成时的回调
   */
  onSuccess?: (url: string) => void
}

/**
 * 图片上传插件
 */
export function createImageUploadPlugin(config: ImageUploadPluginConfig) {
  const pluginKey = new PluginKey('imageUpload')

  return new Plugin({
    key: pluginKey,
    props: {
      handlePaste: (view, event) => {
        const items = event.clipboardData?.items
        if (!items) return false

        const files: File[] = []
        for (let i = 0; i < items.length; i++) {
          const item = items[i]
          if (item && item.type.indexOf('image') !== -1) {
            const file = item.getAsFile()
            if (file) {
              files.push(file)
            }
          }
        }

        if (files.length > 0) {
          event.preventDefault()
          handleImageUpload(files, view, config)
          return true
        }

        return false
      },
      handleDrop: (view, event) => {
        const files: File[] = []
        if (event.dataTransfer?.files) {
          for (let i = 0; i < event.dataTransfer.files.length; i++) {
            const file = event.dataTransfer.files[i]
            if (file && file.type.indexOf('image') !== -1) {
              files.push(file)
            }
          }
        }

        if (files.length > 0) {
          event.preventDefault()
          handleImageUpload(files, view, config)
          return true
        }

        return false
      },
    },
  })
}

/**
 * 处理图片上传
 */
async function handleImageUpload(
  files: File[], 
  view: any, 
  config: ImageUploadPluginConfig
) {
  const { uploadHandler, onStart, onSuccess, onError } = config

  try {
    // 验证文件
    for (const file of files) {
      if (config.maxFileSize && file.size > config.maxFileSize) {
        throw new Error(`文件 ${file.name} 大小超过限制`)
      }

      if (config.accept && config.accept.length > 0) {
        if (!config.accept.includes(file.type)) {
          throw new Error(`文件 ${file.name} 类型不被支持`)
        }
      }
    }

    // 开始上传
    onStart?.()

    // 上传文件
    const uploadPromises = files.map(file => uploadHandler(file))
    const urls = await Promise.all(uploadPromises)

    // 插入图片到编辑器
    const { state, dispatch } = view
    const { tr } = state

    urls.forEach(url => {
      const node = state.schema.nodes.image.create({ src: url })
      const transaction = tr.insert(state.selection.from, node)
      dispatch(transaction)
    })

    // 上传成功
    urls.forEach(url => onSuccess?.(url))
  } catch (error: any) {
    console.error('图片上传失败:', error)
    onError?.(error)
  }
}

/**
 * 创建默认图片上传插件
 */
export function createDefaultImageUploadPlugin(uploadHandler: ImageUploadHandler) {
  return createImageUploadPlugin({
    uploadHandler,
    maxFileSize: 5 * 1024 * 1024, // 5MB
    accept: ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'],
    onError: (error) => {
      console.error('图片上传错误:', error)
      // 这里可以添加用户通知
    },
  })
}

/**
 * 使用API上传的图片上传处理函数
 */
export const createApiImageUploadHandler = () => {
  return async (file: File): Promise<string> => {
    try {
      const response = await uploadFiles('image', [file])
      
      if (!response.success) {
        throw new Error(response.error || '上传失败')
      }

      if (!response.data?.files?.[0]) {
        throw new Error('上传成功但未返回文件URL')
      }

      return response.data.files[0]
    } catch (error: any) {
      console.error('API图片上传失败:', error)
      throw error
    }
  }
}

/**
 * 默认导出
 */
export default {
  createImageUploadPlugin,
  createDefaultImageUploadPlugin,
  createApiImageUploadHandler,
}