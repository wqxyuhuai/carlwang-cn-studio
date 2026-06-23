# Harness

## Visual Harness

- Home has oversized title, staggered image stack, and structured bottom metadata.
- Featured works use varied layout, not equal-width cards only.
- Works page has large page name and right-weighted visual browsing.
- About has oversized page label, strong image block, skills, and experience interaction.
- Contact uses a large ending title and clear email emphasis.
- Favicon should be replaced with a `#B7D075` square before production.

## Interaction Harness

- First screen enters in layers.
- Work hover reveals title, year, and category.
- Grid/List toggle changes layout without full page reload.
- Theme switch applies without flashing after first load.
- Contact form includes loading, success, and error states.
- Reduced motion media query disables long motion.

## Content Harness

- Every published work has title, slug, cover, intro, year, and category.
- Detail fields can be empty without crashing.
- Images have alt text.
- Unsupported Notion blocks render fallbacks.
- OSS read failure falls back to local content.

## Engineering Harness

- `npm run lint` passes.
- `npm run build` passes.
- `/admin` is noindexed and not linked from public navigation.
- Secrets are represented only in `.env.example` placeholders.
- Components use shared CSS tokens.
- Mobile layouts do not overflow.

## Accessibility Harness

- Form controls have labels.
- Focus states are visible.
- Buttons have readable contrast.
- Links and buttons are keyboard reachable.
- Status is not communicated only by color in production sync UI.
