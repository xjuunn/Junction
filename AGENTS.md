# Junction AI 助手指南

本文档为在 Junction monorepo 中工作的 AI 助手提供指南。包含构建/代码检查/测试命令、代码风格指南和项目结构。

**重要提示**: 所有回答和注释请使用中文。

## 项目概述

Junction 是一个使用 **pnpm workspaces** 和 **TurboRepo** 的 monorepo。包含：

- **前端**: Nuxt 4 应用，使用 Vue 3、Pinia、Tailwind CSS、DaisyUI 和 Tauri（桌面/移动端）。
- **后端**: NestJS 应用，使用 Prisma、better-auth、Redis 和 Swagger。
- **共享类型**: `@junction/types` 包，前后端共用。

## 包管理

- **包管理器**: pnpm (`pnpm@10.18.3`)
- **工作空间**: 在 `pnpm-workspace.yaml` 中定义
- **安装依赖**: `pnpm install`
- **向工作空间添加依赖**: `pnpm add <package> --filter <workspace>`
- **跨工作空间运行脚本**: `npx turbo run <script>`

## Build Commands

### 根目录 (Turbo)
| 命令 | 描述 |
|---------|-------------|
| `pnpm dev` | 启动所有工作空间的开发服务器 |
| `pnpm dev:frontend` | 仅启动前端开发服务器 |
| `pnpm dev:backend` | 仅启动后端开发服务器 |
| `pnpm start` | 启动生产构建（需要先运行 `pnpm build`） |
| `pnpm build` | 构建所有工作空间 |
| `pnpm build:packages` | 仅构建 packages（类型） |

### 前端 (`apps/frontend`)
| 命令 | 描述 |
|---------|-------------|
| `pnpm dev` | 启动 Nuxt 开发服务器（带 host 标志） |
| `pnpm build` | 构建 Nuxt 应用 |
| `pnpm generate` | 生成静态站点 |
| `pnpm preview` | 预览生产构建 |
| `pnpm tauri` | Tauri CLI 命令 |
| `pnpm tauri:android` | 启动 Tauri Android 开发 |
| `pnpm tauri:android:build` | 构建 Tauri Android 应用 |

### 后端 (`apps/backend`)
| 命令 | 描述 |
|---------|-------------|
| `pnpm dev` | 以监听模式启动 NestJS |
| `pnpm start` | 正常启动 NestJS |
| `pnpm start:debug` | 以调试模式启动 |
| `pnpm start:prod` | 运行构建后的应用 (`dist/main`) |
| `pnpm build` | 构建 NestJS 应用到 `dist` 目录 |

## 代码检查和格式化

### Backend
- **ESLint**: Flat config (`eslint.config.mjs`)。运行 `pnpm lint` 自动修复。
- **Prettier**: 配置在 `.prettierrc`。运行 `pnpm format` 格式化代码。
- **规则**:
  - 单引号，尾随逗号，自动换行。
  - TypeScript 严格性: `noImplicitAny: false`, `strictBindCallApply: false`。
  - ESLint 规则: `@typescript-eslint/no-explicit-any` 关闭，floating promises 警告。

### Frontend
- 使用 Nuxt 内置 ESLint（无单独配置）。
- 无 Prettier 配置；遵循编辑器默认或后端样式。
- 如需代码检查，考虑使用 `@nuxt/eslint`。

## 测试

### Backend
- **框架**: Jest 配合 `ts-jest`
- **配置**: 在 `package.json` 的 `jest` 字段中定义
- **命令**:
  - `pnpm test` – 运行所有测试
  - `pnpm test:watch` – 监听模式
  - `pnpm test:cov` – 覆盖率报告
  - `pnpm test:debug` – 调试测试
  - `pnpm test:e2e` – 运行 e2e 测试（使用 `test/jest-e2e.json`）
- **运行单个测试**: `pnpm test -- path/to/test.spec.ts`
- **测试位置**: `src/**/*.spec.ts`（单元测试）, `test/*.e2e-spec.ts`（e2e 测试）

### Frontend
- 无明确测试设置。如需添加可使用 Vitest 或 Jest

## 代码风格指南

### 导入
1. **外部模块**优先（来自 `node_modules` 或包）。
2. **内部模块**其次（别名、相对路径）。
3. 后端使用路径别名 `~` 表示 `src` 目录（在 `tsconfig.json` 中配置）。
4. 前端尽可能使用 Nuxt 自动导入；否则使用显式导入。

