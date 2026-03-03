# GitHub 自动发布桌面端（二进制）

本文说明如何把当前项目发布到 GitHub，并在打 Tag 后自动构建多平台 Tauri 二进制并发布到 GitHub Release。

## 1. 一次性准备

1. 在 GitHub 创建仓库（例如 `your-org/junction`）。
2. 本地关联远程并推送：

```bash
git remote add origin git@github.com:your-org/junction.git
git branch -M main
git push -u origin main
```

3. 确认工作流文件已存在：`.github/workflows/release-desktop.yml`。

## 2. 自动发布触发条件

工作流触发方式：

- 推送 Tag：`v*`（例如 `v0.1.0`）
- 手动触发：GitHub Actions 页面 `workflow_dispatch`

默认构建平台：

- Windows x64（`windows-latest`）
- macOS ARM64（`macos-14`）
- Linux x64（`ubuntu-22.04`）

## 3. 发布流程（推荐）

1. 修改版本号（建议与 Tag 保持一致）：
   - `apps/frontend/src-tauri/tauri.conf.json` 的 `version`
2. 提交代码并推送：

```bash
git add .
git commit -m "chore: release v0.1.0"
git push
```

3. 创建并推送 Tag：

```bash
git tag v0.1.0
git push origin v0.1.0
```

4. 等待 Actions 执行完成后，在 GitHub `Releases` 页面可看到对应版本及附件安装包。

## 4. 可选：代码签名 / 公证

当前工作流可直接产出安装包。若你需要面向最终用户分发，建议后续增加签名：

- Windows：证书签名（EV/OV 代码签名证书）
- macOS：Apple Developer 证书 + notarization

可通过 GitHub Secrets 注入签名凭据，再在工作流中增加签名步骤。

## 5. 常见问题

- Linux 构建失败缺少系统库：已在工作流中安装 Tauri 常用依赖，如仍失败按日志补充 `apt` 包。
- 没有生成 Release：确认触发的是 `v*` Tag（例如 `v1.2.3`），而不是普通分支 push。
- 产物版本不对：确认 `tauri.conf.json` 的 `version` 与 Tag 一致。
