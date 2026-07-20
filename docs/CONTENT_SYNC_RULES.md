# 内容同步与发布规则

更新日期：2026-07-20

本文档是 Notion、阿里云 OSS 与公开网站之间内容同步的规范。后续修改同步脚本、发布脚本、缓存或媒体处理时必须遵守本文。

字段结构以 `docs/NOTION_SCHEMA.md` 为准，整体运行时数据流以 `docs/DATA_FLOW.md` 为准。

## 1. 数据源与读取边界

```text
Notion（编辑源）
  -> 本地服务端同步脚本
  -> 阿里云 OSS 媒体与 JSON（公开发布源）
  -> src/lib/public-content.ts
  -> 网站页面
```

- Notion 只作为编辑源和同步源。
- 网站前台不得直接查询 Notion。
- 网站列表读取 `uploads/admin/site-content.json`。
- 每个项目的正文读取该项目 `contentUrl` 指向的 `content.json`。
- 浏览器只能获得公开 OSS URL，不得获得 Notion Token 或阿里云 AccessKey。
- `uploads/admin/...` 是历史兼容前缀，不代表网站仍有 `/admin` 后台。

## 2. 同步状态

除 `Studio Contact Messages` 外，内容表使用 `同步状态`：

| 状态 | 脚本行为 |
| --- | --- |
| `编辑中` | 跳过，不上传、不发布、不修改状态 |
| `待同步` | 新条目同步到 OSS |
| `待更新` | 使用同一个 Notion page ID 更新原条目和项目 JSON |
| `已同步` | 默认跳过 |

规则：

- Notion page ID 是稳定 ID，不能只依赖 Title。
- `待更新` 不得创建重复的网站条目。
- 不得新增 `已上传` 等替代状态。
- 项目只有在媒体处理、Notion block 更新、项目 `content.json` 发布全部成功后，才能立即改为 `已同步`。
- 每个项目独立完成后立即更新状态，不等待整批项目结束。
- 任一项目媒体失败时，该项目不得改为 `已同步`，下一次通用同步必须能重试。

## 3. 项目同步事务顺序

`Studio Projects` 必须按项目逐条执行：

```text
读取一个待同步/待更新项目
  -> 同步 Cover 等 Files 字段
  -> 遍历 Notion page body
  -> 复用或上传媒体
  -> 更新 Notion block 的 OSS URL
  -> 发布该项目 content.json
  -> 生成或保留视频 poster
  -> 成功后把该项目同步状态改为已同步
  -> 继续下一个项目
```

对应命令必须保留 `--publish-before-status` 行为。禁止恢复成“先把整批项目标记为已同步，再统一发布 JSON”。

## 4. 正文媒体选择优先级

同步 Notion page body 时，严格使用以下优先级：

1. 如果当前 Notion URL 已经指向存在的 OSS 优化资源，直接使用。
2. 如果当前 OSS 原图存在，并且同目录存在 `-optimized.webp`，使用 WebP 并更新 Notion block。
3. 如果当前 OSS 文件存在且已在目标项目目录，跳过上传。
4. 如果当前 OSS 文件存在但位于旧目录，只能在 OSS 内部复制到目标目录，不得读取本地文件。
5. 只有 OSS 文件不存在或 Notion URL 不是 OSS URL 时，才允许延迟读取 `本地地址`。
6. 本地无法匹配时，最后才下载 Notion 临时文件并上传 OSS。

关键约束：

- 有效 OSS URL 的存在性检查必须发生在扫描本地文件夹之前。
- 不得为了计算本地文件哈希而提前下载 OneDrive 占位文件。
- `--rehome-oss` 只能触发 OSS 内部复制，不能让有效的云端 WebP 回退成本地 GIF。
- 本地目录必须按需加载。项目的全部媒体都已在 OSS 时，不应读取 `本地地址`。

## 5. 本地媒体匹配

仅在确实需要本地恢复资源时使用：

- 同名图片优先级：WebP、AVIF、JPEG、PNG、SVG、GIF。
- `name.webp`、`name-compressed.webp` 和 `name-optimized.webp` 视为同一个素材版本。
- 原始 GIF 与对应 WebP 同时存在时，只能选择 WebP。
- `cover`、`poster`、`thumbnail` 不应作为正文媒体的顺序回退候选。
- 匹配失败时只处理当前媒体，不得让整个批次无限等待。

## 6. 压缩规则

- 普通同步默认不压缩上传文件。
- 本地已压缩的文件应原样上传。
- 禁止在通用同步命令中隐式执行昂贵的 GIF 或视频转码。
- 只有显式传入 `--optimize-on-upload` 时，上传阶段才允许压缩。
- OSS 已存在对应 `-optimized.webp` 时，同步必须优先复用。
- 需要补做云端优化时，使用独立优化脚本，并用 `--slug` 限定单个项目。

