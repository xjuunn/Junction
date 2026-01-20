import type { EditorOptions } from '@tiptap/vue-3'

/**
 * 编辑器配置选项
 */
export interface EditorConfigOptions extends Partial<EditorOptions> {
  /**
   * 是否可编辑
   */
  editable?: boolean
  /**
   * 占位符文本
   */
  placeholder?: string
  /**
   * 是否启用链接扩展
   */
  enableLink?: boolean
  /**
   * 编辑器内容
   */
  content?: any
}

/**
 * 编辑器模式
 */
export type EditorMode = 'readonly' | 'editable'

/**
 * 创建编辑器的参数
 */
export interface CreateEditorParams {
  /**
   * 编辑器模式
   */
  mode?: EditorMode
  /**
   * 编辑器配置选项
   */
  options?: EditorConfigOptions
}