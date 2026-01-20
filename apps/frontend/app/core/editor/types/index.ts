/**
 * Tiptap编辑器类型定义
 * 企业级类型系统
 */

import type { EditorOptions, EditorEvents } from '@tiptap/vue-3'

/**
 * 编辑器模式
 */
export type EditorMode = 'readonly' | 'editable' | 'minimal'

/**
 * 编辑器主题
 */
export type EditorTheme = 'light' | 'dark' | 'auto'

/**
 * 上传配置
 */
export interface UploadConfig {
  /**
   * 是否启用上传
   */
  enabled: boolean
  /**
   * 上传类型
   */
  type: 'image' | 'audio' | 'file'
  /**
   * 最大文件大小（字节）
   */
  maxSize: number
  /**
   * 允许的文件类型
   */
  accept: string[]
  /**
   * 上传API端点
   */
  endpoint: string
  /**
   * 自定义上传处理函数
   */
  handler?: (file: File) => Promise<string>
}

/**
 * 提及建议配置
 */
export interface MentionSuggestionConfig {
  /**
   * 触发字符
   */
  char: string
  /**
   * 建议项获取函数
   */
  items: (query: string) => Promise<any[]>
  /**
   * 渲染模板
   */
  render?: (item: any) => string
}

/**
 * 编辑器配置
 */
export interface EditorConfig extends Partial<EditorOptions> {
  /**
   * 编辑器模式
   */
  mode?: EditorMode
  /**
   * 主题
   */
  theme?: EditorTheme
  /**
   * 占位符文本
   */
  placeholder?: string
  /**
   * 是否启用图片上传
   */
  enableImageUpload?: boolean
  /**
   * 图片上传配置
   */
  imageUploadConfig?: Partial<UploadConfig>
  /**
   * 是否启用提及功能
   */
  enableMention?: boolean
  /**
   * 提及建议配置
   */
  mentionSuggestion?: MentionSuggestionConfig
  /**
   * 是否启用数学公式
   */
  enableMathematics?: boolean
  /**
   * 是否启用代码高亮
   */
  enableCodeHighlight?: boolean
  /**
   * 是否启用表格
   */
  enableTable?: boolean
  /**
   * 是否启用音频
   */
  enableAudio?: boolean
  /**
   * 是否启用Emoji
   */
  enableEmoji?: boolean
  /**
   * 自定义扩展
   */
  customExtensions?: any[]
}

/**
 * 编辑器实例
 */
export interface EditorInstance {
  /**
   * 编辑器实例
   */
  editor: any
  /**
   * 是否已加载
   */
  isLoaded: boolean
  /**
   * 错误信息
   */
  error?: Error
  /**
   * 销毁方法
   */
  destroy: () => void
}

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
 * 扩展配置项
 */
export interface ExtensionItem {
  /**
   * 扩展名称
   */
  name: string
  /**
   * 扩展实例
   */
  extension: any
  /**
   * 是否启用
   */
  enabled: boolean
  /**
   * 配置选项
   */
  config?: Record<string, any>
}

/**
 * 编辑器状态
 */
export interface EditorState {
  /**
   * 是否可编辑
   */
  editable: boolean
  /**
   * 是否为空
   */
  isEmpty: boolean
  /**
   * 字符数
   */
  characterCount: number
  /**
   * 是否正在上传
   */
  isUploading: boolean
  /**
   * 错误信息
   */
  error?: string
  /**
   * 扩展状态
   */
  extensions: Record<string, boolean>
}

/**
 * 编辑器事件处理
 */
export interface EditorEventHandlers {
  /**
   * 初始化完成
   */
  onInit?: () => void
  /**
   * 内容更新
   */
  onUpdate?: (content: any) => void
  /**
   * 选择变化
   */
  onSelectionUpdate?: () => void
  /**
   * 事务处理
   */
  onTransaction?: () => void
  /**
   * 焦点事件
   */
  onFocus?: () => void
  /**
   * 失去焦点
   */
  onBlur?: () => void
  /**
   * 图片上传开始
   */
  onImageUploadStart?: () => void
  /**
   * 图片上传完成
   */
  onImageUploadComplete?: (url: string) => void
  /**
   * 图片上传失败
   */
  onImageUploadError?: (error: Error) => void
}

/**
 * 编辑器工厂选项
 */
export interface EditorFactoryOptions {
  /**
   * 编辑器配置
   */
  config: EditorConfig
  /**
   * 事件处理器
   */
  events?: EditorEventHandlers
  /**
   * 自定义扩展
   */
  customExtensions?: any[]
  /**
   * 上传服务
   */
  uploadService?: any
}