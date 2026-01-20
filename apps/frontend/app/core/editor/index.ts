// 导出类型
export * from './types'

// 导出配置
export * from './config'

// 导出组合式函数
export * from './composables'

// 导出扩展配置
export * from './config/extensions'

// 导出上传服务
export * from './services/upload.service'

// 导出插件
export * from './plugins/image-upload.plugin'

// 默认导出
import * as editorConfig from './config'
import * as editorComposables from './composables'
import * as editorExtensions from './config/extensions'
import * as editorServices from './services/upload.service'
import * as editorPlugins from './plugins/image-upload.plugin'

export default {
  ...editorConfig,
  ...editorComposables,
  ...editorExtensions,
  ...editorServices,
  ...editorPlugins,
}