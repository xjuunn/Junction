import type { EditorConfigOptions, EditorMode } from './types'
import { createEditableExtensions, createReadonlyExtensions } from './config/extensions'
import type { ImageUploadHandler } from './config/extensions'
import { createDefaultImageUploadPlugin, createApiImageUploadHandler } from './plugins/image-upload.plugin'

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
export const getDefaultEditorConfig = (
  mode: EditorMode = 'editable', 
  options: EditorConfigOptions = {},
  imageUploadHandler?: ImageUploadHandler
) => {
  const { placeholder, editable, content, customExtensions, ...restOptions } = options as EditorConfigOptions & { customExtensions?: any[] }
  
  // 从restOptions中提取enableImageUpload，因为它不是EditorOptions的一部分
  const enableImageUpload = (options as any).enableImageUpload

  // 获取基础扩展
  const extensions = mode === 'readonly' 
    ? createReadonlyExtensions()
    : createEditableExtensions(placeholder)
  const finalExtensions = customExtensions?.length ? [...extensions, ...customExtensions] : extensions

  // 如果有图片上传处理函数，添加图片上传插件
  const plugins: any[] = []
  if (imageUploadHandler && enableImageUpload !== false) {
    const imageUploadPlugin = createDefaultImageUploadPlugin(imageUploadHandler)
    plugins.push(imageUploadPlugin)
  }

  const defaultConfig: EditorConfigOptions = {
    extensions: finalExtensions,
    content: content ?? null,
    editable: editable ?? (mode !== 'readonly'),
    editorProps: {
      attributes: {
        class: 'prose prose-sm focus:outline-none max-w-none',
      },
    },
    ...(plugins.length > 0 ? { plugins } : {}),
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
 * 可编辑编辑器配置（带图片上传）
 */
export const editableEditorConfig = (
  placeholder?: string, 
  content?: any,
  imageUploadHandler?: ImageUploadHandler
) => 
  getDefaultEditorConfig('editable', { 
    content, 
    placeholder,
    editable: true,

  }, imageUploadHandler)

/**
 * 使用API上传的可编辑编辑器配置
 */
export const editableEditorConfigWithApiUpload = (
  placeholder?: string,
  content?: any
) => {
  const uploadHandler = createApiImageUploadHandler()
  return editableEditorConfig(placeholder, content, uploadHandler)
}
