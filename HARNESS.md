# Project Harness

Use this checklist before publishing and after changes touching visual layout, public data access, Notion sync scripts, OSS assets, metrics or cache behavior.

## Local Run

```bash
npm install
npm run dev
npm run lint
npm run typecheck
npm run build
npm run check
```

Notes:

- `npm run check` runs lint, TypeScript and production build.
- `npm run format` uses ESLint auto-fix. Review the diff after running it.
- Public content comes from OSS and cached server data, so validate with real `NEXT_PUBLIC_CONTENT_URL` when possible.
- `/api/revalidate` requires `REVALIDATE_SECRET` and replaces the removed admin revalidation route.

## Required Public Checks

Every modification should verify:

1. Homepage `/` opens normally.
2. Works page `/works` opens normally.
3. Work detail page such as `/works/studio-web-system` opens normally.
4. About page `/about` opens normally.
5. Contact and footer links are clickable.
6. Works filtering and grid/list mode switching work.
7. Detail close button and Escape return to the exact source page, including Grid, List and Featured entry points on desktop and mobile; Grid/List also restore the exact nested list or mobile Index panel scroll position instead of returning to the top.
8. Detail previous/next links preserve the original return page.
9. Returning from a detail page skips the Index category/card staggered entry sequence and uses only the short whole-page fade; the staggered entry sequence still plays on the first Index visit.
10. Text selection is white background with black text.
11. Browser console has no obvious runtime errors.
12. TypeScript has no errors.
13. Production build passes.

## Performance Checks

Before release, verify:

1. Opening a work detail page does not trigger repeated `site-content.json` refetches on every navigation.
2. Work detail body JSON loaded through `contentUrl` is cached and reused.
3. Closing a detail page returns to the works list without a noticeable cold navigation pause.
4. Work grid/list links do not prefetch every detail route at once; hover/focus prefetches the intended desktop route and coarse-pointer devices prefetch only the pressed target.
5. `/api/works/[slug]/view` increments the displayed count but does not invalidate the full public content cache on every D1-backed view.
6. Multimedia requests use browser/server cache headers where supported and do not reload unchanged OSS assets unnecessarily.
7. Featured canvas first entry settles in about two seconds, warm Featured visits do not replay it, and desktop animation remains smooth without rendering the full 27-chunk cube.
8. Featured canvas images use intent prefetch and transition to full source-image brightness on hover without triggering React state updates on pointer movement.

## Content Checks

Before release, verify the real content path:

1. `npm run content:sync-all` can sync Notion assets to OSS.
2. `npm run content:publish` writes the public OSS index JSON.
3. Public Home, Works, Work Detail, About and Footer render OSS data with fallback content if the OSS read fails.
4. Published works require Title, Slug, Date, Category, Cover and published display status in Notion.
5. Draft or hidden works are excluded from public route generation.
6. Tool icons and social links tolerate missing optional assets.
7. Unsupported Notion page-body blocks are skipped safely.
8. `/api/revalidate` refreshes public caches when called with the revalidation secret.
9. Published dates render as Today, Yesterday, days, months or years according to elapsed UTC calendar days.

## Visual Protection

Do not casually change:

1. Homepage layout, intro direction, gradient background and motion layer.
2. Featured Works card ratio, hover logic and horizontal scroll rhythm.
3. About page structure, direction list, experience rhythm and contact composition.
4. Current font, color token, spacing and square-radius systems.
5. Figma typography mapping in `AGENTS.md` and `docs/design-tokens.md`.

## Data Protection

1. Do not delete real Notion data.
2. Do not delete OSS files if any record or page still references them.
3. Notion tokens and Aliyun secrets must never appear in front-end code.
4. `.env`, `.env.local` and real secret values must never be committed.
5. Contact submissions must not be logged raw or exposed through public JSON.

## Manual QA Checklist

Check these after each stage:

- Desktop width around 1440px.
- Laptop width around 1280px.
- Tablet width.
- Mobile width.
- Text readability on dark backgrounds.
- Images do not distort.
- Links are clickable and not covered by pinned motion layers.
- Responsive widths: 1440, 1280, 1024, 768, 430 and 390 px.
- Keyboard focus, reduced motion behavior and no obvious console errors.
- Warm Featured/Index switches reuse the mounted Featured canvas without showing the first-load screen again.
- Featured canvas cards stay crisp at desktop DPR, visibly respond to hover and remain clickable while auto flight is running or paused.
- The Featured auto-flight control sits beside the bottom navigation on desktop and above it on narrow mobile screens without overlap.

## Route Checklist

Public:

- `/`
- `/works`
- `/works/studio-web-system`
- `/about`

API:

- `/api/contact`
- `/api/works/[slug]/view`
- `/api/revalidate`

## Rollback Note

A backup branch should be created before large cleanup or performance work. If a change visibly breaks the approved public pages, revert the most recent relevant edit first instead of stacking unrelated fixes on top of a broken baseline.
