# Junction AI 助手指南（更新版）

本文档用于指导在 Junction monorepo 中协作开发的 AI 助手。**所有回答与注释必须使用中文**。

## 项目概述

Junction 是基于 **pnpm workspaces** 与 **TurboRepo** 的 monorepo：

- 前端：Nuxt 4 + Vue 3 + Pinia + Tailwind + DaisyUI + Tauri
- 后端：NestJS + Prisma + Redis + Swagger
- 共享类型：`@junction/types`

## 关键规则（必须遵守）

- **前端禁止直接使用 `fetch`/`axios`**：统一使用 `apps/frontend/app/api` 内的封装方法。
- **类型禁止重复定义**：`ApiResponse`/`PaginationData`/`PrismaTypes` 等必须从 `@junction/types` 导入。
- **优先使用现有工具**：`~/utils`、`~/composables`、`~/stores`、`~/services`、`~/api`。
- **注释使用中文**，并保持简洁、解释性。

## 全局设置（新增）

### Settings Store
系统设置已统一封装为 Pinia store（并启用持久化）：

- 文件：`apps/frontend/app/stores/settings.ts`
- 使用方式：
  ```ts
  import { useSettingsStore } from '~/stores/settings'

  const settings = useSettingsStore()
  settings.downloadPath = 'D:\\Downloads'
  ```
- 主要字段：
  - `downloadPath`：文件消息默认保存目录（Tauri 环境）
  - `themeMode`、`primaryColor`、`compactMode`
  - `sidebarCollapsed`、`animationsEnabled`、`animationSpeed`
  - `language`、`timezone`、`dateFormat`、`timeFormat`
  - `autoCheckUpdate`、`startMinimizedToTray`

> 注意：**不要使用 `useAppStore` 作为设置源**，统一从 `useSettingsStore` 读取。

### 统一读取设置
在任意组件/逻辑中读取配置时，统一从 `useSettingsStore()` 获取。避免重复创建本地配置对象。

## 下载工具（新增）

### 下载封装
文件下载已集中到 `apps/frontend/app/utils/download.ts`：

- 自动选择下载目录：
  - 先使用 `settings.downloadPath`
  - 若为空，自动回退系统默认下载目录
- 已支持 Tauri 下载（通过 `plugin-http` + `plugin-fs`）

### 使用方式
```ts
import { downloadFile } from '~/utils/download'

await downloadFile({
  source: { url: fileUrl, name: fileName },
  target: { dir: settings.downloadPath },
})
```

### 下载完成提示
文件消息下载后应在调用处触发 `toast.success('下载完成')`。  
现有消息组件已内置提示，不应再重复实现。

## Tauri 相关约定

### 插件
当前使用的 Tauri 插件：
- `@tauri-apps/plugin-dialog`：仅用于**系统目录选择**（非 UI 提示）
- `@tauri-apps/plugin-fs`
- `@tauri-apps/plugin-http`

> UI 级弹窗与提示必须使用前端组件封装，不使用 Tauri Dialog 作为 UI。

### 权限
权限配置位于：
`apps/frontend/src-tauri/capabilities/default.json`

需要允许：
- `dialog:allow-open`
- `fs:allow-write-file`
- `fs:allow-mkdir`
- `fs:allow-exists`
- `fs:allow-download-write`
- 后端 URL 允许列表（示例：`http://10.105.86.133:8080/**`）

## 构建与运行

根目录常用命令：

- `pnpm dev` / `pnpm dev:frontend` / `pnpm dev:backend`
- `pnpm build` / `pnpm build:packages`

后端测试：
- `pnpm test` / `pnpm test:e2e`

## 前端风格规范（摘要）

- `<script setup>` + Vue 3 Composition API
- 2 空格缩进、单引号、末尾逗号
- 无 Prettier 配置，遵循现有风格
- 尽量使用 Nuxt 自动导入
- UI 组件样式：**减少 `outline` 风格，优先使用 `soft/ghost` 风格**（例如 `badge-ghost`、`btn-ghost`、`bg-base-200`），以提升舒适度并适配主题
- 云母模式样式约定（新增）：
  - 页面容器/主内容需可透出云母：使用 `bg-base-100/200/300` 作为可透明背景（云母开启时会变透明）。
  - 不应透明的层叠元素（Modal/Toast/下拉菜单/右键菜单/抽屉/浮层等）必须使用半透明 + 模糊背景：
    - 推荐 `bg-base-100/80` 或 `bg-base-200/80` + `backdrop-blur-md`（或更强 blur）。
  - 避免使用 `bg-base-100/200/300` 作为浮层背景，以免被云母透明化。
- 布局分界线规范（新增）：
  - 布局区块分界使用柔和边框，例如 `border-r border-base-content/5`（或同级别透明度）。

## 后端风格规范（摘要）

- ESLint + Prettier
- 错误统一由 `HttpExceptionFilter` 包装
- 路径别名 `~` 指向 `src`

---

*Last updated: February 2026*

## 编码与乱码防护（新增）

