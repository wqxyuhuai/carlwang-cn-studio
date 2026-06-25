# Project Harness

This harness is the required self-check for every staged change. Use it before publishing and after any change touching visual layout, data access, Notion, OSS or admin routes.

## Local Run

```bash
npm install
npm run dev
npm run lint
npm run typecheck
npm run build
npm run check
npm run format
```

Notes:

- `npm run check` runs lint, TypeScript and production build.
- `npm run format` uses ESLint auto-fix. Review the diff after running it.
- Admin APIs require a server runtime. Static export mode is only for public-only previews: `npm run build:export`.
- If publishing the ignored `out/` directory, run `npm run build:export` immediately before upload so stale static files are not deployed.

## Required Checks

Every modification should verify:

1. Homepage `/` opens normally.
2. Works page `/works` opens normally.
3. Work Detail page such as `/works/studio-web-system` opens normally.
4. About page `/about` opens normally.
5. Contact and Footer links are clickable.
6. Admin login page `/admin` renders.
7. Admin Dashboard renders after login when auth is configured.
8. Admin Works management view renders after login.
9. Admin Integrations view renders after login.
10. TypeScript has no errors.
11. Browser console has no obvious runtime errors.
12. Production build passes.

## Task 03 Data Checks

Before release, verify the real content path:

1. Admin Dashboard loads from Notion when `ADMIN_CONTENT_SOURCE=notion`.
2. Studio Projects, Studio Project Categories, Studio Tools, Studio Social Links and Studio Contact Messages list without raw Notion errors.
3. Integrations shows each target Notion table, expected schema fields and OSS status.
4. Creating, editing, duplicating, publishing and archiving a Work works from admin.
5. Work publish validation blocks missing Title, Slug, Date, Category or Cover.
6. OSS upload writes File URL, Object Key, Type, Usage, Size and Uploaded At to Media Library.
7. Media delete is blocked when another record references File URL or Object Key.
8. Home, Works, Work Detail, About and Footer render dynamic data with fallback content when Notion is empty.
9. Contact Form writes to Studio Contact Messages and keeps raw fields read-only.
10. Saving content triggers revalidate feedback in admin.

## Visual Protection

Do not casually change:

1. Homepage layout, intro direction, gradient background and motion layer.
2. Featured Works card ratio, hover logic and horizontal scroll rhythm.
3. About page structure, direction list, experience rhythm and contact composition.
4. Admin dark, clear and restrained management UI.
5. Current font, color token, spacing and square-radius systems.
6. Figma typography mapping in `AGENTS.md` and `docs/design-tokens.md`: footer/body text uses `正文 r` 16/125, navigation and emphasized labels use `正文 m` 16/125, true small metadata uses `小字`, and display text uses Bebas Neue tokens.

## Data Protection

1. Do not delete real Notion data.
2. Delete should archive by default, not physically delete.
3. Contact form raw name, email and message are read-only.
4. Do not delete OSS files if any record or page still references them.
5. Notion tokens and Aliyun secrets must never appear in front-end code.
6. `.env`, `.env.local` and real secret values must never be committed.

## Manual QA Checklist

Check these after each stage:

- Desktop width around 1440px.
- Laptop width around 1280px.
- Tablet width.
- Mobile width.
- Text readability on dark backgrounds.
- Works filtering or mode switching still works.
- Images do not distort.
- Links are clickable and not covered by pinned motion layers.
- Admin save shows success or failure feedback.
- Saved content can update the public front end after revalidation or data refresh.
- Responsive widths: 1440, 1280, 1024, 768, 430 and 390 px.
- Check keyboard focus, reduced motion behavior and no obvious console errors.

## Route Checklist

Public:

- `/`
- `/works`
- `/works/studio-web-system`
- `/about`

Admin and API:

- `/admin`
- `/api/admin/session`
- `/api/admin/dashboard`
- `/api/admin/integrations/status`
- `/api/contact`

## Rollback Note

If a change visibly breaks the approved public pages or admin shell, revert the most recent relevant edit first. Do not stack new fixes on top of a broken visual baseline unless the root cause is already isolated.