示例（后端）:
```typescript
import { Controller, Get } from '@nestjs/common';
import { ApiResponse } from '@junction/types';
import { AppService } from './app.service';
```

### 命名约定
- **类**: PascalCase (`AppController`, `HttpExceptionFilter`)。
- **变量和函数**: camelCase (`getHello`, `openDialog`)。
- **常量**: UPPER_SNAKE_CASE（如果导出）。
- **接口**: PascalCase（是否使用 `I` 前缀？此代码库中未使用）。
- **文件**: 组件使用 kebab-case (`rich-text-renderer.vue`)，TypeScript 文件使用 camelCase 或 kebab-case (`.ts`)。

### TypeScript
- **严格性**: `strictNullChecks: true`, 但 `noImplicitAny: false`
- **使用显式类型** 用于函数参数和返回类型
- **使用接口** 用于对象形状，`type` 用于联合、交叉类型
- **泛型** 用于 `ApiResponse<T>` 和 `PaginationData<T>`
- **避免 `any`**；使用 `unknown` 或适当类型。ESLint 允许 `any` 但建议更严格

### 错误处理
- **Backend**: Use `HttpExceptionFilter` to catch exceptions and return `ApiResponse` with `success: false`.
- **Controllers** should throw `HttpException` or let validation pipes handle.
- **Services** can throw regular errors; filter will convert to 500.
- **Frontend**: Use try/catch with axios errors; show user-friendly messages.

### 注释
- **JSDoc** for public classes/methods (see `api-response.ts`).
- **Chinese comments** are used in shared types; keep consistency if adding comments.
- **Inline comments** for complex logic.

### 格式化
- **Indentation**: 2 spaces (TypeScript, Vue).
- **Semicolons**: Yes.
- **Quotes**: Single quotes for JavaScript/TypeScript, double for JSX (if any).
- **Trailing commas**: Yes (Prettier config).
- **Line length**: No explicit limit; follow Prettier defaults.

## 前端特定
- **Vue 3 Composition API** 使用 `<script setup>`
- **状态管理**: Pinia stores（带持久化插件）
- **样式**: Tailwind CSS 与 DaisyUI 组件
- **图标**: Iconify (`@iconify/vue`)
- **路由**: Nuxt 文件路由
- **API 调用**: Axios（可能通过 `useFetch`）
- **Tauri**: 桌面/移动端应用集成；使用 `@tauri-apps/api` 进行原生调用

## 后端特定
- **NestJS** modules, controllers, providers.
- **认证**: better-auth (`@thallesp/nestjs-better-auth`)
- **数据库**: Prisma ORM（可能 PostgreSQL）
- **Redis**: ioredis 用于缓存/会话
- **WebSockets**: `@nestjs/platform-socket.io`
- **API 文档**: Swagger (`@nestjs/swagger`) 带装饰器
- **文件结构**:
  - `src/` – 应用代码
  - `src/adapters/` – 外部服务适配器
  - `src/decorators/` – 自定义装饰器
  - `src/exception-filters/` – 异常过滤器
  - `src/interceptors/` – 拦截器
  - `src/resource/` – 数据库、事件等

## 环境变量
- 根目录 `.env` 文件（不提交），从 `.env.example` 复制
- 前端运行时配置在 `nuxt.config.ts` (`runtimeConfig.public`)
- 后端使用 `@nestjs/config`，从根目录 `.env` 加载

## 实用脚本
- 数据库迁移: `npx prisma migrate dev`（backend 内）
- 生成 Prisma 客户端: `npx prisma generate`
- 类型检查: 各工作空间运行 `npx tsc --noEmit`
- 清理构建: 删除 `dist`, `.output`, `.nuxt`, `.turbo`

## Commit & PR Guidelines
- 无预提交钩子；提交信息可使用约定式提交（非强制）

## 现有工具封装（重要：使用现有工具，不要重复实现）

### 前端工具封装

#### API 调用工具 (`~/utils/api.ts`)
- **统一 HTTP 客户端**: `api` 实例，基于 axios 封装
- **自动认证**: 自动添加 Bearer token
- **错误处理**: 统一错误处理和 toast 提示
- **分页支持**: 自动应用默认分页参数
- **方法**: `api.get()`, `api.post()`, `api.patch()`, `api.put()`, `api.delete()`
- **使用示例**: `const response = await api.get('/users', { page: 1, limit: 10 })`

