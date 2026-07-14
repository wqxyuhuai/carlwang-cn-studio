# AGENTS.md

## Project Goal

Carl Wang Studio is a personal portfolio and lightweight public content platform for `studio.carlwang.cn`. Preserve the approved static visual system while reading real published data from Aliyun OSS and Notion-derived publishing scripts. The in-site `/admin` console has been removed.

## Page Structure

- `/` renders the homepage hero, featured work strip, about copy, works browser and footer/contact navigation.
- `/works` renders the works browser.
- `/works/[slug]` renders a work detail page from the shared public data layer.
- `/about` renders the About, direction, experience, contact and social sections.
- `/api/contact` receives public contact submissions and validates them without storing raw messages in an admin store.
- `/api/works/[slug]/view` increments real work view counts through D1 with OSS fallback.
- `/api/revalidate` refreshes cached public content when called with `REVALIDATE_SECRET`.

## Frontend Rules

- Do not rewrite the approved homepage background, featured work card sizing, hover behavior, About page structure or footer rhythm without explicit direction.
- Public pages should read display data through `src/lib/public-content.ts` or a shared data-layer replacement. Do not scatter long-lived content constants across pages.
- Keep user-facing animation isolated in client leaf components, currently under `src/components/home`, `src/components/about` and `src/components/works`.
- Preserve reduced-motion fallbacks and avoid adding scroll or pointer listeners without cleanup.
- Images used by public components must live under `public/` or come from the public content JSON / OSS URL.
- Work detail exits are contextual: every public entry point to `/works/[slug]` must carry the current page URL in a `from` query parameter and mirror it into `cw-work-return-href`. The close button or Escape key must read `from` first, then stored state, and return to that source page instead of hard-coding Featured or `/#works`. Detail-to-detail pager links must preserve the original source page.
- Works Index uses `#works-index` and `view=grid|list`; retain legacy `#works-list` only as a normalized compatibility input. Returning to Index must preserve its filter, view mode, and scroll position.
- Works Index and work detail pages share the standard back-to-top control. The Index instance must appear only in Index, never Featured; it must scroll the correct page or nested panel, stay above bottom blur/navigation, reuse the bottom-navigation liquid-glass material, adapt its glyph and hover contrast to the backdrop, and preserve its fade/reduced-motion behavior.
- On touch or coarse-pointer devices, work grid cards must open on the first tap without a flip or hover-delay state. Keep mobile mask, pause control, and bottom navigation clear of each other.
- Fullscreen project video has distinct hit zones: clicking inside the rendered video toggles play/pause; moving over the backdrop outside the video shows `Close`, and clicking that backdrop closes only the fullscreen player. Playback controls are excluded from the close zone and must keep their existing behavior.
- User-initiated fullscreen video opens with sound enabled. The mute button must reflect the media element's actual `muted` state, including asynchronous `volumechange` updates, rather than an assumed initial state.
- A video scrub timeline must show real distributed video frames or correctly cropped sprite frames. A poster may be used only as a temporary fallback while frames load; do not repeat one poster as the finished timeline. Generate thumbnails only while the fullscreen player is active.
- Inline project-video hover must ease into and out of its brightness/scale treatment. The Play affordance rests at the lower-left, follows the pointer with a soft inertial response, and eases back to rest after pointer leave; do not snap it on entry or exit. Preserve the reduced-motion fallback.
- Keep ordinary work-detail body media unframed. Do not add a universal border around Notion media cards; when an individual dark or low-contrast asset cannot be distinguished from the page background, use only a localized, very subtle inner outline without changing the shared media rhythm.
- The featured star is an unframed icon in the upper-right of a work card. Do not reintroduce a glass, border, shadow, or background container behind it.
- Do not enable default viewport prefetch for every work card if it causes many detail pages to load at once. Prefer intent-based hover/focus prefetch.

## Data And Cache Rules

- `src/lib/public-content.ts` is the public aggregation layer and owns the published works, work types, tools, socials and experience data consumed by pages.
- `src/lib/site-data.ts` reads the public OSS index JSON and per-project `contentUrl` JSON. Keep per-project content fetches cacheable unless a task explicitly needs uncached debugging.
- Cache only successfully fetched, valid per-project content JSON. A transient OSS error must not be converted into a long-lived cached `null` or empty body; failed reads should remain observable, safely fall back for that request, and be retried on a later request. When cache semantics change, invalidate or version the affected cache entries.
- `src/lib/cache-tags.ts` owns cache tag constants. Public data revalidation should use `PUBLIC_CONTENT_CACHE_TAG`.
- `src/lib/work-view-counts.ts` owns D1-backed work metrics. Do not invalidate the full public content cache for every successful D1 view increment.
- `src/lib/oss.ts` contains minimal server-side OSS helpers used by public runtime fallbacks. Browser code must never receive Aliyun credentials.
- `/api/revalidate` is secret-only and replaces the removed admin revalidation endpoint.
- The OSS folder name `uploads/admin/...` is retained for compatibility with already published assets and JSON. Do not rename the remote path casually.

## Content Publishing Rules

