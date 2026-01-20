import type { EditorConfigOptions, EditorMode } from './types'
import { editableExtensions, readonlyExtensions } from './extensions'

/**
 * 深度合并对象
 */
const deepMerge = (target: any, source: any) => {
  const result = { ...target }
  for (const key in source) {
    if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
      result[key] = deepMerge(result[key] || {}, source[key])
    } else {
      result[key] = source[key]
    }
  }
  return result
}

/**
 * 获取默认编辑器配置
 */
export const getDefaultEditorConfig = (mode: EditorMode = 'editable', options: EditorConfigOptions = {}) => {
  const { placeholder, editable, content, ...restOptions } = options

  const extensions = mode === 'readonly' 
    ? readonlyExtensions
    : editableExtensions(placeholder)

  const defaultConfig: EditorConfigOptions = {
    extensions,
    content: content ?? null,
    editable: editable ?? (mode !== 'readonly'),
    editorProps: {
      attributes: {
        class: 'prose prose-sm focus:outline-none max-w-none',
      },
    },
  }

  // 深度合并配置，确保自定义 editorProps 不会覆盖默认属性
  const mergedConfig = deepMerge(defaultConfig, restOptions)

  return mergedConfig
}

/**
 * 只读编辑器配置
 */
export const readonlyEditorConfig = (content?: any) => 
  getDefaultEditorConfig('readonly', { content, editable: false })

/**
 * 可编辑编辑器配置
 */
export const editableEditorConfig = (placeholder?: string, content?: any) => 
  getDefaultEditorConfig('editable', { 
    content, 
    placeholder,
    editable: true,
  })