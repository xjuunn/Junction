# 贡献指南

欢迎为 Junction 贡献代码、文档或建议。请在开始前阅读本指南，以便我们高效协作。

## 开发环境
- Node.js 与 pnpm（版本以 `package.json` 为准）
- `pnpm install` 安装依赖

常用命令：
```bash
pnpm dev
pnpm dev:frontend
pnpm dev:backend
pnpm build
pnpm test
pnpm test:e2e
```

## 提交规范
- 提交前确保能正常构建或通过相关测试。
- 遵循现有代码风格与目录规范。
- 前端禁止直接使用 `fetch` / `axios`，统一走 `apps/frontend/app/api` 内封装。
- 公共类型禁止重复定义，统一从 `@junction/types` 引入。

## 贡献流程
1. Fork 仓库并创建分支：`feature/xxx` 或 `fix/xxx`
2. 完成开发并自测
3. 提交 PR，描述背景、方案与测试结果

## PR 清单
- 是否影响到前端或后端的公共类型
- 是否补充/更新了文档
- 是否需要迁移数据库或更新配置