#### 日志工具 (`~/utils/logger.ts`)
- **统一日志记录**: `logger` 实例
- **方法**: `logger.info()`, `logger.success()`, `logger.warn()`, `logger.error()`, `logger.api()`
- **客户端存储**: 自动存储到 logger store

#### 格式化工具 (`~/utils/format.ts`)
- **时间格式化**: `formatTimeAgo(date)` - 相对时间显示
- **资源路径解析**: `resolveAssetUrl(path, options)` - 自动拼接基础 URL
- **支持**: data URL、blob URL、相对路径、绝对路径

#### 环境检测工具 (`~/utils/check.ts`)
- **平台检测**: `isTauri()`, `isMobile()`, `isDesktop()`, `isWeb()`, `isClient()`
- **平台信息**: `getPlatform()` - 返回完整平台信息
- **响应式**: 支持窗口大小检测

#### 上传服务 (`~/core/editor/services/upload.service.ts`)
- **企业级文件上传**: `UploadService` 类
- **功能**: 文件验证、进度回调、多文件上传、拖拽上传、粘贴上传
- **图片专用**: `handleImageUpload()` 方法
- **配置灵活**: 支持自定义端点、文件类型、大小限制
- **使用**: `const uploadService = createUploadService()`

#### Composables
- **应用状态**: `useAppState()` - 认证、主题、语言等状态管理
- **应用初始化**: `useAppInitialization()` - 应用初始化逻辑
- **认证管理**: `useAuth()` - 登录、注册、认证检查
- **Toast 通知**: `useToast()` - 成功、错误、警告、信息提示
- **对话框**: `useDialog()` - 确认框、提示框、错误框

#### Stores
- **用户状态**: `useUserStore()` - 用户信息和认证 token
- **应用状态**: `useAppStore()` - 应用全局状态
- **对话框状态**: `useDialogStore()` - 对话框状态管理
- **日志状态**: `useLoggerStore()` - 日志存储和显示

### 后端工具封装

#### Prisma 客户端 (`~/utils/prisma/index.ts`)
- **数据库连接**: `prisma` 实例，全局单例模式
- **使用**: 直接导入 `import { prisma } from '~/utils/prisma'`

#### 认证工厂 (`~/utils/auth/index.ts`)
- **Better Auth 配置**: `authFactory(emailService)` 函数
- **支持功能**: 邮箱密码、Email OTP、Passkey、SIWE（以太坊登录）
- **插件**: admin、bearer、emailOTP、passkey、siwe
- **ENS 解析**: 自动解析以太坊地址和头像

## API 调用规范（重要）

### 前端 API 调用规则
- **禁止直接使用 fetch 或 axios**: 在页面或组件中禁止直接使用 `fetch()` 或 `axios`
- **统一使用 API 定义**: 所有 API 调用都在 `apps/frontend/app/api` 目录中定义
- **类型安全**: API 定义支持完整的 TypeScript 类型安全
- **使用示例**:
  ```typescript
  // ✅ 正确 - 使用预定义的 API
  import { userApi } from '~/api/user'
  const users = await userApi.getUsers({ page: 1, limit: 10 })
  
  // ❌ 错误 - 直接使用 fetch 或 axios
  const response = await fetch('/api/users')
  const data = await axios.get('/api/users')
  ```

### API 目录结构
- **位置**: `apps/frontend/app/api/`
- **命名**: 按功能模块命名，如 `user.ts`, `auth.ts`, `chat.ts`
- **导出**: 统一导出 API 实例和方法
- **类型**: 使用 `@junction/types` 中的共享类型定义

## 🎯 **项目类型系统规范（重要）**

### 📦 **共享类型包 (`@junction/types`)**

#### 核心响应类型 (`packages/types/src/api-response.ts`)
```typescript
// 基础API响应
export class ApiResponse<T> {
    success: boolean;
    error: string | null;
    data: T | null;
    constructor(data: T | null, success: boolean = true, error: string | null = null)
}

// 分页元数据
export class PaginationMeta {
    total: number;
    page: number;
    limit: number;
    constructor(page: number, limit: number, total: number)
}

// 分页响应数据
export class PaginationData<T> {
    items: T[];
    meta: PaginationMeta;
    constructor(items: T[], meta: PaginationMeta)
}
```

