# Carl Wang Studio

Personal portfolio and lightweight public content site for `studio.carlwang.cn`.

The approved visual system is static and should stay stable. Real content is published from Notion into Aliyun OSS JSON, then read by the public Next.js app. There is no in-site admin console.

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
npm run check
npm run format
npm run screenshots
```

Content publishing and asset maintenance:

```bash
npm run content:sync-all
npm run content:publish
npm run content:update-all
npm run content:optimize-assets
npm run content:optimize-videos
```

Deployment targets Cloudflare Workers through OpenNext:

```bash
npm run preview
npm run upload
npm run deploy
```

GitHub Actions builds the OpenNext bundle and runs `wrangler deploy` directly. This keeps deployment independent from OpenNext's optional KV bulk prefill; the `NEXT_INC_CACHE_KV` and `NEXT_TAG_CACHE_KV` bindings are populated by runtime traffic. Manual `npm run deploy` remains available for an authenticated local release.

## Runtime Data

- `src/lib/public-content.ts` is the public page data layer.
- `src/lib/site-data.ts` reads the public OSS index JSON and per-project `contentUrl` JSON.
- Public content is cached with the `public-content` tag and a short TTL.
- Work detail page bodies are cached by `contentUrl` to avoid refetching project multimedia metadata on every navigation.
- Work view counts use the `WORK_METRICS_DB` D1 binding and fall back to OSS JSON only when D1 is unavailable.
- View-count writes never invalidate the full public content cache; the detail page applies the API response immediately.
- `/api/revalidate` refreshes public content caches with `REVALIDATE_SECRET`.

The current OSS object path still contains `uploads/admin/...` for backward compatibility with already published content. It is only an OSS folder name now, not an active admin route.

## Environment

Copy `.env.example` to `.env.local` and fill server-only values as needed:

- `NEXT_PUBLIC_CONTENT_URL` points at the public OSS site-content JSON.
- `REVALIDATE_SECRET` protects `/api/revalidate`.
- `NOTION_TOKEN` and Notion database/data-source IDs are used only by local publishing scripts.
- `ALIYUN_OSS_*` values are used by publishing, optimization and fallback server-side OSS writes.

Do not expose Notion tokens or Aliyun AccessKeys through client code, logs, public JSON or `NEXT_PUBLIC_*` variables.

## Project Guides

- `AGENTS.md` defines project guardrails for Codex and future coding agents.
- `HARNESS.md` is the canonical validation checklist before publishing.
- `docs/DATA_FLOW.md` documents Notion-to-OSS publishing, public reads, caching and metrics.
- `docs/NOTION_SCHEMA.md` maps the Notion source fields.
- `docs/cleanup-notes.md` records cleanup decisions and deferred cleanup.

## Public Scope

- `/` renders the homepage shell, featured work canvas, About preview, works browser and contact link.
- `/works` renders the works browser.
- `/works/[slug]` renders a detail page from cached public content plus per-project body JSON.
- `/about` renders About, direction, experience, contact form and social links.
- `/api/contact` validates public contact submissions and preserves the front-end response path without storing raw messages in the removed admin system.
- `/api/works/[slug]/view` increments real cross-device view counts.
- `/api/revalidate` refreshes public caches after publishing.
