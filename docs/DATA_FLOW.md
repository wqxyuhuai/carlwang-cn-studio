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
- If D1 is unavailable, the route can fall back to updating the public OSS index JSON and then revalidate public caches.

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
  -> revalidate PUBLIC_CONTENT_CACHE_TAG
  -> revalidate public routes
```

Rules:

- `/api/revalidate` is secret-only.
- Revalidation covers `/`, `/works`, `/about` and dynamic work detail routes.
