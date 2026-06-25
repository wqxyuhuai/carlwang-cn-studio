# Cleanup Notes

## Task 01 Findings

The project was scanned before cleanup. Public pages, admin routes, shared data code, Notion adapters and OSS helpers are active and should remain.

## Confirmed Active

- `src/app/page.tsx`, `src/components/home/*` and `public/field-media/*` drive the approved homepage field and Featured Works interactions.
- `src/app/about/page.tsx` and `src/components/about/direction-showcase.tsx` drive the current About page structure.
- `src/components/footer-navigation.tsx`, `src/components/site-nav.tsx`, `src/components/contact-form.tsx` and `src/components/glass-distortion-filter.tsx` are used by the app shell or public pages.
- `src/lib/site-data.ts` is the current public data layer and fallback content source.
- `src/lib/admin/*` and `src/app/api/admin/*` are future-facing integration and admin infrastructure and must not be removed during visual cleanup.
- `.env.example` contains placeholders only and documents server-only variables.

## Confirmed Unused Local Artifacts

These files were not referenced by source code and are safe to remove from the working tree:

- `package-PC-XIAOXIN.json`
- `package-lock-PC-XIAOXIN.json`
- `public/reference/`
- newly generated viewport screenshots under `public/screenshots/current/*x*.png`
- `public/screenshots/current/nav-glass-check/`

The original reference videos and images outside `public/` remain outside the shipped app.

## Deferred Cleanup

- `src/lib/site-data.ts` still contains fallback content. Keep it until the real public data adapter is fully connected and tested.
- `src/lib/admin/seed.ts` duplicates fallback content for local admin mode. Keep it until Notion mode is the default and seeded local development is no longer needed.
- `scripts/capture-screenshots.mjs` writes to `public/screenshots/current`; keep the script because it is useful for visual checks, but do not commit ad hoc screenshots unless they are intentional baselines.

