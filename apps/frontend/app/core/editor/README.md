# 企业级Tiptap编辑器配置系统

## 概述

这是一个企业级的Tiptap编辑器统一配置系统，为整个应用提供一致的编辑器体验。系统支持：

1. **统一扩展管理** - 所有编辑器使用相同的扩展配置
2. **图片上传集成** - 内置图片上传功能，支持拖放和粘贴
3. **类型安全** - 完整的TypeScript支持
4. **可扩展架构** - 模块化设计，易于扩展新功能

## 核心模块

### 1. 扩展配置 (`config/extensions.ts`)

#### 基础用法
```typescript
import { createExtensionFactory, createEditableExtensions } from '~/core/editor'

// 创建扩展工厂
const factory = createExtensionFactory()

// 获取可编辑扩展
const extensions = createEditableExtensions('请输入内容...')
```

#### 预设配置（推荐）
```typescript
import { extensionPresets } from '~/core/editor'

// 聊天编辑器（轻量级）
const chatExtensions = extensionPresets.chat('输入消息...', uploadHandler)

// 富文本编辑器（功能完整）
const richExtensions = extensionPresets.richText('开始写作...', uploadHandler)

// 代码编辑器（专注代码）
const codeExtensions = extensionPresets.code('编写代码...')
```

#### 自定义配置
```typescript
import { createExtensionFactory } from '~/core/editor'

const factory = createExtensionFactory(uploadHandler)

// 启用表格功能
factory.setExtensionEnabled('table', true)

// 更新链接配置
factory.updateConfig('link', {
  config: {
    openOnClick: true,
  }
})

// 获取扩展
const extensions = factory.getExtensions()
```

### 2. 图片上传服务 (`services/upload.service.ts`)

```typescript
import { createUploadService, UploadService } from '~/core/editor'

// 创建上传服务
const uploadService = createUploadService({
  maxSize: 10 * 1024 * 1024, // 10MB
  accept: ['image/jpeg', 'image/png'],
  endpoint: '/upload/files'
})

// 上传单个文件
const result = await uploadService.uploadFile(file)

// 批量上传
const results = await uploadService.uploadFiles([file1, file2])

// 处理拖放上传
const dropResults = await uploadService.handleDropUpload(dataTransfer)

// 创建API上传处理函数
const uploadHandler = createApiImageUploadHandler()
```

### 3. 组合式函数 (`composables.ts`)

#### 基础用法
```vue
<script setup lang="ts">
import { useTiptapEditor } from '~/core/editor'

const editor = useTiptapEditor('editable', {
  content: '',
  placeholder: '开始输入...',
  onUpdate: ({ editor }) => {
    console.log(editor.getJSON())
  }
})
</script>
```

#### 带图片上传（推荐）
```vue
<script setup lang="ts">
import { useEditorWithApiUpload } from '~/core/editor'

const editor = useEditorWithApiUpload({
  content: '',
  placeholder: '支持图片上传...',
  onUpdate: ({ editor }) => {
    emit('update:modelValue', editor.getJSON())
  }
})
</script>
```

#### 高级用法
```vue
<script setup lang="ts">
import { useEditorWithImageUpload, createApiImageUploadHandler } from '~/core/editor'

const uploadHandler = createApiImageUploadHandler()

const editor = useEditorWithImageUpload({
  content: content.value,
  placeholder: '高级编辑器...',
  enableImageUpload: true,
  editorProps: {
    attributes: {
      class: 'prose max-w-none',
    },
  },
  onUpdate: ({ editor }) => {
    content.value = editor.getJSON()
  }
}, uploadHandler)
</script>
```

#### 只读模式
```vue
<script setup lang="ts">
import { createReadonlyEditor } from '~/core/editor'

const editor = createReadonlyEditor(content)
</script>
```

### 4. 图片上传插件 (`plugins/image-upload.plugin.ts`)

```typescript
import { createDefaultImageUploadPlugin, createApiImageUploadHandler } from '~/core/editor'

// 创建API上传处理函数
const uploadHandler = createApiImageUploadHandler()

// 创建图片上传插件
const imageUploadPlugin = createDefaultImageUploadPlugin(uploadHandler)
```

## 可用扩展

系统支持以下Tiptap扩展：

### 基础扩展（默认启用）
- **StarterKit**: 基础编辑功能（标题、段落、粗体、斜体等）
- **Link**: 链接支持
- **Placeholder**: 占位符文本
- **Image**: 图片支持（支持上传）
- **Blockquote**: 引用块
- **HorizontalRule**: 水平线

### 高级扩展（按需启用）
- **Table**: 表格支持（包含TableRow、TableCell、TableHeader）
- **CodeBlock**: 代码块
- **CodeBlockLowlight**: 高亮代码块（支持多种语言）
- **Mathematics**: 数学公式（使用KaTeX）
- **Emoji**: Emoji表情
- **Audio**: 音频播放
- **Mention**: @提及功能

### 编辑器预设

#### 聊天编辑器
```typescript
const chatExtensions = extensionPresets.chat('输入消息...', uploadHandler)
// 包含：基础编辑 + 图片上传
```

#### 富文本编辑器
```typescript
const richExtensions = extensionPresets.richText('开始写作...', uploadHandler)
// 包含：所有功能（表格、代码、数学公式等）
```

