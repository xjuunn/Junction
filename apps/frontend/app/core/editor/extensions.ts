import StarterKit from '@tiptap/starter-kit'
import Placeholder from '@tiptap/extension-placeholder'
import Link from '@tiptap/extension-link'

/**
 * 基础扩展插件配置
 */
export const baseExtensions = [
  StarterKit,
]

/**
 * 链接扩展插件配置
 */
export const linkExtension = Link.configure({
  openOnClick: false,
  HTMLAttributes: {
    class: 'text-blue-500 hover:text-blue-700 underline',
  },
})

/**
 * 占位符扩展插件配置
 */
export const createPlaceholderExtension = (placeholder: string = '输入消息...') => 
  Placeholder.configure({
    placeholder,
  })

/**
 * 只读编辑器扩展插件
 */
export const readonlyExtensions = [
  StarterKit,
]

/**
 * 可编辑编辑器扩展插件
 */
export const editableExtensions = (placeholder?: string) => [
  StarterKit,
  linkExtension,
  createPlaceholderExtension(placeholder),
]

/**
 * 所有可用扩展插件
 */
export const allExtensions = {
  baseExtensions,
  readonlyExtensions,
  editableExtensions,
  linkExtension,
  createPlaceholderExtension,
}