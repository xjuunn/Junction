# Junction

## 项目简介
Junction 是面向即时通信用户的协作平台，聚焦“聊天 + 协作 + 实时通话”的完整体验。  
它支持从一对一私聊到多人群聊的全场景沟通，并提供丰富消息能力、通知体系与 AI 辅助，让沟通更高效、更可控。

## 核心功能
- 即时通讯：支持私聊、群聊、临时会话与系统会话
- 消息类型：文本、图片、文件、语音、视频、表情与富文本
- 消息能力：回复、撤回、编辑、置顶、已读进度
- 社交关系：好友申请、接受/拒绝、拉黑与备注
- 通知中心：系统/消息/好友请求/下载等通知统一管理
- AI Bot：独立机器人资料、可配置触发方式、回复策略与模型参数
- 表情体系：表情分类、偏好设置、使用统计与 AI 生成辅助
- 实时通话：基于 LiveKit 的语音/视频/屏幕共享
- 多端形态：Web + Tauri 桌面端

## 技术栈
- 前端：Nuxt 4、Vue 3、Pinia、Tailwind、DaisyUI、Tauri
- 后端：NestJS、Prisma、Redis、Swagger、Socket.IO
- 共享：`@junction/types`
- 实时通话：LiveKit（自建）

## 目录结构
- `apps/frontend`：前端应用（Nuxt + Tauri）
- `apps/backend`：后端服务（NestJS + Prisma）
- `packages/types`：共享类型
- `infra/livekit`：LiveKit 自建部署配置

## 快速开始
### 1. 安装依赖
```bash
pnpm install
```

### 2. 配置环境变量
复制 `.env.example` 为 `.env` 并按需填写：
```bash
cp .env.example .env
```

### 3. 启动开发环境
```bash
pnpm dev
```

如需单独启动：
```bash
pnpm dev:frontend
pnpm dev:backend
```

## 常用命令
- `pnpm dev`：启动前后端开发
- `pnpm dev:frontend`：仅启动前端
- `pnpm dev:backend`：仅启动后端
- `pnpm build`：构建全部应用
- `pnpm build:packages`：仅构建共享包
- `pnpm test`：后端单元测试
- `pnpm test:e2e`：后端 E2E 测试
- `pnpm livekit`：启动 LiveKit（Docker Compose）

## 环境变量说明（节选）
以 `.env.example` 为准，常用字段如下：
- `NUXT_PUBLIC_SERVER_HOST`、`NUXT_PUBLIC_BACKEND_PORT`、`NUXT_PUBLIC_FRONTEND_PORT`
- `NUXT_PUBLIC_API_URL`、`AUTH_SECRET`
- `REDIS_HOST`、`REDIS_PORT`、`REDIS_PASSWORD`
- `NUXT_PUBLIC_AI_DEFAULT_PROVIDER`、`DEEPSEEK_API_KEY`、`DEEPSEEK_API_BASE_URL`
- `NUXT_PUBLIC_LIVEKIT_URL`、`LIVEKIT_API_KEY`、`LIVEKIT_API_SECRET`

## 开发约定（摘要）
- 前端禁止直接使用 `fetch` / `axios`，统一走 `apps/frontend/app/api` 内封装。
- 公共类型禁止重复定义，统一从 `@junction/types` 引入。
- 设置读取统一使用 `useSettingsStore()`，不要使用 `useAppStore`。
- 文件下载统一使用 `apps/frontend/app/utils/download.ts` 的 `downloadFile`。
- Tauri 弹窗仅用于系统目录选择，UI 弹窗走前端组件。

## LiveKit 自建
启动服务：
```bash
pnpm livekit
```
端口要求：
- `7880`（HTTP/WebSocket）
- `7881`（TCP）
- `7882/udp`（UDP）

## 相关路径
- 前端入口：`apps/frontend`
- 后端入口：`apps/backend`
- AI 相关封装：`apps/frontend/app/utils/ai.ts`、`apps/frontend/app/api/ai.ts`
- LiveKit 接口：`apps/backend/src/resource/call`

## 贡献与支持
- 贡献指南：`CONTRIBUTING.md`
- 行为准则：`CODE_OF_CONDUCT.md`
- 安全说明：`SECURITY.md`
- 获取帮助：`SUPPORT.md`
- 更新日志：`CHANGELOG.md`
- Issue 模板：`.github/ISSUE_TEMPLATE`
- PR 模板：`.github/PULL_REQUEST_TEMPLATE.md`
