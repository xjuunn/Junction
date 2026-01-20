import { useEditor, Editor } from '@tiptap/vue-3'
import { getDefaultEditorConfig } from './config'
import type { EditorConfigOptions, EditorMode } from './types'

/**
 * 使用统一配置的编辑器 (Vue 组合式 API)
 */
export const useTiptapEditor = (mode: EditorMode = 'editable', options: EditorConfigOptions = {}) => {
  const config = getDefaultEditorConfig(mode, options)
  return useEditor(config)
}

/**
 * 创建只读编辑器实例 (非响应式)
 */
export const createReadonlyEditor = (content?: any) => {
  const config = getDefaultEditorConfig('readonly', { content, editable: false })
  return new Editor(config)
}

/**
 * 创建可编辑编辑器实例 (非响应式)
 */
export const createEditableEditor = (placeholder?: string, content?: any) => {
  const config = getDefaultEditorConfig('editable', { 
    content, 
    placeholder,
    editable: true,
  })
  return new Editor(config)
}