#### 代码编辑器
```typescript
const codeExtensions = extensionPresets.code('编写代码...')
// 包含：基础编辑 + 代码高亮
```

## 在组件中使用

### RichTextRenderer组件（只读）
```vue
<script setup lang="ts">
import { createReadonlyEditor } from '~/core/editor'

const props = defineProps<{
  node: any
}>()

const editor = createReadonlyEditor(props.node)
</script>
```

### 基础编辑器组件（可编辑，带图片上传）
```vue
<script setup lang="ts">
import { useEditorWithApiUpload } from '~/core/editor'

const props = defineProps<{
  modelValue: any
  placeholder?: string
  disabled?: boolean
}>()

const editor = useEditorWithApiUpload({
  content: props.modelValue,
  placeholder: props.placeholder,
  editable: !props.disabled,
  onUpdate: ({ editor }) => {
    emit('update:modelValue', editor.getJSON())
  }
})
</script>
```

### 自定义编辑器组件
```vue
<script setup lang="ts">
import { useTiptapEditor, extensionPresets } from '~/core/editor'

const props = defineProps<{
  modelValue: any
  type: 'chat' | 'rich' | 'code'
}>()

// 根据类型选择预设
const extensions = computed(() => {
  switch (props.type) {
    case 'chat':
      return extensionPresets.chat('输入消息...')
    case 'rich':
      return extensionPresets.richText('开始写作...')
    case 'code':
      return extensionPresets.code('编写代码...')
    default:
      return extensionPresets.chat('输入内容...')
  }
})

const editor = useTiptapEditor('editable', {
  content: props.modelValue,
  extensions: extensions.value,
  onUpdate: ({ editor }) => {
    emit('update:modelValue', editor.getJSON())
  }
})
</script>
```

### 基础编辑器组件（可编辑，带图片上传）
```vue
<script setup lang="ts">
import { useEditorWithApiUpload } from '~/core/editor'

const props = defineProps<{
  modelValue: any
  placeholder?: string
  disabled?: boolean
}>()

const editor = useEditorWithApiUpload({
  content: props.modelValue,
  placeholder: props.placeholder,
  editable: !props.disabled,
  onUpdate: ({ editor }) => {
    // 处理更新
  }
})
</script>
```

## 后端集成

系统已与后端上传API集成：

- **上传端点**: `POST /upload/files`
- **文件类型**: 图片 (jpeg, jpg, png, gif, webp)
- **最大大小**: 5MB
- **返回格式**: `{ success: boolean, data: { files: string[] } }`

## 扩展配置

### 默认扩展
- `starterKit`: 基础编辑功能
- `link`: 链接支持
- `placeholder`: 占位符
- `image`: 图片支持（可上传）

### 启用/禁用扩展
```typescript
import { createExtensionFactory } from '~/core/editor'

const factory = createExtensionFactory()
factory.setExtensionEnabled('image', true) // 启用图片
factory.setExtensionEnabled('table', false) // 禁用表格
```

### 自定义扩展配置
```typescript
factory.updateConfig('link', {
  config: {
    openOnClick: true,
    HTMLAttributes: {
      class: 'custom-link-class'
    }
  }
})
```

## 错误处理

系统提供完整的错误处理机制：

```typescript
import { createUploadService } from '~/core/editor'

const uploadService = createUploadService()

try {
  const result = await uploadService.uploadFile(file)
  if (!result.success) {
    console.error('上传失败:', result.error)
  }
} catch (error) {
  console.error('上传错误:', error)
}
```

## 最佳实践

1. **统一配置**: 所有编辑器组件使用相同的扩展配置
2. **错误处理**: 始终处理上传错误
3. **类型安全**: 使用TypeScript获取完整的类型支持
4. **性能优化**: 编辑器实例应及时销毁
5. **用户体验**: 提供上传进度反馈

## 扩展开发

### 添加新扩展
1. 在 `config/extensions.ts` 中添加扩展配置
2. 在 `ExtensionFactory` 中注册扩展
3. 更新类型定义

### 自定义上传逻辑
```typescript
import { createImageUploadPlugin } from '~/core/editor'

const customUploadHandler = async (file: File) => {
  // 自定义上传逻辑
  return 'https://example.com/uploaded-image.jpg'
}

const plugin = createImageUploadPlugin({
  uploadHandler: customUploadHandler,
  onError: (error) => {
    // 自定义错误处理
  }
})
```

## 故障排除

### 常见问题

1. **图片上传失败**
   - 检查文件大小和类型限制
   - 验证后端API端点
   - 检查网络连接

2. **编辑器不显示**
   - 检查扩展配置是否正确启用
   - 验证内容格式
   - 检查CSS样式

3. **类型错误**
   - 确保TypeScript配置正确
   - 检查导入路径
   - 更新类型定义

### 调试
```typescript
import { createExtensionFactory } from '~/core/editor'

const factory = createExtensionFactory()
console.log('扩展状态:', factory.getConfigStatus())
```

## 版本兼容性

- **Tiptap**: ^3.14.0
- **Vue**: ^3.5.0
- **TypeScript**: ^5.0.0

## 许可证

企业内部使用