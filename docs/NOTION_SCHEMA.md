# Notion Schema

This project now uses the `PW2 web key database` page as the Notion source. The current production Notion model intentionally keeps only five databases.

## Active Databases

| Website model | Notion database | Role |
| --- | --- | --- |
| Project Categories | `Studio Project Categories` | Works filters, category display and Project category relation. |
| Works | `Studio Projects` | Works list, Home featured works and Work Detail source. |
| Tools | `Studio Tools` | About tools and project tool icon lookup. |
| Social Links | `Studio Social Links` | About, Footer and Contact links. |
| Contact Messages | `Studio Contact Messages` | Contact form submissions. |

`Studio Site Settings` has been removed and is not read by the application. Static site metadata and fallback copy stay in code/local fallback data.

## Environment Mapping

The app uses Notion data source IDs in `.env.local`.

| Notion database | Preferred env var |
| --- | --- |
| Studio Projects | `NOTION_WORKS_DATABASE_ID` |
| Studio Project Categories | `NOTION_WORK_TYPES_DATABASE_ID` |
| Studio Tools | `NOTION_TOOLS_DATABASE_ID` |
| Studio Social Links | `NOTION_SOCIAL_LINKS_DATABASE_ID` |
| Studio Contact Messages | `NOTION_CONTACT_MESSAGES_DATABASE_ID` |

The user-facing key file may also contain these aliases, which are supported by the app:

- `NOTION_STUDIO_PROJECTS_DATABASE_ID`
- `NOTION_STUDIO_PROJECT_CATEGORIES_DATABASE_ID`
- `NOTION_STUDIO_TOOLS_DATABASE_ID`
- `NOTION_STUDIO_SOCIAL_LINKS_DATABASE_ID`
- `NOTION_STUDIO_CONTACT_MESSAGES_DATABASE_ID`

## 1. Studio Project Categories

Purpose: first-level project categories for Works filters and category relations.

| Field | Type | Required | Editable | Website use |
| --- | --- | --- | --- | --- |
| 同步状态 | Select | No | Yes | `编辑中` is skipped. Other values are eligible. |
| Order | Number | No | Yes | Category sort order. |
| Category | Title | Yes | Yes | Public category name and slug source. |
| Cover | Files | No | Yes | Optional category visual. |

Default categories:

- Brand Design
- Web Design
- App & Platform Design
- Product Design
- Exhibition Design
- Motion & Video
- AI & Personal Projects

Frontend rules:

- Works filters are generated from this database.
- Categories are sorted by `Order` ascending.
- The app does not hard-code category filters.

## 2. Studio Projects

Purpose: core source for Works list, Home featured works and Work Detail pages.

| Field | Type | Required | Editable | Website use |
| --- | --- | --- | --- | --- |
| Title | Title | Yes | Yes | Work title. |
| 同步状态 | Select | No | Yes | `编辑中` is skipped. |
| Featured | Checkbox | No | Yes | Enables Home featured display. |
| Slug | Text | Yes | Yes | Unique `/works/[slug]` route. |
| Tools | Multi-select | No | Yes | Tool tags matched by name against `Studio Tools.Name`. |
| Date | Date | Yes | Yes | Sort source. Works default sort is Date descending. |
| Category | Relation | Yes | Yes | Relation to `Studio Project Categories`. |
| Cover | Files | Yes | Yes | Work card, Home featured and detail cover. |
| 展示状态 | Select | Yes | Yes | `展示` means public; `不展示` means hidden. |

Frontend rules:

- Works page shows only `展示状态 = 展示`.
- Home featured shows only `展示状态 = 展示` and `Featured = true`.
- `Year` is deprecated; year filters are derived from `Date`.
- `Order` is deprecated for Projects; public ordering uses `Date` descending.
- `Status` is deprecated; public visibility uses `展示状态`.
- `Tools` is multi-select, not a relation.
- Work Detail reads the Notion page body from the Project page.

Supported page body blocks:

- headings
- paragraphs
- images
- videos
- bulleted lists
- numbered lists
- quotes
- callouts
- dividers
- basic links/bookmarks where available

