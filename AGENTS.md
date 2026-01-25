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

## AI 助手注意事项
- **所有回答和注释请使用中文**
- 提交前在后端运行 `pnpm lint` 和 `pnpm format`
- 确保 TypeScript 编译无误
- 遵循同一文件/工作空间的现有模式
- 添加新依赖时更新正确的工作空间 `package.json`
- 注意共享类型；更改可能影响前后端

---

*Last updated: January 2026*