# Project Inventory

## Public Routes

- `/`: homepage shell, featured work canvas, works browser and About preview.
- `/works`: works browser.
- `/works/[slug]`: work detail page with contextual return behavior.
- `/about`: About, direction showcase, experience, contact form and social links.
- `/video-player-demo`: local video player inspection route.

## API Routes

- `/api/contact`: validates contact form submissions and returns public success/error JSON.
- `/api/media/oss`: server-side OSS media proxy/cache for public assets.
- `/api/works/[slug]/view`: increments D1-backed work view counts, with OSS fallback.
- `/api/revalidate`: secret-only public cache revalidation.

There is no `/admin` route and no `/api/admin/*` runtime surface.

## Core Public Components

- `src/components/home/*`: homepage shell, featured work canvas, tabbed navigation and hover showcase.
- `src/components/about/*`: About page structure, direction media and experience/contact composition.
- `src/components/works/*`: works browser, detail heading, detail close, detail scroll helpers.
- `src/components/notion/notion-renderer.tsx`: renders published Notion body blocks.
- `src/components/video/*`: custom project video player and related styling.
- `src/components/image-protection.tsx`: public image interaction protection.

## Data Layer

- `src/lib/public-content.ts`: public aggregation and cache layer.
- `src/lib/site-data.ts`: OSS index JSON reader, fallback content and per-project body reader.
- `src/lib/cache-tags.ts`: shared cache tag constants.
- `src/lib/work-view-counts.ts`: D1 work metrics.
- `src/lib/oss.ts`: minimal server-side OSS helper for runtime fallback writes.
- `src/lib/work-detail-return.ts`: detail-page return URL storage and validation.
- `src/lib/work-metrics.ts`: public metric label formatting.

## Publishing And Asset Scripts

- `scripts/sync-notion-assets-to-oss.mjs`: syncs Notion asset references to OSS.
- `scripts/publish-oss-content.mjs`: publishes public `site-content.json` and per-project `content.json` files.
- `scripts/optimize-oss-assets.mjs`: optimizes image assets.
- `scripts/optimize-oss-videos.mjs`: optimizes video assets.
- `scripts/update-notion-body-media-to-optimized.mjs`: rewrites Notion body media to optimized URLs.
- `scripts/delete-unused-oss-originals.mjs`: audits or deletes unused original OSS media when run with `--delete`.
- `scripts/capture-screenshots.mjs`: local visual screenshot helper.

## Runtime Bindings

- `WORK_METRICS_DB`: Cloudflare D1 database for work view counts.
- `ASSETS`: OpenNext asset binding.
- `IMAGES`: Cloudflare Images binding if used by runtime.

## Important Compatibility Notes

- Published OSS paths still use `uploads/admin/...`. This is a legacy object prefix and should not be interpreted as an active admin feature.
- Public content caches are refreshed by TTL and `/api/revalidate`, not by admin saves.
- Contact submissions are not stored in the removed admin system.
