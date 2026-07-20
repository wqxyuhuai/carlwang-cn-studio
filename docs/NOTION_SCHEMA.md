# Notion Schema

This project uses the `PW2 web key database` page as its editorial source. The current production model contains six active databases. Five are synchronized to OSS for public content, while `Studio Contact Messages` is write-only from the public contact form.

## Active Databases

| Website model | Notion database | Role |
| --- | --- | --- |
| Project Categories | `Studio Project Categories` | Works filters, category display and Project category relation. |
| Works | `Studio Projects` | Works list, Home featured works and Work Detail source. |
| Tools | `Studio Tools` | About tools and project tool icon lookup. |
| Social Links | `Studio Social Links` | About, Footer and Contact links. |
| Experience | `Studio Experience` | About experience timeline. |
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
| Studio Experience | `NOTION_ABOUT_EXPERIENCE_DATABASE_ID` |
| Studio Contact Messages | `NOTION_CONTACT_MESSAGES_DATABASE_ID` |

Older local key files may still contain the aliases below:

- `NOTION_STUDIO_PROJECTS_DATABASE_ID`
- `NOTION_STUDIO_PROJECT_CATEGORIES_DATABASE_ID`
- `NOTION_STUDIO_TOOLS_DATABASE_ID`
- `NOTION_STUDIO_SOCIAL_LINKS_DATABASE_ID`
- `NOTION_STUDIO_ABOUT_EXPERIENCE_DATABASE_ID`
- `NOTION_STUDIO_CONTACT_MESSAGES_DATABASE_ID`

These aliases are retained only for legacy reference. The current sync and
publishing scripts require the preferred variables in the table above; an alias
must not be used as a substitute.

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
- The sync script reads the Project's Notion page body, preserves its supported block structure, rewrites media to OSS URLs, and publishes it as the project's `content.json`.
- Work Detail reads the published OSS `content.json`; public pages never query Notion directly.

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

## 5. Studio Experience

Purpose: About page experience timeline. This table is synchronized to OSS public content.

| Field | Type | Required | Editable | Website use |
| --- | --- | --- | --- | --- |
| Title | Title | Yes | Yes | Experience or role title. |
| Company | Rich text | No | Yes | Organization name. |
| Start Date | Date | No | Yes | Timeline start date. |
| End Date | Date | No | Yes | Timeline end date. |
| Date Label | Rich text | No | Yes | Optional authored date label. |
| Type | Select | No | Yes | Experience type; published as a tag when present. |
| Description | Rich text | No | Yes | Public experience description. |
| Company Logo | Files | No | Yes | Organization visual synchronized to OSS. |
| Order | Number | No | Yes | Experience sort order. |
| Active | Checkbox | No | Yes | Only active entries are shown. |
| 同步状态 | Select | No | Yes | Uses the shared synchronization state rules. |

Published field mapping:

- `Title` -> `title`
- `Company` -> `organization`
- `Start Date` -> `startDate`
- `End Date` -> `endDate`
- `Date Label` -> `dateLabel`
- `Type` -> `tags`
- `Description` -> `descriptionEn`
- `Company Logo` -> `imageUrl`
- `Order` -> `order`
- `Active` -> `visible`

## 6. Studio Contact Messages

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
- Studio Experience

| 同步状态 | Sync behavior |
| --- | --- |
| 编辑中 | Skip. Do not upload, publish or change status. |
| 待同步 | Create or synchronize the item in OSS. |
| 待更新 | Update the existing website item using the same Notion page ID. |
| 已同步 | Skip by default. |

Notion page ID is the stable record ID. The app should not depend on Title alone.
For Projects, `展示状态` controls public visibility independently from `同步状态`.
After all media and the per-project `content.json` publish successfully, the
sync script changes that Project to `已同步` immediately. See
`docs/CONTENT_SYNC_RULES.md` for the required transaction order.

## OSS Rules

- Aliyun AccessKey values stay server-side in `.env.local`.
- Notion is the editorial source, but public pages consume only published OSS JSON and OSS media URLs.
- Uploads use safe generated filenames under `ALIYUN_OSS_UPLOAD_PREFIX`.
- Tools, social icons, category covers and project covers can all be Files in Notion.
- Existing OSS media must be reused before local or Notion downloads are attempted.