#### Prisma 类型导出 (`packages/types/src/index.ts`)
```typescript
// 所有 Prisma 类型（包含 User、Conversation、Message 等）
export type * as PrismaTypes from 'prismaclient';
export type * as PrismaValues from 'prismaclient';
export * from './api-response';
```

### 🎨 **前端编辑器类型**

#### 编辑器核心类型 (`apps/frontend/app/core/editor/types/index.ts`)
```typescript
// 编辑器模式
export type EditorMode = 'readonly' | 'editable' | 'minimal'

// 编辑器主题
export type EditorTheme = 'light' | 'dark' | 'auto'

// 上传配置
export interface UploadConfig {
    enabled: boolean
    type: 'image' | 'audio' | 'file'
    maxSize: number
    accept: string[]
    endpoint: string
    handler?: (file: File) => Promise<string>
}

// 上传响应
export interface UploadResponse {
    success: boolean
    url?: string
    error?: string
    data?: any
}

// 其他类型...
```

### 🔌 **Socket 类型系统**

#### Socket 事件类型 (`apps/frontend/app/core/socket/socket.types.ts`)
```typescript
// Socket 事件泛型接口
export interface SocketEvent<S = void, A = void, L = void> {
    send: S;      // 发送给后端的数据
    ack: A;       // 后端回调的数据
    listen: L;    // 后端主动推送的数据
}

// Socket 命名空间
export interface SocketNamespaces {
    app: {
        "init": SocketEvent<void, PrismaTypes.User, never>;
        "new-notification": SocketEvent<never, never, PrismaTypes.Notification>;
        "conversation-status": SocketEvent<never, never, { conversationId: string; onlineCount: number }>;
        "new-message": SocketEvent<never, never, any>;
        "message-revoked": SocketEvent<never, never, { id: string; conversationId: string; [key: string]: any }>;
    };
}

// 类型推断工具
export type InferSend<N extends NSKeys, E extends EventKeys<N>>
export type InferAck<N extends NSKeys, E extends EventKeys<N>>
export type InferListen<N extends NSKeys, E extends EventKeys<N>>
```

### 🛠 **前端工具类型**

#### 分页选项类型 (`apps/frontend/app/utils/pagination.ts`)
```typescript
export interface PaginationOptions {
    page?: number;
    limit?: number;
    cursor?: string | number;
}

// 扩展的分页数据（客户端特定）
export interface PaginationData<T> extends SharedPaginationData<T> {
    hasMore: boolean;
    prevCursor?: string | number;
    nextCursor?: string | number;
}
```

#### 工具类型 (`apps/frontend/app/utils/types.ts`)
```typescript
export type AwaitedReturnType<T extends (...args: any) => any> = Awaited<ReturnType<T>>;
export type AwaitedReturnOmit<T extends (...args: any) => any, K extends keyof Awaited<ReturnType<T>>> = Omit<Awaited<ReturnType<T>>, K>;
```

## ⚠️ **类型定义规范**

### 🚫 **禁止重复定义**
- **ApiResponse**: 已在 `@junction/types` 中定义，禁止重复实现
- **PaginationData/PaginationMeta**: 已在共享包中定义，使用扩展而非重新定义
- **PrismaTypes**: 通过 `@junction/types` 导入，禁止本地重新定义
- **EditorMode/EditorTheme**: 已在编辑器类型中定义，使用现有类型

### ✅ **正确做法**
```typescript
// ✅ 正确 - 使用共享类型
import { ApiResponse, PaginationData, PrismaTypes } from '@junction/types'
import type { EditorMode, UploadResponse } from '~/core/editor/types'

// ❌ 错误 - 重复定义
interface ApiResponse<T> { ... }  // 已在共享包中定义
class PaginationData<T> { ... }   // 已在共享包中定义
```

### 🔧 **类型扩展规则**
- **继承扩展**: 需要扩展时，使用 `extends` 而非重新定义
- **泛型约束**: 保持泛型约束与原始类型一致
- **向后兼容**: 扩展时保持原有接口不变