单项目图片优化：

```powershell
node scripts/optimize-oss-assets.mjs --slug=<project-slug>
node scripts/update-notion-body-media-to-optimized.mjs --slug=<project-slug>
node scripts/publish-oss-content.mjs --table=projects --slug=<project-slug>
```

优化完成后必须确认：

- Notion 正文引用新的 OSS WebP。
- 项目 `content.json` 不再引用旧 GIF。
- 公开页面使用 WebP。
- 旧原文件在确认无引用前不得删除。

## 7. OSS 目录规则

每个表一个一级目录，每个条目一个目录；项目必须一个项目一个文件夹：

```text
uploads/admin/notion-sync/
  studio-project-categories/<category>/
  studio-projects/<project-slug>/
    content.json
    <cover-and-body-media>
  studio-tools/<tool>/
  studio-social-links/<platform>/
  studio-experience/<experience>/
```

- 不要恢复为所有条目混在 `notion-sync/` 根目录。
- 不要增加没有实际用途的多层字段目录。
- 项目目录以稳定 Slug 为主。
- 重组旧目录时先复制、更新引用和验证，再考虑删除旧对象。

## 8. 超时、进度与失败

- 每个项目开始、每个 Files 字段、每个正文媒体和每个项目完成都要输出进度。
- 大文件下载要输出已下载体积、总大小、百分比和耗时。
- 下载、上传和 OSS 操作必须有超时。
- 单个项目连续媒体失败达到上限后跳过剩余媒体，继续下一个项目。
- 一个项目失败不能阻塞其他项目。
- 汇总必须包含 `uploaded`、`reused`、`skipped`、`failedRows` 和状态跳过数量。
- `skipped existing-oss` 表示云端资源已存在并被复用，不是错误。

## 9. 发布与缓存

发布写入：

```text
uploads/admin/notion-sync/studio-projects/<slug>/content.json
uploads/admin/site-content.json
```

规则：

- `content.json` 保留 Notion 正文顺序、标题、段落、链接、图片、视频、列表、引用、caption、多栏和支持的嵌套结构。
- 不支持的 Notion block 要安全跳过，不能让页面崩溃。
- `Studio Projects` 发布按 Slug 更新同一个项目 JSON。
- 网站使用 `PUBLIC_CONTENT_CACHE_TAG` 和 `PUBLIC_CONTENT_REVALIDATE_SECONDS`。
- TTL 是公开内容自动更新的可靠兜底；当前值由 `src/lib/cache-tags.ts` 统一定义，禁止在多个文件中分别写死。
- 发布脚本可以在配置了 `REVALIDATE_SECRET` 时请求立即刷新，但刷新失败不得判定内容发布失败。
- 没有配置线上 Revalidate Secret 时，网站仍必须在 TTL 到期后自动读取新 OSS JSON。
- 发现网站数量旧时，先比较 OSS `site-content.json` 与前台数量并等待 TTL，不要重复同步 Notion。

## 10. 常用命令

全部内容表：

```powershell
npm run content:update-all
```

仅项目：

```powershell
npm run content:update-projects
```

单独内容表：

```powershell
npm run content:update-categories
npm run content:update-tools
npm run content:update-social
npm run content:update-experience
```

项目同步已经包含逐项目 JSON 发布，不需要再手动紧接着运行 `content:publish`。`content:update-all` 会在全部表同步后刷新总索引。

## 11. 发布后验证

至少检查：

1. OSS `site-content.json` 中 Published 数量与预期一致。
2. `/works` 的 All 与分类数量一致。
3. 一个新项目详情页可以打开。
4. 项目 `content.json` 存在且 Notion block 顺序正确。
5. 正文没有非 OSS 临时 URL。
6. 有优化 WebP 时，正文没有回退到 GIF。
7. 页面无明显 console error。
8. 同步成功项目已逐条变为 `已同步`，失败项目仍保持可重试状态。

## 12. 删除旧资源

- 删除不是同步流程的一部分。
- 必须先审计 Notion、`site-content.json` 和所有项目 `content.json` 的引用。
- 默认只运行报告模式：

```powershell
npm run content:delete-unused-originals
```

- 只有报告确认无引用且用户明确要求时，才可运行带 `--delete` 的应用命令。
- 删除前记录 Object Key；批量删除不能依赖未经验证的通配符。

## 13. 安全

- `.env.local` 不提交 Git。
- 不截图或粘贴包含 Notion Token、阿里云 AccessKey、管理员 Secret 的配置文件。
- 密钥一旦出现在截图、日志或对话中，应立即轮换。
- 前端 bundle、公开 JSON 和日志不得包含任何 Secret。
- 阿里云 AccessKey 只能在本地脚本、GitHub Actions Secret 或服务端环境使用。
