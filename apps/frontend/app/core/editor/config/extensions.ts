/**
 * Tiptap扩展配置
 * 企业级统一配置
 */

// 基础扩展 - 确保这些扩展在package.json中已安装
import StarterKit from '@tiptap/starter-kit'
import Placeholder from '@tiptap/extension-placeholder'
import Link from '@tiptap/extension-link'
import Image from '@tiptap/extension-image'

// 高级扩展
import { Table, TableRow, TableCell, TableHeader } from '@tiptap/extension-table'
import { CodeBlock } from '@tiptap/extension-code-block'
import { CodeBlockLowlight } from '@tiptap/extension-code-block-lowlight'
import { Blockquote } from '@tiptap/extension-blockquote'
import { HorizontalRule } from '@tiptap/extension-horizontal-rule'
import { HardBreak } from '@tiptap/extension-hard-break'
import { Mathematics } from '@tiptap/extension-mathematics'
import { Emoji } from '@tiptap/extension-emoji'
import { Audio } from '@tiptap/extension-audio'
import { Mention } from '@tiptap/extension-mention'

// 依赖库
import * as lowlight from 'lowlight'
import katex from 'katex'

/**
 * 扩展配置接口
 */
export interface ExtensionConfig {
  name: string
  enabled: boolean
  config?: Record<string, any>
}

/**
 * 图片上传处理函数
 */
export type ImageUploadHandler = (file: File) => Promise<string>

/**
 * 默认扩展配置
 * 根据业务需求选择性启用扩展
 */
const DEFAULT_EXTENSIONS_CONFIG: Record<string, ExtensionConfig> = {
  // 基础编辑功能
  starterKit: {
    name: 'starterKit',
    enabled: true,
    config: {
      heading: {
        levels: [1, 2, 3, 4, 5, 6],
      },
      bulletList: {
        keepMarks: true,
        keepAttributes: false,
      },
      orderedList: {
        keepMarks: true,
        keepAttributes: false,
      },
      code: {
        HTMLAttributes: {
          class: 'bg-gray-100 text-red-600 rounded px-1 py-0.5 font-mono text-sm',
        },
      },
    },
  },

  // 链接
  link: {
    name: 'link',
    enabled: true,
    config: {
      openOnClick: false,
      HTMLAttributes: {
        class: 'text-blue-500 hover:text-blue-700 underline',
        rel: 'noopener noreferrer',
        target: '_blank',
      },
    },
  },

  // 占位符
  placeholder: {
    name: 'placeholder',
    enabled: true,
    config: {
      placeholder: '开始输入...',
      showOnlyWhenEditable: true,
    },
  },

  // 图片（默认启用）
  image: {
    name: 'image',
    enabled: true,
    config: {
      inline: true,
      allowBase64: false,
      HTMLAttributes: {
        class: 'editor-image',
        style: 'max-width: 100%; height: auto; display: block; margin: 8px 0; border-radius: 8px; border: 1px solid #e5e7eb;',
        alt: '',
        title: '',
      },
    },
  },

  // 表格（默认禁用，可按需启用）
  table: {
    name: 'table',
    enabled: false,
    config: {
      resizable: true,
      lastColumnResizable: true,
    },
  },

  // 代码块（默认禁用）
  codeBlock: {
    name: 'codeBlock',
    enabled: false,
    config: {
      languageClassPrefix: 'language-',
      HTMLAttributes: {
        class: 'rounded-md bg-gray-900 text-gray-100 p-4 font-mono text-sm',
      },
    },
  },

  // 代码高亮块（默认禁用）
  codeBlockLowlight: {
    name: 'codeBlockLowlight',
    enabled: false,
    config: {
      lowlight,
      defaultLanguage: 'javascript',
    },
  },

  // 引用
  blockquote: {
    name: 'blockquote',
    enabled: true,
    config: {
      HTMLAttributes: {
        class: 'border-l-4 border-gray-300 pl-4 italic text-gray-600 my-4',
      },
    },
  },

  // 水平线
  horizontalRule: {
    name: 'horizontalRule',
    enabled: true,
    config: {
      HTMLAttributes: {
        class: 'my-8 border-t border-gray-300',
      },
    },
  },

  // 硬换行
  hardBreak: {
    name: 'hardBreak',
    enabled: true,
  },

  // 数学公式（默认禁用）
  mathematics: {
    name: 'mathematics',
    enabled: false,
    config: {
      katexOptions: {
        throwOnError: false,
        displayMode: false,
      },
      katex,
      HTMLAttributes: {
        class: 'math-inline',
      },
    },
  },

  // Emoji（默认禁用）
  emoji: {
    name: 'emoji',
    enabled: false,
    config: {
      enableEmoticons: true,
      HTMLAttributes: {
        class: 'emoji inline-block align-text-bottom',
      },
    },
  },

  // 音频（默认禁用）
  audio: {
    name: 'audio',
    enabled: false,
    config: {
      HTMLAttributes: {
        class: 'my-4',
        controls: true,
      },
    },
  },

  // 提及（默认禁用）
  mention: {
    name: 'mention',
    enabled: false,
  },
}

