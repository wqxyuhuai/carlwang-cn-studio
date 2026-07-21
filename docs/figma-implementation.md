# Figma Implementation

## Source of Truth

- Figma design: `https://www.figma.com/site/a9YgWrt2FRnQmRwLgNSUlh/PW2?node-id=0-1`
- Figma design copy for exact inspection: `https://www.figma.com/design/uyOyzfn6TUfKS0CleLinhG/PW2-design?node-id=0-1`
- Figma preview: `https://sport-sale-19959896.figma.site/`

Figma is the only visual source of truth. Old code and older Notion sections are secondary.

## Current Read

The copied design file exposes three Home breakpoints:

- Mobile: `375 x 3703`
- Desktop: `1280 x 3750`
- Wide desktop: `1920 x 3866`

Key measured values from `PW2-design`:

- Header: desktop `82px`, mobile `116px`.
- Page horizontal padding: desktop `64px`, mobile `32px`.
- Navigation: `16px` PingFang SC Medium implementation override, desktop gap `32px`, mobile vertical gap `4px`.
- Home hero: desktop content frame `998px`, mobile hero `912px`.
- Hero display text: Bebas Neue Bold, desktop `100px`, mobile `60px`.
- Section titles: PingFang SC Medium implementation override, desktop `36px`, mobile `18px`.
- Field labels: Bebas Neue Bold, desktop `100px` wide / `80px` 1280 / `40px` mobile.
- Works grid entry: desktop two columns with `50px` gap, right mosaic four columns with `20px` gap.

The preview exposes the active page `/`, with Figma preview links `/works-grid` and `/works-grid-2`. In production these are mapped to:

- `/works`
- `/works/[slug]`
- `/about`
- `/about#contact`

## Phase 1 Visual Targets

- Hard square mark in Figma green.
- Pale `bg` background.
- Bebas Neue display type for large English labels.
- PingFang SC Web for UI and body text, replacing the original SF Pro mapping while retaining the measured sizes and hierarchy.
- No dark theme toggle.
- No rounded-card portfolio template.
- Image rhythm based on square work thumbnails, long white space and oversized page labels.

## Known Gap

Paint and text styles were read from visible node metadata, while named Figma local style collections were empty in the inspected file. When the final editable design exports canonical style names, update `src/styles/design-tokens.css` without changing component code.
