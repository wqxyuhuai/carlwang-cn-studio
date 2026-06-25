# Carl Wang Studio

Personal portfolio and admin-managed content platform for `studio.carlwang.cn`.

## Local Development

```bash
npm install
npm run dev
```

Open `http://localhost:3000`.

## Commands

```bash
npm run lint
npm run typecheck
npm run build
npm run build:export
npm run check
npm run format
```

Use `npm run build:export` before publishing the ignored `out/` directory to a static host. A normal `npm run build` only updates the server build in `.next/`.

## Environment

Copy `.env.example` to `.env.local` and fill server-only values before using real integrations:

- `ADMIN_PASSWORD_HASH` and `ADMIN_SESSION_SECRET` protect `/admin` and admin APIs.
- `NOTION_TOKEN` plus the `NOTION_DATABASE_*` ids enable the Notion content source.
- `ALIYUN_OSS_*` values enable server-side uploads and public asset URLs.
- `REVALIDATE_SECRET` protects external revalidation calls.

Do not expose Notion tokens, Aliyun AccessKeys or admin credentials through `NEXT_PUBLIC_*`, client code or public JSON.

## Project Guides

- `AGENTS.md` defines project guardrails for Codex and future coding agents.
- `HARNESS.md` is the canonical validation checklist before publishing.
- `docs/NOTION_SCHEMA.md` maps Notion databases, fields, read/write rules and OSS relations.
- `docs/DATA_FLOW.md` documents Works, upload, contact, settings and revalidation flows.
- `docs/project-inventory.md` records current routes, components, data layers and integration files.
- `docs/cleanup-notes.md` records confirmed cleanup decisions and deferred cleanup.

## Current Scope

- Public Home, Works, Work Detail, About and Footer pages read through `src/lib/public-content.ts` with safe fallback data.
- Admin Dashboard, Works, Categories, Tools, Social Links, Contact Messages, local fallback content, Media Library and Integrations are schema-driven.
- Notion CRUD is centralized in the admin content store and Notion adapter.
- OSS uploads run only through protected server APIs, write Media Assets records and store object keys for reference checks.
- Contact Form submissions are validated server-side and written as read-only contact message records.
- Saves can trigger protected revalidation so cached public pages refresh after content updates.

## Data Sources

Default local development uses a file-backed fallback store. Real content uses:

- `ADMIN_CONTENT_SOURCE=notion` for the five active Notion databases.
- `ADMIN_CONTENT_SOURCE=local` for local fallback JSON.
- Public pages never query Notion directly from client components.

Secrets must stay server-side. Do not expose Aliyun AccessKey, AccessKey Secret or Notion token to the browser.