- Notion is the editorial source, but public pages do not query Notion directly from client components.
- Use `npm run content:sync-all` or the narrower `content:sync-*` scripts to sync Notion assets to OSS.
- Use `npm run content:publish` after sync to write the public index JSON.
- Project sync generates and persists selected video posters. Use `npm run content:update-all` for a complete refresh or `npm run content:update-projects` for project-only updates; do not use the first video frame as a public preview when a generated poster is available.
- Use `/api/revalidate` with `REVALIDATE_SECRET` after publishing when immediate cache refresh is needed.
- Keep Notion and OSS scripts server/local only. Do not move tokens, AccessKeys or publishing operations into client components.

## Component Naming

- Page-specific interactive components belong in `src/components/home`, `src/components/about` or `src/components/works`.
- Shared site components remain in `src/components` until there is enough duplication to justify `components/site` or `components/common`.
- Use PascalCase for React components and kebab-case for route or asset folders.

## Style And Token Rules

- Global CSS lives in `src/app/globals.css`; design tokens live in `src/styles/design-tokens.css`.
- Prefer existing CSS variables for color, type, spacing, motion and radius.
- Do not introduce random component-level hex values for public pages unless they become named tokens.
- The current radius system is intentionally square or near-square. Do not add rounded card systems to public pages casually.
- Keep the local Bebas Neue and SF Pro font stack intact.
- Keep fullscreen video inset and visibly rounded; its controls must not overlap the frame. Close and Escape return to the current detail page, not the works browser.
- Detail Notion media layouts use a single horizontal/vertical media gap token. Preserve authored spacer blocks and body-copy spacing when adjusting it.

## Typography Rules

Use the Figma `PW2 design` text styles as the source of truth. Do not add new public-page font families or ad hoc font-size/line-height pairs unless Figma is updated first.

- `正文 r`: SF Pro Display Regular, 16px, 125%, 0 tracking. Use for body copy, footer links/copy, meta copy that is not explicitly small, form text and ordinary UI text. CSS source: `--type-body-r-*`; utility class: `.body-copy` or `.caption-copy`.
- `正文 m`: SF Pro Display Medium, 16px, 125%, 0 tracking. Use for navigation, footer group headings, medium UI labels and text links that need emphasis. CSS source: `--type-body-m-*`; apply explicitly in component CSS.
- `小字`: SF Pro Regular, 12px, 22px, 0 tracking. Use only for compact metadata, image captions, status text and dense list stats. CSS source: `--type-small-*` / `--text-caption`.
- `小标题`: SF Pro Display Medium, 36px, 145%, -0.5% tracking. Use for `Featured Works`, `About` link headings and comparable public-page link headings. CSS source: `--type-subtitle-*`.
- `标题`: SF Pro Medium, 26px, approximately 120%, -0.4px tracking. Use for work titles, detail headings and card titles. CSS source: `--type-title-*` / `--text-title`.
- `be 大标题`, `be 中标题`, `be 小标题`: Bebas Neue Bold with -0.5% tracking. Use only for hero, category, large display and section kicker typography. CSS source: `--type-display-*` plus the existing display-size tokens.

Do not repurpose `.caption-copy` for 12px text. It intentionally maps to Figma `正文 r` because footer and meta text in the design are 16px. Use `--text-caption` directly in scoped CSS for true small text.

## Visual Protection

Do not casually change:

- Homepage hero gradient, intro motion, custom cursor and work strip rhythm.
- Featured Works card proportion, hover expansion and scroll-linked horizontal movement.
- About page section order, large typography and media rhythm.
- Existing theme variables, type scale and spacing system.

## Notion And Aliyun Security

- `NOTION_TOKEN`, Aliyun AccessKey secrets and `REVALIDATE_SECRET` are server-only.
- Never expose secrets through `NEXT_PUBLIC_*`, client components, logs, serialized props or public JSON.
- `.env` and `.env.local` must not be committed.
- OSS uploads and publishing must go through server/local scripts or server-side API routes. The browser should never receive Aliyun credentials.
- Contact submissions are user data. Do not log raw name, email or message content unless the user explicitly adds a protected destination.

## Before Editing

- Run `git status -sb` and identify unrelated changes before staging or deleting anything.
- Read the relevant page, component and data-layer files before changing behavior.
- Search references with `rg` before deleting components, assets or helpers.
- Prefer narrow edits over broad rewrites. If unsure whether a file is future-facing, keep it and document it in `docs/cleanup-notes.md`.

## After Editing

- Run `npm run lint` for small code edits.
- Run `npm run check` before publishing or data-layer changes.
- Manually verify `/`, `/works`, one `/works/[slug]`, `/about`, `/api/contact`, `/api/works/[slug]/view` and `/api/revalidate` where relevant.
- Check the browser console for obvious errors.
- Confirm desktop and mobile widths still preserve the approved static visual direction.

## Deployment Rules

- The default production release path is GitHub-driven: commit the validated source and push it to `main`; `.github/workflows/deploy.yml` then builds the OpenNext bundle and deploys it to Cloudflare Workers automatically.
- Do not run `npm run deploy` as part of a normal release after pushing `main`, because that duplicates the GitHub Actions deployment.
- Use local `npm run deploy` only for an explicitly requested emergency/manual release or when GitHub Actions is unavailable. Afterward, still commit and push the exact deployed source so GitHub remains the source of truth.
- After pushing `main`, confirm that the `Deploy Cloudflare Worker` GitHub Actions run succeeds and verify the production domain. A successful Git push alone is not sufficient release verification.
