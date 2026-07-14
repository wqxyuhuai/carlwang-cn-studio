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
- Public cards remain square or near-square. Fullscreen media and lightboxes use the shared `--radius-fullscreen-media` token instead of an ad hoc radius.

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
- Warm Featured/Index switches and detail returns do not replay first-load or Index staggered-entry animations.
- One Featured wheel step moves immediately and continues with a short decaying inertial tail; it does not pass through a second target-velocity smoothing layer.
- Featured/Index switches and detail-close returns do not play two work-view/loader opacity transitions or show two consecutive black states.
- At `390 x 844` and `430 x 932`, Featured keeps visible whitespace and shows several distinct project covers rather than repeating one cover across the viewport.
- Featured canvas media limits remain independent from detail-route prefetch limits; Index nested scrolling uses passive, frame-coalesced forwarding.
- Detail image lightbox closes by backdrop click or Escape; fullscreen video starts with sound after deliberate activation.

## Phase 1 Screenshot Set

Run after the dev server is available:

```bash
npm run screenshots
```

- `public/screenshots/home.png`
- `public/screenshots/works.png`
- `public/screenshots/about-contact.png`
