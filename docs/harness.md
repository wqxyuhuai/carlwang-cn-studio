# Harness

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

- Published works require Title, Slug, Status, Year, Category, Featured, Order, Cover, Intro, Role and Tools.
- Draft works are hidden from public route generation.
- Notion renderer shows fallback for unsupported blocks.
- Missing or invalid OSS JSON must not white screen.

## Engineering Harness

- `npm run lint` passes.
- `npm run build` passes.
- `/admin` is blocked by robots.
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