/**
 * 扩展工厂
 */
export class ExtensionFactory {
  private configs: Record<string, ExtensionConfig>
  private imageUploadHandler?: ImageUploadHandler

  constructor(
    configs: Record<string, ExtensionConfig> = DEFAULT_EXTENSIONS_CONFIG,
    imageUploadHandler?: ImageUploadHandler
  ) {
    this.configs = { ...configs }
    this.imageUploadHandler = imageUploadHandler
  }

  /**
   * 获取所有启用的扩展
   */
  getExtensions(): any[] {
    const extensions: any[] = []

    for (const [key, config] of Object.entries(this.configs)) {
      if (!config.enabled) {
        continue
      }

      let extension: any

      switch (key) {
        case 'starterKit':
          extension = StarterKit.configure(config.config || {})
          break

        case 'link':
          extension = Link.configure(config.config || {})
          break

        case 'placeholder':
          extension = Placeholder.configure(config.config || {})
          break

        case 'image':
          extension = this.createImageExtension(config)
          break

        case 'table':
          extension = Table.configure(config.config || {})
          break

        case 'codeBlock':
          extension = CodeBlock.configure(config.config || {})
          break

        case 'codeBlockLowlight':
          extension = CodeBlockLowlight.configure(config.config || {})
          break

        case 'blockquote':
          extension = Blockquote.configure(config.config || {})
          break

        case 'horizontalRule':
          extension = HorizontalRule.configure(config.config || {})
          break

        case 'hardBreak':
          extension = HardBreak.configure(config.config || {})
          break

        case 'mathematics':
          extension = Mathematics.configure(config.config || {})
          break

        case 'emoji':
          extension = Emoji.configure(config.config || {})
          break

        case 'audio':
          extension = Audio.configure(config.config || {})
          break

        case 'mention':
          extension = this.createMentionExtension(config)
          break

        default:
          console.warn(`未知扩展: ${key}`)
          continue
      }

      if (extension) {
        extensions.push(extension)
      }
    }

    // 表格相关扩展需要特殊处理
    if (this.configs.table?.enabled) {
      extensions.push(TableRow.configure({}))
      extensions.push(TableCell.configure({}))
      extensions.push(TableHeader.configure({}))
    }

    return extensions
  }

  /**
   * 创建图片扩展（支持上传）
   */
  private createImageExtension(config: ExtensionConfig): any {
    const imageConfig = {
      ...config.config,
      inline: true,
      allowBase64: false,
      HTMLAttributes: {
        class: 'max-w-full h-auto rounded-lg border border-gray-200',
        ...config.config?.HTMLAttributes,
      },
    }

    // 如果有上传处理函数，添加自定义上传逻辑
    if (this.imageUploadHandler) {
      // 这里可以添加自定义上传逻辑
      // 暂时使用基础配置
      return Image.configure(imageConfig)
    }

    return Image.configure(imageConfig)
  }

  /**
   * 创建提及扩展
   */
  private createMentionExtension(config: ExtensionConfig): any {
    const mentionConfig = {
      ...config.config,
      HTMLAttributes: {
        class: 'mention bg-blue-100 text-blue-800 rounded px-1',
        ...config.config?.HTMLAttributes,
      },
    }

    return Mention.configure(mentionConfig)
  }

  /**
   * 更新配置
   */
  updateConfig(key: string, config: Partial<ExtensionConfig>) {
    if (this.configs[key]) {
      this.configs[key] = {
        ...this.configs[key],
        ...config,
        config: {
          ...this.configs[key].config,
          ...config.config,
        },
      }
    } else {
      this.configs[key] = {
        name: key,
        enabled: true,
        ...config,
      } as ExtensionConfig
    }
  }

  /**
   * 启用/禁用扩展
   */
  setExtensionEnabled(key: string, enabled: boolean) {
    if (this.configs[key]) {
      this.configs[key].enabled = enabled
    }
  }

  /**
   * 获取配置状态
   */
  getConfigStatus() {
    const status: Record<string, boolean> = {}
    for (const [key, config] of Object.entries(this.configs)) {
      status[key] = config.enabled
    }
    return status
  }

  /**
   * 创建只读模式扩展
   */
  createReadonlyExtensions(): any[] {
    const readonlyConfigs = { ...this.configs }

    // 只读模式下禁用占位符
    if (readonlyConfigs.placeholder) {
      readonlyConfigs.placeholder.enabled = false
    }

    // 只读模式下禁用提及（如果启用）
    if (readonlyConfigs.mention) {
      readonlyConfigs.mention.enabled = false
    }

    const factory = new ExtensionFactory(readonlyConfigs, this.imageUploadHandler)
    return factory.getExtensions()
  }

