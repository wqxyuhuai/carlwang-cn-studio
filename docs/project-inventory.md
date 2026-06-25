# Project Inventory

## Current Frontend Pages

- `src/app/page.tsx`: homepage hero, featured work strip, about copy, field hover showcase and footer.
- `src/app/works/page.tsx`: works listing surface through `WorksBrowser`.
- `src/app/works/[slug]/page.tsx`: work detail page using `getWorkBySlug` and `getPublishedWorks`.
- `src/app/about/page.tsx`: About hero, direction showcase, experience rows, contact form and footer.
- `src/app/not-found.tsx`, `src/app/robots.ts`, `src/app/sitemap.ts`: app-level support routes.

## Current Admin Pages

- `src/app/admin/page.tsx`: admin route wrapper.
- `src/app/admin/admin-app.tsx`: login, dashboard, collection editor, integrations, media upload and security UI.
- Admin styling is in the `admin-*` section of `src/app/globals.css`.

## Current Route Structure

Public routes:

- `/`
- `/works`
- `/works/[slug]`
- `/about`

Admin and API routes:

- `/admin`
- `/api/contact`
- `/api/admin/login`
- `/api/admin/logout`
- `/api/admin/session`
- `/api/admin/dashboard`
- `/api/admin/[collection]`
- `/api/admin/[collection]/[id]`
- `/api/admin/integrations/status`
- `/api/admin/integrations/test-notion`
- `/api/admin/integrations/test-oss`
- `/api/admin/media/upload`
- `/api/admin/revalidate`

## Current Component Directories

- `src/components/home`: homepage motion and hover showcase components.
- `src/components/about`: About direction showcase.
- `src/components/works`: works browser.
- `src/components/notion`: Notion block renderer.
- `src/components`: shared site navigation, footer, contact form, cascade text and glass SVG filter.

The current directory structure is intentionally kept stable for Task 01. A broader move into `components/site`, `components/common` or `components/admin` should wait until a later refactor with visual regression checks.

## Current Style Files

- `src/app/globals.css`: global CSS, public page styles, motion styles and admin styles.
- `src/styles/design-tokens.css`: fonts, color tokens, type scale, spacing, layout dimensions and motion tokens.
- `postcss.config.mjs`: Tailwind v4 PostCSS configuration.

## Current Mock And Fallback Data

- `src/lib/site-data.ts`: public data layer, OSS JSON fetch, normalization and fallback site content.
- `src/lib/admin/seed.ts`: local admin seed derived from fallback content.
- `.admin/admin-content.json`: ignored local admin store when created at runtime.

Fallback data is still active and must stay until real public content is fully connected.

## Current Notion And Aliyun Code

- `src/lib/admin/notion-store.ts`: Notion token access, database ID resolution, read/write/archive helpers and connection tests.
- `src/lib/admin/oss.ts`: Aliyun OSS config, upload helper, object URL generation and health check upload.
- `src/lib/admin/integrations.ts`: masked integration status and test wrappers.
- `src/lib/admin/content-store.ts`: local vs Notion collection source routing, validation, archive/delete behavior and dashboard data.
- `src/lib/admin/schema.ts`: admin collection schema, Notion property mapping and navigation.
- `src/lib/admin/auth.ts`: password verification, session token, CSRF, cookie and lockout logic.

## Current Environment Files

- `.env.example`: placeholder-only public, admin, Notion and Aliyun variables.
- `.env`, `.env.local` and `.env.*.local`: ignored and must never be committed.

Key server-only variables:

- `ADMIN_PASSWORD_HASH`
- `ADMIN_SESSION_SECRET`
- `REVALIDATE_SECRET`
- `NOTION_TOKEN`
- `ALIYUN_ACCESS_KEY_ID`
- `ALIYUN_ACCESS_KEY_SECRET`
- `ALIYUN_OSS_ACCESS_KEY_ID`
- `ALIYUN_OSS_ACCESS_KEY_SECRET`

## Current Package Scripts

- `npm run dev`: local Next dev server.
- `npm run build`: production build.
- `npm run start`: production server.
- `npm run lint`: ESLint.
- `npm run format`: ESLint auto-fix.
- `npm run typecheck`: TypeScript no-emit check.
- `npm run screenshots`: Playwright screenshot capture.
- `npm run admin:hash`: admin password hash generator.
- `npm run check`: lint, typecheck and build.

## Current Docs

- `README.md`: basic local commands and project scope.
- `AGENTS.md`: agent working rules and project guardrails.
- `HARNESS.md`: canonical validation checklist.
- `docs/harness.md`: Figma and token-specific harness notes.
- `docs/admin.md`: admin runtime, auth, content and API notes.
- `docs/NOTION_SCHEMA.md`: Notion schema mapping notes.
- `docs/DATA_FLOW.md`: Notion, OSS, contact and settings data flow notes.
- `docs/oss-content-flow.md`: OSS content flow notes.
- `docs/design-tokens.md`: token documentation.
- `docs/figma-implementation.md`: Figma implementation notes.
- `docs/cleanup-notes.md`: cleanup decisions and deferred cleanup.