### 📍 **类型导入路径**
```typescript
// 共享类型
import type { PrismaTypes, ApiResponse, PaginationData } from '@junction/types'

// 前端编辑器类型
import type { EditorMode, UploadResponse, EditorTheme } from '~/core/editor/types'

// Socket 类型
import type { SocketEvent, InferSend, InferAck } from '~/core/socket/socket.types'

// 工具类型
import type { PaginationOptions, AwaitedReturnType } from '~/utils/types'

### 📋 **其他重要类型定义**

#### 应用状态类型 (`apps/frontend/app/core/types.ts`)
```typescript
export interface AppState {
    user: any | null
    theme: 'light' | 'dark' | 'auto'
    language: string
    platform: 'web' | 'desktop' | 'mobile'
    environment: 'development' | 'production' | 'test'
}

export interface InitializationState {
    isInitialized: boolean
    isInitializing: boolean
    error: string | null
    progress: number
    currentStep: string
}

export interface SystemStatus {
    online: boolean
    version: string
    buildNumber?: string
    features: Record<string, boolean>
}
```

#### 用户和认证类型
```typescript
// 从 @junction/types 导入
type User = PrismaTypes.User
type Conversation = PrismaTypes.Conversation
type Message = PrismaTypes.Message
type Notification = PrismaTypes.Notification
```

#### API 响应包装类型
```typescript
// 扩展分页数据（客户端使用）
export interface PaginationDataWithTotal<T> extends Omit<PaginationData<T>, 'hasMore' | 'prevCursor' | 'nextCursor'> {}

// 工厂函数返回类型
export type AwaitedReturnOmit<T extends (...args: any) => any, K extends keyof Awaited<ReturnType<T>>> = Omit<Awaited<ReturnType<T>>, K>;
```

#### Vue 组件 Props 和 Emits 类型
```typescript
// 标准化 Props 接口
interface Props {
    modelValue?: boolean
    data?: any
    [key: string]: any
}

// 标准化 Emits 接口  
interface Emits {
    (e: 'update:modelValue', value: any): void
    (e: 'success', data: any): void
    (e: 'error', error: string): void
    [key: string]: (...args: any[]) => void
}
```

### 📌 **类型安全最佳实践**

#### 泛型使用规范
```typescript
// ✅ 正确 - 明确的泛型约束
interface ApiResponse<T> {
    success: boolean
    data: T | null
}

// ✅ 正确 - 工具类型
type ExtractArrayType<T> = T extends (infer U)[] ? U : never
type ComponentProps<T> = T extends (...args: any) => any ? Parameters<T>[0] : never
```

#### 联合类型和交叉类型
```typescript
// ✅ 正确 - 联合类型
type Status = 'loading' | 'success' | 'error'
type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH'

// ✅ 正确 - 交叉类型
type UserWithSettings = User & { settings: UserSettings }
type RequestConfig = RequestOptions & { timeout: number }
```

#### 条件类型工具
```typescript
// ✅ 正确 - 条件类型
type NonNullable<T> = T extends null | undefined ? never : T
type Optional<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>
type RequiredFields<T, K extends keyof T> = T & Required<Pick<T, K>>
```

### 🔍 **类型查找指南**

#### 当需要特定类型时
```typescript
// API 响应 → @junction/types
import { ApiResponse, PaginationData } from '@junction/types'

// 数据库模型 → @junction/types  
import type { PrismaTypes } from '@junction/types'
type User = PrismaTypes.User
type Conversation = PrismaTypes.Conversation

// 编辑器类型 → core/editor/types
import type { EditorMode, UploadResponse } from '~/core/editor/types'

// Socket 类型 → core/socket/types
import type { InferSend, InferAck } from '~/core/socket/types'

// 工具类型 → utils/types
import type { AwaitedReturnType, PaginationOptions } from '~/utils/types'
```
```

## AI 助手注意事项
- **所有回答和注释请使用中文**
- **优先使用现有工具**: 上述工具封装已提供完整功能，不要重复实现
- **API 调用规范**: 严格遵守 API 调用规则，使用 `~/api` 中的预定义方法
- **类型系统规范**: 使用现有类型定义，禁止重复实现，参考上方类型系统规范
- **提交前在后端运行 `pnpm lint` 和 `pnpm format`
- **确保 TypeScript 编译无误**
- **遵循同一文件/工作空间的现有模式**
- **添加新依赖时更新正确的工作空间 `package.json`**
- **注意共享类型；更改可能影响前后端**
- **检查现有工具**: 在实现新功能前，先检查 `utils/`, `composables/`, `stores/`, `services/`, `api/` 目录

---

*Last updated: January 2026*