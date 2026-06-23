# Design System

## Design Read

Creative studio portfolio for design-conscious clients, with a premium editorial and visual-systems language. Dial values: variance 8, motion 6, density 4.

## Tokens

Tokens are defined in `src/app/globals.css`.

- Accent: `#B7D075`.
- Radius: `0px` for the straight-edge visual language.
- Display type: system display stack with condensed uppercase treatment.
- Body type: system sans stack for Chinese and English readability.
- Motion: `120ms`, `240ms`, `480ms`, `720ms` using cubic easing tokens.

## Theme

The site supports light and dark themes through `data-theme` on `<html>`. A small inline script applies stored theme before paint to avoid visible flashing.

## Components

- Buttons use `.btn` and `.btn-primary`.
- Surfaces use `.surface`.
- Section titles use `.section-title`.
- Oversized page labels use `.display-type`.
- All interactive components need hover, active, focus, disabled or loading states when applicable.

## Constraints

- One accent color across the site.
- No independent Contact page.
- No public Admin nav link.
- Avoid rounded card language.
- Avoid field-level hardcoded random colors or font sizes.
- Use reference images from `public/reference` until final media is synced from OSS.
