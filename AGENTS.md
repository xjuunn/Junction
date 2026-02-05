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

## 后端风格规范（摘要）

- ESLint + Prettier
- 错误统一由 `HttpExceptionFilter` 包装
- 路径别名 `~` 指向 `src`

---

*Last updated: February 2026*