### 为什么会出现乱码
- 文件使用了非 UTF-8 编码（如 GBK），但被工具或脚本以 UTF-8 读取/写入。
- 使用脚本替换时引入了转义字符（如反斜线 `\\`）或错误的正则替换，导致行内容被破坏。
- 不同编辑器/终端对编码自动识别不一致，导致保存时发生隐式转码。

### 统一规范
- **所有文本文件统一使用 UTF-8（无 BOM）**，包括 `.ts`、`.vue`、`.prisma`、`.md`、`.json`。
- 禁止用不明确编码的脚本重写文件；如必须脚本处理，**必须显式指定 UTF-8 读写**。
- 优先使用 `apply_patch` 做小范围修改，避免全量重写文件。
- 修改前后检查是否出现 `` 或异常反斜线内容。

### 推荐做法
- IDE 中将默认编码设为 UTF-8，并开启「保存时按 UTF-8 写入」。
- 脚本处理范例（只示例原则，按需执行）：
  ```python
  from pathlib import Path
  path = Path('path/to/file')
  text = path.read_text(encoding='utf-8')
  # ... 修改 text ...
  path.write_text(text, encoding='utf-8')
  ```
- 对 `.prisma` 等核心文件，避免批量替换；尽量手工或小范围 Patch 修改。

## AI 工具封装与使用（新增）

### 前端封装位置
- 运行时配置读取与提供方工厂：`apps/frontend/app/utils/ai.ts`
- 调用入口（非流式/流式）：`apps/frontend/app/api/ai.ts`

### 运行时配置
- 在 `apps/frontend/nuxt.config.ts` 中配置 `runtimeConfig.public.ai`
- `.env` / `.env.example` 相关字段：
  - `NUXT_PUBLIC_AI_DEFAULT_PROVIDER`
  - `DEEPSEEK_API_KEY`
  - `DEEPSEEK_API_BASE_URL`
  - `DEEPSEEK_DEFAULT_MODEL`

### 客户端可配置（Pinia 持久化）
- Store：`apps/frontend/app/stores/settings.ts`
- 字段：
  - `aiProviderId`
  - `aiApiKey`
  - `aiBaseUrl`
  - `aiDefaultModel`
- 规则：**客户端配置优先**，未配置时回退到运行时默认值。

### 使用方式（前端）
```ts
import { generateAiText, streamAiText } from '~/api/ai'

const result = await generateAiText({
  prompt: '请用一句话总结这个项目',
  system: '你是企业级助手',
})

const stream = await streamAiText({
  messages: [
    { role: 'user', content: '请帮我生成一段欢迎语' },
  ],
})
for await (const chunk of stream.textStream) {
  console.log(chunk)
}
```

### 扩展新提供方
- 在 `apps/frontend/app/utils/ai.ts` 使用 `registerAiProviderFactory` 注册提供方
- 提供方工厂必须返回 `LanguageModel`
- Deepseek 默认走 `openai.chat(modelId)` 端点，避免 `responses` 端点 404

### 注意事项
- 前端禁止直接使用 `fetch`/`axios` 调用 AI；必须使用上述封装
- API Key 若保存在后端，必须加密存储并只在服务端解密使用

## 管理后台注意事项（新增）
- 管理后台使用独立布局 `apps/frontend/app/layouts/admin.vue`，左侧菜单统一在布局内维护。
- 管理页面统一放在 `apps/frontend/app/pages/admin/index/**` 下，确保与左侧菜单同屏展示。
- 表管理页面路由规范：`/admin/tables/:table`（文件路径：`apps/frontend/app/pages/admin/index/tables/[table].vue`）。
- 外键字段必须支持弹窗检索并回填，保证管理员操作效率。
- **每新增一个 Prisma 表，都必须在管理后台补充一个表管理入口**：
  - 更新左侧菜单（`apps/frontend/app/layouts/admin.vue`）。
  - 更新数据治理入口卡片（`apps/frontend/app/pages/admin/index/database.vue`）。
  - 如需字段级展示优化，补充表字段顺序与展示策略（`apps/frontend/app/pages/admin/index/tables/[table].vue`）。

## 实时通话（LiveKit，自建）

### 基本原则
- **通话与屏幕共享统一使用 LiveKit**，不再使用 P2P 信令。
- **不依赖第三方服务**，必须自建 LiveKit Server。
- Token 只能由后端签发，前端禁止在本地生成。

### 后端
- Token 接口：`POST /call/livekit/token`
- 服务实现：`apps/backend/src/resource/call/call.service.ts`
- 控制器：`apps/backend/src/resource/call/call.controller.ts`

### 前端
- 调用入口：`apps/frontend/app/api/call.ts`
- 核心管理器：`apps/frontend/app/core/rtc/call-manager.ts`

### 运行配置（.env / .env.example）
- `NUXT_PUBLIC_LIVEKIT_URL`
- `LIVEKIT_URL`
- `LIVEKIT_API_KEY`
- `LIVEKIT_API_SECRET`

### 自建部署
- 目录：`infra/livekit/`
- Compose：`infra/livekit/docker-compose.yml`
- 配置：`infra/livekit/livekit.yaml`

### 端口要求
- `7880`（HTTP/WebSocket）
- `7881`（TCP）
- `7882/udp`（UDP）
