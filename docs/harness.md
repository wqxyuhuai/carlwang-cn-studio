# Harness

The root `HARNESS.md` is the canonical project validation checklist. This file keeps the original Figma and token-specific harness notes for visual regression checks.

## Figma Match Harness

- Home uses Figma background, green square mark, Bebas hero type and bottom metadata.
- Works uses large `works`, right-side spatial grid and list mode.
- About uses large `about`, image block, experience rhythm and light social links.
- Contact uses large `Contact`, email emphasis and straight-line form.
- Mobile follows the 375px preview structure and does not overflow.

## Token Harness

- No component-level random hex values.
- Colors come from Figma color tokens.
- Fonts come from local files.
- Spacing and motion come from `src/styles/design-tokens.css`.
- Radius remains `0`.

## Content Harness

- Published works require Title, Slug, Date, Category, Cover and `展示状态 = 展示`; Featured and Tools are optional display metadata.
- Draft works are hidden from public route generation.
- Notion renderer shows fallback for unsupported blocks.
- Missing or invalid OSS JSON must not white screen.

## Engineering Harness

- `npm run lint` passes.
- `npm run build` passes.
- `/api/revalidate` rejects requests without `REVALIDATE_SECRET`.
- Work view count increments do not force full public cache revalidation when D1 succeeds.
- No front-end secret variables.
- Reduced motion is respected.

## Phase 1 Screenshot Set

Run after the dev server is available:

```bash
npm run screenshots
```

- `public/screenshots/home.png`
- `public/screenshots/works.png`
- `public/screenshots/about-contact.png`