Unsupported blocks are skipped safely.

## 3. Studio Tools

Purpose: About tool display and Project tool icon mapping.

| Field | Type | Required | Editable | Website use |
| --- | --- | --- | --- | --- |
| Order | Number | No | Yes | Tool sort order. |
| Name | Title | Yes | Yes | Tool key used to match `Studio Projects.Tools`. |
| 同步状态 | Select | No | Yes | `编辑中` is skipped. |
| Category | Select | Yes | Yes | Design, Motion, 3D, Development, AI, Font, Workflow. |
| Active | Checkbox | No | Yes | Only active tools are shown/matched visually. |
| Logo SVG | Files | No | Yes | Tool icon. SVG or high-resolution PNG recommended. |

Frontend rules:

- About shows tools where `Active = true`.
- Project details match each `Studio Projects.Tools` tag to `Studio Tools.Name`.
- If a match has `Logo SVG`, the icon is shown.
- If no match exists, the tool name is shown as text only.

## 4. Studio Social Links

Purpose: social, portfolio, contact and footer links.

| Field | Type | Required | Editable | Website use |
| --- | --- | --- | --- | --- |
| 同步状态 | Select | No | Yes | `编辑中` is skipped. |
| Order | Number | No | Yes | Link sort order. |
| Platform | Title | Yes | Yes | Platform name. |
| Active | Checkbox | No | Yes | Only active links are shown. |
| Display Label | Text | No | Yes | Public label. |
| URL | URL | Yes | Yes | Destination, homepage, mailto link or copy target. |
| 点击处理方式 | Select | No | Yes | Copy, new-window open or mailto behavior. |
| Group | Select | No | Yes | Social, Portfolio, Contact, Footer. |
| Black Logo | Files | No | Yes | Monochrome logo. |
| Color Logo | Files | No | Yes | Color logo. |
| 卡片背景色号 | Text | No | Yes | Social card background color. |
| 卡片logo色号 | Text | No | Yes | Social card logo color. |

Frontend rules:

- Only `Active = true` links are rendered.
- Footer uses `Group = Footer` plus portfolio/social links where suitable.
- Contact/About modules use `Group = Contact`, `Social`, `Portfolio` or `Form`.
- External links open in a new tab.
- Email links use `mailto:` when configured.

## 5. Studio Contact Messages

Purpose: contact form destination. This table is not a public content source.

| Field | Type | Required | Editable | Website use |
| --- | --- | --- | --- | --- |
| Name | Title | Yes | No | Submitted name. |
| Created At | Date | Yes | No | Submission time. |
| Email | Email | Yes | No | Submitted email. |
| Message | Text | Yes | No | Submitted message. |
| Source Page | URL | No | No | Absolute source URL. |
| Status | Select | No | Yes | New, Read, Replied, Archived. |
| 邮件通知状态 | Status | No | No | Defaults to `未通知`. |
| Notion 通知状态 | Status | No | No | Defaults to `未通知`. |

Contact form write defaults:

- `Status = New`
- `邮件通知状态 = 未通知`
- `Notion 通知状态 = 未通知`

Admin rules:

- Raw Name, Email, Message, Source Page and Created At are read-only.
- Admin can update `Status`.
- Message length is limited to 2000 characters.
- Honeypot and simple rate limiting are enabled.

## Sync Status Rules

The following tables use `同步状态`:

- Studio Project Categories
- Studio Projects
- Studio Tools
- Studio Social Links

| 同步状态 | Runtime behavior |
| --- | --- |
| 编辑中 | Skip from public rendering. |
| 待同步 | Eligible for public rendering. |
| 待更新 | Eligible for public rendering. |
| 已同步 | Eligible for public rendering. |

Notion page ID is the stable record ID. The app should not depend on Title alone.

## OSS Rules

- Aliyun AccessKey values stay server-side in `.env.local`.
- Public pages consume URLs from Notion Files or server-generated OSS URLs.
- Uploads use safe generated filenames under `ALIYUN_OSS_UPLOAD_PREFIX`.
- Tools, social icons, category covers and project covers can all be Files in Notion.
