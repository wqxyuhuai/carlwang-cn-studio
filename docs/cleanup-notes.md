# Cleanup Notes

## 2026-07-09 Admin Removal

The in-site admin console and authenticated `/api/admin/*` routes were removed because content is now managed through Notion-to-OSS publishing scripts instead of the site UI.

Removed runtime areas:

- `src/app/admin/*`
- `src/app/api/admin/*`
- `src/lib/admin/*`
- `scripts/generate-admin-password-hash.mjs`
- admin-only global CSS
- `bcryptjs` runtime dependency

Replacement paths:

- Public content read layer: `src/lib/public-content.ts`
- OSS index and per-project content reader: `src/lib/site-data.ts`
- Shared cache tag: `src/lib/cache-tags.ts`
- Minimal runtime OSS fallback helpers: `src/lib/oss.ts`
- Secret-only cache refresh: `src/app/api/revalidate/route.ts`
- D1-backed work view counts: `src/lib/work-view-counts.ts`

The remote OSS folder `uploads/admin/...` remains active only as a compatibility path for already published JSON and media. Do not rename it without a migration.

## Confirmed Active

- `src/app/page.tsx`, `src/components/home/*` and `public/field-media/*` drive the approved homepage field and Featured Works interactions.
- `src/app/about/page.tsx` and `src/components/about/*` drive the current About page structure.
- `src/app/works/page.tsx`, `src/app/works/[slug]/page.tsx` and `src/components/works/*` drive public works browsing, detail routing and return behavior.
- `src/components/contact-form.tsx`, `src/components/footer-navigation.tsx`, `src/components/site-nav.tsx` and `src/components/glass-distortion-filter.tsx` are used by public pages or the app shell.
- Content publishing scripts under `scripts/content:*` remain active for Notion and OSS workflows.

## Confirmed Unused Local Artifacts

These files were previously identified as safe to remove from the working tree if they reappear:

- `package-PC-XIAOXIN.json`
- `package-lock-PC-XIAOXIN.json`
- ad hoc viewport screenshots under `public/screenshots/current/*x*.png`
- `public/screenshots/current/nav-glass-check/`

The original reference videos and images outside `public/` remain outside the shipped app.

## Deferred Cleanup

- `src/lib/site-data.ts` still contains fallback content. Keep it so the public site does not white-screen when OSS is unavailable.
- `scripts/capture-screenshots.mjs` writes to `public/screenshots/current`; keep the script because it is useful for visual checks, but do not commit ad hoc screenshots unless they are intentional baselines.
