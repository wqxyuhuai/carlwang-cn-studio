# Data Flow

This document describes the current public runtime and publishing flow. Field-level Notion rules live in `docs/NOTION_SCHEMA.md`.

## Current Sources

```plain text
Notion source databases
  -> local publishing scripts
  -> Aliyun OSS media and JSON
  -> public Next.js data layer
  -> public pages
```

The site no longer has an in-site admin console or `/api/admin/*` routes.

## Publishing Flow

```plain text
Notion edits
  -> npm run content:sync-all
  -> scripts sync Notion media to OSS
  -> npm run content:publish
  -> uploads/admin/site-content.json is updated
  -> optional POST /api/revalidate with REVALIDATE_SECRET
  -> public caches refresh
```

Rules:

- `uploads/admin/...` remains the remote OSS path for compatibility.
- Public pages never query Notion from client components.
- Secrets stay in local/server environments only.
- `contentUrl` points each work to a per-project body JSON file under OSS.

## Public Read Flow

```plain text
src/lib/public-content.ts
  -> getStudioData()
  -> read NEXT_PUBLIC_CONTENT_URL
  -> normalize works, types, tools, socials and experiences
  -> overlay D1 view counts
  -> cache with PUBLIC_CONTENT_CACHE_TAG
```

Rules:

- Public content uses a short TTL plus tag revalidation.
- Missing or invalid OSS JSON must fall back safely.
- Public components should consume the shared data layer instead of hard-coded long-lived content.

## Work Detail Flow

```plain text
/works/[slug]
  -> getWorkBySlug(slug)
  -> read cached public work index
  -> read cached per-project contentUrl JSON when needed
  -> render Notion blocks
```

Rules:

- Detail route uses `slug` from the published work index.
- Detail body JSON should remain cacheable to avoid repeated multimedia metadata fetches.
- Every entry point must preserve the current return URL with `from`.
- Close button and Escape use `from`, then session storage, then referrer, then fallback.
- Return state records the active works surface, selected filter, Grid/List mode and nested scroll offsets. Restore it before consuming it so a detail exit does not reset Index to the top.
- Detail-to-detail pager links preserve the same original return URL and state.

## Media Delivery Flow

```plain text
public OSS media URL
  -> /api/media/oss when proxying is needed
  -> Worker runtime cache and range-response handling
  -> browser and Cloudflare immutable cache headers
  -> preview, lightbox or fullscreen player
```

Rules:

- Keep range-request support for videos and large media.
- Reuse cached media for warm navigation; do not add cache-busting query parameters to ordinary reads.
- A view-count write is not a media or public-content cache invalidation event.
- Public image deterrents improve casual protection only. OSS images remain browser-accessible public assets.

## View Count Flow

```plain text
Work detail mounts
  -> POST /api/works/[slug]/view
  -> D1 WORK_METRICS_DB increments views
  -> detail heading updates from API response
```

Rules:

- Counts are cumulative across browsers and devices.
- Successful D1 increments must not revalidate the full public content cache on every view.
- If D1 is unavailable, the route can fall back to updating the public OSS index JSON without invalidating every public page.
- The current detail page applies the returned count immediately; later public-content cache refreshes pick up the OSS fallback value.

## Contact Flow

```plain text
Public Contact Form submit
  -> client validation
  -> /api/contact server validation
  -> honeypot and rate-limit checks
  -> ok/error JSON response
```

Rules:

- Raw contact name, email and message are user data.
- Do not log or expose raw submissions unless a protected destination is explicitly added.
- Message length is limited server-side.

## Revalidate Flow

```plain text
POST /api/revalidate
  -> validate REVALIDATE_SECRET from header or query
  -> mark PUBLIC_CONTENT_CACHE_TAG stale
  -> serve the last valid render while content refreshes in the background
```

Rules:

- `/api/revalidate` is secret-only.
- The shared public-content tag covers `/`, `/works`, `/about` and dynamic work detail routes.
- Do not expire the root layout synchronously; that moves full-route regeneration onto the next visitor request.
