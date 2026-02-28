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

## 钱包登录与关联（新增）

### 基本原则
- 以太坊登录统一使用 **better-auth SIWE**，前端通过 `useAuthClient().siwe` 调用。
- 个人档案页的钱包绑定/解绑/设主钱包统一走 `~/api/user`，禁止页面内直接请求后端。
- 禁止让用户在登录页输入私钥；仅允许钱包地址 + 钱包签名流程。

### 前端入口
- 登录页：`apps/frontend/app/pages/auth/index/sign-in/ethereum.vue`
- 个人档案安全页：`apps/frontend/app/pages/profile/index/security.vue`
- API 封装：`apps/frontend/app/api/user.ts`
  - `listMyWallets`
  - `createWalletBindNonce`
  - `bindWallet`
  - `setPrimaryWallet`
  - `unbindWallet`

### 后端入口
- 控制器：`apps/backend/src/resource/user/user.controller.ts`
- 服务：`apps/backend/src/resource/user/user.service.ts`
- 路由：
  - `GET /user/wallets`
  - `POST /user/wallets/nonce`
  - `POST /user/wallets/bind`
  - `PATCH /user/wallets/:walletId/primary`
  - `DELETE /user/wallets/:walletId`

### 注意事项
- 钱包绑定必须使用一次性签名挑战（nonce）并设置过期时间。
- 绑定时需校验地址归属，若钱包已绑定其他账户必须拒绝。
- 解绑主钱包后需自动补一个主钱包（若还有其他钱包）。

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

## Minecraft 服务器管理（新增）

### 约定
- 默认地址与预置服务器列表在页面内定义（不使用 `MC_SERVER_*` 环境变量）。
- 管理令牌在前端设置中持久化（`useSettingsStore()`）。
- 后端不做 host 白名单限制；RPC 透传默认允许（但接口仍受管理员权限控制）。

## 封装组件与能力总表（必须复用）

本节用于避免 AI 在项目内重复造轮子。**已有封装优先级高于新实现**。

### 全局挂载（禁止重复挂载）

全局已在 `apps/frontend/app/app.vue` 挂载：
- `<BaseToast />`
- `<BaseDialog />`
- `<BaseContextMenu />`

主布局 `apps/frontend/app/layouts/main.vue` 已挂载：
- `<AppCallOverlay />`

规则：
- 新页面/组件中**不要再次挂载**上述全局组件。

### Base 组件用法（统一入口）

#### `BaseToast` + `useToast`
- 文件：`apps/frontend/app/components/base/toast.vue`、`apps/frontend/app/composables/useToast.ts`
- 调用：
  ```ts
  const toast = useToast()
  toast.success('操作成功')
  toast.error('操作失败')
  toast.info('提示信息')
  toast.warning('警告信息')
  ```

#### `BaseDialog` + `useDialog`
- 文件：`apps/frontend/app/components/base/dialog.vue`、`apps/frontend/app/composables/useDialog.ts`
- 调用：
  ```ts
  const dialog = useDialog()
  const ok = await dialog.confirm({ title: '确认', content: '是否继续？', type: 'warning' })
  const text = await dialog.prompt({ title: '输入', content: '请输入名称', required: true })
  await dialog.alert('保存完成')
  ```
- 说明：`BaseDialog` 由 `useDialogStore` 驱动，统一走 Promise 结果，不要手写重复确认框。

#### `BaseModal`
- 文件：`apps/frontend/app/components/base/modal.vue`
- 关键 props：`modelValue`、`title`、`boxClass`、`persistent`、`hideCloseButton`
- 事件：`update:modelValue`、`open`、`close`
- 用法：
  ```vue
  <BaseModal v-model="show" title="标题" box-class="max-w-lg">
    <template #default>内容</template>
    <template #actions="{ close }">
      <button class="btn" @click="close()">关闭</button>
    </template>
  </BaseModal>
  ```

#### `BaseContextMenu` + `v-context-menu` + `useContextMenu`
- 文件：`apps/frontend/app/components/base/context-menu.vue`、`apps/frontend/app/plugins/context-menu.client.ts`、`apps/frontend/app/composables/useContextMenu.ts`
- 定义菜单：
  ```ts
  const menu = defineContextMenu([{ id: 'copy', label: '复制', handler: () => {} }])
  ```
- 绑定：
  ```vue
  <div v-context-menu="{ items: menu, context: row }" />
  ```
- 规则：右键菜单统一使用该封装；不要自建分散式右键层。

#### `BaseEditor`
- 文件：`apps/frontend/app/components/base/editor.vue`
- 关键能力：
  - 富文本（Tiptap）输入
  - 图片/文件粘贴与拖拽上传（内部走 `uploadFiles`）
  - `@mention` 支持（`enableMention` + `mentionItems`）
  - 文件下载链路（内部走 `downloadFile` / `openLocalPath`）
- 事件：`update:modelValue`、`send`、`textChange`
- 暴露方法：`clear`、`focus`、`insertContent`、`setContent`、`editor`

#### `BaseAvatar`
- 文件：`apps/frontend/app/components/base/avatar.vue`
- 支持：`src`、`text`、`size`、`width`、`height`、`radius`、`placeholderLength`
- 规则：头像展示统一使用该组件，不要重复写占位逻辑。

#### `ListDetail`（列表-详情双栏容器）
- 文件：`apps/frontend/app/components/layout/ListDetail.vue`
- props：`showDetail`、`listWidth`、`breakpoint`
- 事件：`back`
- 用于移动端/桌面端一体化列表详情布局。

### 业务封装组件（优先复用）

