# Data Flow

This document describes the runtime flow for the current five-database Notion model. Field-level rules live in `docs/NOTION_SCHEMA.md`.

## Current Notion Sources

```plain text
Studio Project Categories -> Works filters and category labels
Studio Projects           -> Home featured works, Works list and Work Detail
Studio Tools              -> About tools and Project tool icon lookup
Studio Social Links       -> About, Contact and Footer links
Studio Contact Messages   -> Contact form submissions
```

`Studio Site Settings` is no longer part of the data model and is not read by the app.

## Works Flow

```plain text
Admin or Notion edits a Studio Project
  -> record is read through the Notion adapter
  -> 展示状态 controls public visibility
  -> Date controls public ordering and year filters
  -> Category relation resolves against Studio Project Categories
  -> Tools multi-select labels match Studio Tools.Name
  -> public Home reads Featured + 展示 projects
  -> public Works reads 展示 projects sorted by Date descending
  -> Work Detail reads the Project page body blocks
```

Rules:

- Works page shows only `展示状态 = 展示`.
- Home featured shows only `Featured = true` and `展示状态 = 展示`.
- `Year`, `Status` and Project `Order` are deprecated.
- Work Detail uses `Slug` for routing.
- Unsupported Notion page-body blocks are skipped safely.

## Tool Icon Flow

```plain text
Studio Projects.Tools multi-select tag
  -> match tag text to Studio Tools.Name
  -> if Active = true and Logo SVG exists, render icon
  -> if no match exists, render text label only
```

Rules:

- `Studio Projects.Tools` is not a relation.
- Matching is name-based and case-insensitive.
- Missing icons must not break the detail page.

## Category Flow

```plain text
Studio Project Categories
  -> sort by Order ascending
  -> create Works filter options
  -> Project Category relation resolves display label
```

Rules:

- Filters are not hard-coded.
- `同步状态 = 编辑中` is skipped.

## Social Link Flow

```plain text
Studio Social Links
  -> filter Active = true
  -> sort by Order
  -> Group controls placement
  -> 点击处理方式 controls copy/new-window/mail behavior
```

Rules:

- Footer uses configured links and hides empty URLs.
- External links open in a new tab.
- Email links should use `mailto:` when the Notion URL is configured that way.

## Contact Flow

```plain text
Public Contact Form submit
  -> frontend validation
  -> /api/contact server validation
  -> honeypot and rate limit checks
  -> write Studio Contact Messages
  -> Status defaults to New
  -> 邮件通知状态 and Notion 通知状态 default to 未通知
  -> admin reviews and updates Status
```

Rules:

- Name, Email, Message, Source Page and Created At are read-only.
- Message length is limited to 2000 characters.
- Source Page is written as an absolute URL because Notion uses a URL property.

## OSS Upload Flow

```plain text
Admin chooses a file
  -> protected server upload API validates type and size
  -> server uploads to Aliyun OSS
  -> server generates public File URL and Object Key
  -> local Media Library stores upload history
  -> admin can paste/select URLs into Notion Files or relevant fields
```

Rules:

- AccessKey and Secret stay server-side.
- The browser never receives Aliyun credentials.
- File names are normalized to a generated safe name.
- Public read access must work for front-end rendering.

## Revalidate Flow

```plain text
Admin saves content
  -> server persists content
  -> server calls protected revalidate
  -> public route cache refreshes
  -> admin shows saved-and-updated or saved-but-cache-may-update-later
```

Rules:

- `/api/admin/revalidate` is protected by admin auth or `REVALIDATE_SECRET`.
- Revalidation covers `/`, `/works`, `/about` and dynamic work detail routes.
