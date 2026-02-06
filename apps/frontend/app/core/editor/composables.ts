/**
 * Tiptap编辑器组合式函数
 * 企业级编辑器工具
 */

import { useEditor, Editor } from '@tiptap/vue-3'
import { 
  getDefaultEditorConfig, 
  editableEditorConfig,
  editableEditorConfigWithApiUpload 
} from './config'
import type { EditorConfigOptions, EditorMode } from './types'
import type { ImageUploadHandler } from './config/extensions'
import { createApiImageUploadHandler } from './plugins/image-upload.plugin'

/**
 * 使用统一配置的编辑器
 */
export const useTiptapEditor = (
  mode: EditorMode = 'editable',
  options: EditorConfigOptions = {},
  imageUploadHandler?: ImageUploadHandler
) => {
  const config = getDefaultEditorConfig(mode, options, imageUploadHandler)
  return useEditor(config)
}

/**
 * 创建只读编辑器实例
 */
export const createReadonlyEditor = (content?: any) => {
  const config = getDefaultEditorConfig('readonly', { 
    content, 
    editable: false 
  })
  return new Editor(config)
}

/**
 * 创建可编辑编辑器实例（带图片上传）
 */
export const createEditableEditor = (
  placeholder?: string, 
  content?: any,
  imageUploadHandler?: ImageUploadHandler
) => {
  const config = editableEditorConfig(placeholder, content, imageUploadHandler)
  return new Editor(config)
}

/**
 * 使用API上传的编辑器
 */
export const useEditorWithApiUpload = (
  options: EditorConfigOptions = {}
) => {
  const uploadHandler = createApiImageUploadHandler()
  const config = editableEditorConfig(
    options.placeholder,
    options.content,
    uploadHandler
  )
  if ((options as any).customExtensions?.length) {
    config.extensions = [
      ...(config.extensions || []),
      ...(options as any).customExtensions
    ]
  }
  
  const mergedConfig = {
    ...config,
    ...options,
    editable: options.editable ?? true,
  }
  
  return useEditor(mergedConfig)
}

/**
 * 使用带图片上传的编辑器（组合式API）
 */
export const useEditorWithImageUpload = (
  options: EditorConfigOptions = {},
  imageUploadHandler?: ImageUploadHandler
) => {
  const config = editableEditorConfig(
    options.placeholder,
    options.content,
    imageUploadHandler
  )
  if ((options as any).customExtensions?.length) {
    config.extensions = [
      ...(config.extensions || []),
      ...(options as any).customExtensions
    ]
  }
  
  const mergedConfig = {
    ...config,
    ...options,
    editable: options.editable ?? true,
  }
  
  return useEditor(mergedConfig)
}

/**
 * 创建使用API上传的编辑器实例
 */
export const createEditorWithApiUpload = (
  placeholder?: string,
  content?: any
) => {
  const config = editableEditorConfigWithApiUpload(placeholder, content)
  return new Editor(config)
}

/**
 * 编辑器工具函数
 */
export const editorUtils = {
  useTiptapEditor,
  createReadonlyEditor,
  createEditableEditor,
  useEditorWithApiUpload,
  useEditorWithImageUpload,
  createEditorWithApiUpload,
}

export default {
  useTiptapEditor,
  createReadonlyEditor,
  createEditableEditor,
  useEditorWithApiUpload,
  useEditorWithImageUpload,
  createEditorWithApiUpload,
  editorUtils,
}
