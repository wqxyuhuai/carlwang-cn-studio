# AGENTS.md

## Project Goal

Carl Wang Studio is a personal portfolio and lightweight content platform for `studio.carlwang.cn`. The current priority is to preserve the approved static visual system while connecting real data from OSS, Notion and the protected admin console in controlled stages.

## Page Structure

- `/` renders the homepage hero, featured work strip, about copy, field hover showcase and footer.
- `/works` renders the works browser.
- `/works/[slug]` renders a work detail page from the shared data layer.
- `/about` renders the About, direction, experience, contact and social sections.
- `/admin` renders the protected admin console.
- `/api/contact` receives public contact submissions.
- `/api/admin/*` contains authenticated admin read/write, integration, upload and revalidation endpoints.

## Frontend Rules

- Do not rewrite the approved homepage background, featured work card sizing, hover behavior, About page structure or footer rhythm without explicit direction.
- Public pages should read display data through `src/lib/public-content.ts` or a shared data-layer replacement. Do not scatter long-lived content constants across pages.
- Keep user-facing animation isolated in client leaf components, currently under `src/components/home` and `src/components/about`.
- Preserve reduced-motion fallbacks and avoid adding scroll or pointer listeners without cleanup.
- Images used by public components must live under `public/` or come from the public content JSON / OSS URL.
- Work detail exits are contextual: every public entry point to `/works/[slug]` must carry the current page URL in a `from` query parameter and mirror it into `cw-work-return-href`. The close button or Escape key must read `from` first, then stored state, and return to that source page instead of hard-coding Featured or `/#works`. Detail-to-detail pager links must preserve the original source page.

## Admin Rules

- `/admin` is a dark, restrained, utility-first management surface. Do not restyle it into a marketing page.
- All admin write routes must call `requireAdmin(request, { mutate: true })`.
- Login, session, CSRF and cookie handling lives in `src/lib/admin/auth.ts`.
- Admin schemas are centralized in `src/lib/admin/schema.ts`; do not create one-off admin field definitions in pages.
- Delete actions should archive records by default. Physical deletion is only acceptable for explicitly disposable media records and must be documented.

## Component Naming

- Page-specific interactive components belong in `src/components/home`, `src/components/about` or `src/components/works`.
- Shared site components remain in `src/components` until there is enough duplication to justify `components/site` or `components/common`.
- Admin components currently live inside `src/app/admin/admin-app.tsx`; split only when a clear repeated boundary appears.
- Use PascalCase for React components and kebab-case for route or asset folders.

## Style And Token Rules

- Global CSS lives in `src/app/globals.css`; design tokens live in `src/styles/design-tokens.css`.
- Prefer existing CSS variables for color, type, spacing, motion and radius.
- Do not introduce random component-level hex values for public pages unless they become named tokens.
- The current radius system is intentionally square or near-square. Do not add rounded card systems to public pages casually.
- Keep the local Bebas Neue and SF Pro font stack intact.

## Typography Rules

Use the Figma `PW2 design` text styles as the source of truth. Do not add new public-page font families or ad hoc font-size/line-height pairs unless Figma is updated first.

- `正文 r`: SF Pro Display Regular, 16px, 125%, 0 tracking. Use for body copy, footer links/copy, meta copy that is not explicitly small, form text and ordinary UI text. CSS source: `--type-body-r-*`; utility class: `.body-copy` or `.caption-copy`.
- `正文 m`: SF Pro Display Medium, 16px, 125%, 0 tracking. Use for navigation, footer group headings, medium UI labels and text links that need emphasis. CSS source: `--type-body-m-*`; apply explicitly in component CSS.
- `小字`: SF Pro Regular, 12px, 22px, 0 tracking. Use only for compact metadata, admin labels, image captions, status text and dense list stats. CSS source: `--type-small-*` / `--text-caption`.
- `小标题`: SF Pro Display Medium, 36px, 145%, -0.5% tracking. Use for `Featured Works`, `About` link headings and comparable public-page link headings. CSS source: `--type-subtitle-*`.
- `标题`: SF Pro Medium, 26px, auto/approximately 120%, -0.4px tracking. Use for work titles, detail headings and card titles. CSS source: `--type-title-*` / `--text-title`.
- `be 大标题`, `be 中标题`, `be 小标题`: Bebas Neue Bold with -0.5% tracking. Use only for hero, category, large display and section kicker typography. CSS source: `--type-display-*` plus the existing display-size tokens.

Do not repurpose `.caption-copy` for 12px text. It intentionally maps to Figma `正文 r` because footer and meta text in the design are 16px. Use `--text-caption` directly in scoped CSS for true small text.

## Visual Protection

Do not casually change:

- Homepage hero gradient, intro motion, custom cursor and work strip rhythm.
- Featured Works card proportion, hover expansion and scroll-linked horizontal movement.
- About page section order, large typography and media rhythm.
- The admin dark interface structure, table/editor layout and status tiles.
- Existing theme variables, type scale and spacing system.

## Notion And Aliyun Security

- `NOTION_TOKEN`, Aliyun AccessKey secrets, `ADMIN_PASSWORD_HASH`, `ADMIN_SESSION_SECRET` and `REVALIDATE_SECRET` are server-only.
- Never expose secrets through `NEXT_PUBLIC_*`, client components, logs, serialized props or public JSON.
- `.env` and `.env.local` must not be committed.
- OSS uploads must go through server-side API routes. The browser should never receive Aliyun credentials.
- Contact messages are user submissions; raw name, email and message should remain read-only in admin.

## Before Editing

- Run `git status -sb` and identify unrelated changes before staging or deleting anything.
- Read the relevant page, component and data-layer files before changing behavior.
- Search references with `rg` before deleting components, assets or helpers.
- Prefer narrow edits over broad rewrites. If unsure whether a file is future-facing, keep it and document it in `docs/cleanup-notes.md`.

## After Editing

- Run `npm run lint` for small code edits.
- Run `npm run check` before publishing, data-layer changes or admin changes.
- Manually verify `/`, `/works`, one `/works/[slug]`, `/about` and `/admin`.
- Check the browser console for obvious errors.
- Confirm desktop and mobile widths still preserve the approved static visual direction.