#### 聊天域（`components/app/chat/**`）
- `AppChatList`：会话列表、搜索、分组、会话流式预览更新
- `AppChatItem`：单个会话项（含右键菜单）
- `AppChatContent`：完整会话页（消息流、上传、引用、表情、通话入口）
- `AppChatDialogChatSettings`：聊天设置总入口（内部切换私聊/群聊）
- `AppChatDialogPrivateSettings`：私聊设置
- `AppChatDialogGroupSettings`：群聊设置

#### 消息域（`components/app/message/**`）
- `AppMessageList`：消息滚动容器 + 顶部加载更多
- `AppMessageItem`：消息单元（文本/富文本/图片/文件/表情/撤回）
- `RichTextRenderer`：富文本只读渲染，含外链/文件点击处理

#### 群聊对话框（`components/app/dialog/**`）
- `AppDialogCreateGroup`：创建群聊（两步流程）
- `AppDialogGroupInfo`：群信息管理（名称/头像/成员）
- `AppDialogInviteMembers`：邀请成员

#### 音视频域（`components/app/call/**`）
- `AppCallOverlay`：通话总浮层（已在 `main` 布局挂载）
- `AppCallVideoTile`：单个参与者音视频瓦片

#### 其他
- `AppSidebar` / `AppBottomNav`：统一菜单入口（基于 `menuService`）
- `AppWindowController`：Tauri 窗口控制按钮
- `DebugLogger`：调试日志浮层（默认未挂载，仅调试时启用）

### API 封装（前端唯一 HTTP 入口）

总规则：
- 页面与组件只能调用 `apps/frontend/app/api/*`。
- 不允许在业务层直接写 `fetch`/`axios`（AI 流式场景除现有封装 `streamAiText` 之外，新增同类能力也应在 `api` 层统一封装）。
- 基础请求实例：`apps/frontend/app/utils/api.ts`（自动注入 `Authorization`、统一错误 toast、401 自动跳转）。

已存在 API 模块：
- `~/api/app`：`getHello`
- `~/api/user`：`me`、`isAuthenticated`、`search`、`findOne`、`listMyWallets`、`createWalletBindNonce`、`bindWallet`、`setPrimaryWallet`、`unbindWallet`
- `~/api/upload`：`uploadFiles`
- `~/api/friendship`：好友申请/通过/拒绝/拉黑/备注/删除等
- `~/api/conversation`：会话创建、成员管理、设置、群信息、转让群主
- `~/api/message`：发送、分页、编辑、撤回、已读、搜索、上下文
- `~/api/notification`：通知列表、已读、删除
- `~/api/emoji`：分类/表情 CRUD、置顶、排序
- `~/api/ai`：`generateAiText`、`streamAiText`
- `~/api/ai-bot`：机器人 CRUD
- `~/api/call`：`getLiveKitToken`
- `~/api/admin`：管理后台与数据库治理接口
- `~/api/mc-server`：Minecraft 管理全套接口

### composables 封装（统一调用）

- `useToast`：全局消息提示
- `useDialog`：确认/提示/输入对话框
- `useContextMenu` + `defineContextMenu`：右键菜单定义与状态管理
- `useCall`：通话统一控制（底层 `CallManager`）
- `useAdminAccess`：管理员判定
- `useEmitt`：全局事件总线
- `useTailwindBreakpoints`：Tailwind 断点工具

### stores 封装（禁止重复本地状态）

- `useSettingsStore`：全局设置（含 AI、下载目录、通知、scrcpy、Minecraft token）
- `useUserStore`：用户与 token
- `useCallStore`：通话状态
- `useDialogStore`：全局 Dialog 状态
- `useLoggerStore`：调试日志状态

规则：
- 读取全局偏好统一从 store 获取，不要在页面中重复维护同构配置对象。

### core 能力（禁止重复实现）

- `~/core/socket/socket.client`：Socket.io 封装，统一 `useSocket(namespace)`。
- `~/core/rtc/call-manager`：LiveKit 通话核心状态机，禁止新建并行 RTC 管理器。
- `~/core/menu`：侧边栏/底部导航菜单注册中心，新增菜单走 `menuService.add`。
- `~/core/theme`：主题与云母控制（`AppTheme`）。
- `~/core/auth`：`useAuthClient()`（better-auth 客户端）。
- `~/core/editor`：Tiptap 统一扩展、上传插件、组合式封装。

### 工具函数封装（常用）

- 下载：`~/utils/download`（`downloadFile`、`findExistingDownloadPath`、`openLocalPath`）
- 外链：`~/utils/link`（`openExternalUrl`）
- 通知：`~/utils/notification`（`notify`、`createNotifier`）
- 消息 payload：`~/utils/message`（`normalizeMessageImagePayload`、`resolveMessageImagePayload`）
- ADB/scrcpy：`~/utils/adb`（`createAdbClient`）
- 时间与资源：`~/utils/format`
- 运行环境：`~/utils/check`（`isTauri`）

## AI 开发执行清单（新增）

每次改动前先检查：
1. 是否已有同类组件/封装（`components/base`、`composables`、`utils`、`api`、`core`）。
2. 是否可以直接扩展既有封装，而不是创建新实现。
3. 是否复用了 `@junction/types`，避免重复定义类型。
4. 是否遵守全局 UI 约定（弹窗/提示/右键菜单/下载/通话/外链）。

若必须新增封装：
1. 先在对应领域目录扩展（例如 API 放 `app/api`，通用逻辑放 `utils`/`composables`）。
2. 在本文件补充“位置 + 用法 + 注意事项”，确保后续 AI 可复用。