  /**
   * 创建可编辑模式扩展
   */
  createEditableExtensions(placeholder?: string): any[] {
    const editableConfigs = { ...this.configs }
    
    // 可编辑模式下启用占位符
    if (editableConfigs.placeholder) {
      editableConfigs.placeholder.enabled = true
      if (placeholder) {
        editableConfigs.placeholder.config = {
          ...editableConfigs.placeholder.config,
          placeholder,
        }
      }
    }

    const factory = new ExtensionFactory(editableConfigs, this.imageUploadHandler)
    return factory.getExtensions()
  }
}

/**
 * 创建默认扩展工厂
 */
export function createExtensionFactory(imageUploadHandler?: ImageUploadHandler) {
  return new ExtensionFactory(DEFAULT_EXTENSIONS_CONFIG, imageUploadHandler)
}

/**
 * 创建只读扩展
 */
export function createReadonlyExtensions(): any[] {
  const factory = createExtensionFactory()
  return factory.createReadonlyExtensions()
}

/**
 * 创建可编辑扩展
 */
export function createEditableExtensions(placeholder?: string, imageUploadHandler?: ImageUploadHandler): any[] {
  const factory = createExtensionFactory(imageUploadHandler)
  return factory.createEditableExtensions(placeholder)
}

/**
 * 创建聊天编辑器扩展配置
 * 适用于聊天界面，支持基础编辑和图片上传
 */
export function createChatExtensions(placeholder?: string, imageUploadHandler?: ImageUploadHandler): any[] {
  const factory = new ExtensionFactory(DEFAULT_EXTENSIONS_CONFIG, imageUploadHandler)

  // 禁用高级功能
  factory.setExtensionEnabled('table', false)
  factory.setExtensionEnabled('codeBlock', false)
  factory.setExtensionEnabled('codeBlockLowlight', false)
  factory.setExtensionEnabled('mathematics', false)
  factory.setExtensionEnabled('emoji', false)
  factory.setExtensionEnabled('audio', false)
  factory.setExtensionEnabled('mention', false)

  // 更新占位符
  if (placeholder) {
    factory.updateConfig('placeholder', {
      config: {
        placeholder,
        showOnlyWhenEditable: true,
      },
    })
  }

  return factory.createEditableExtensions(placeholder)
}

/**
 * 创建富文本编辑器扩展配置
 * 适用于博客、文档等，支持所有功能
 */
export function createRichTextExtensions(placeholder?: string, imageUploadHandler?: ImageUploadHandler): any[] {
  const factory = new ExtensionFactory(DEFAULT_EXTENSIONS_CONFIG, imageUploadHandler)

  // 启用所有功能
  factory.setExtensionEnabled('table', true)
  factory.setExtensionEnabled('codeBlock', true)
  factory.setExtensionEnabled('codeBlockLowlight', true)
  factory.setExtensionEnabled('mathematics', true)
  factory.setExtensionEnabled('emoji', true)
  factory.setExtensionEnabled('audio', true)
  factory.setExtensionEnabled('mention', false) // 默认禁用，可按需启用

  // 更新占位符
  if (placeholder) {
    factory.updateConfig('placeholder', {
      config: {
        placeholder,
        showOnlyWhenEditable: true,
      },
    })
  }

  return factory.createEditableExtensions(placeholder)
}

/**
 * 创建代码编辑器扩展配置
 * 适用于代码文档，支持代码高亮
 */
export function createCodeExtensions(placeholder?: string): any[] {
  const factory = new ExtensionFactory(DEFAULT_EXTENSIONS_CONFIG)

  // 启用代码相关功能
  factory.setExtensionEnabled('codeBlock', true)
  factory.setExtensionEnabled('codeBlockLowlight', true)
  factory.setExtensionEnabled('blockquote', true)

  // 禁用其他功能
  factory.setExtensionEnabled('image', false)
  factory.setExtensionEnabled('table', false)
  factory.setExtensionEnabled('mathematics', false)
  factory.setExtensionEnabled('emoji', false)
  factory.setExtensionEnabled('audio', false)
  factory.setExtensionEnabled('mention', false)

  // 更新占位符
  if (placeholder) {
    factory.updateConfig('placeholder', {
      config: {
        placeholder,
        showOnlyWhenEditable: true,
      },
    })
  }

  return factory.createEditableExtensions(placeholder)
}

/**
 * 扩展预设
 */
export const extensionPresets = {
  chat: createChatExtensions,
  richText: createRichTextExtensions,
  code: createCodeExtensions,
}

/**
 * 默认导出
 */
export default {
  DEFAULT_EXTENSIONS_CONFIG,
  createExtensionFactory,
  createReadonlyExtensions,
  createEditableExtensions,
  createChatExtensions,
  createRichTextExtensions,
  createCodeExtensions,
  extensionPresets,
  ExtensionFactory,
}