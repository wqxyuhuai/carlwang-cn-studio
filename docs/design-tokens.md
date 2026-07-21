# Design Tokens

Tokens live in `src/styles/design-tokens.css`.

## Colors

Raw Figma tokens:

```css
--figma-white: #fff;
--figma-black: #000;
--figma-black-60: rgb(0 0 0 / 60%);
--figma-black-40: rgb(0 0 0 / 40%);
--figma-black-20: rgb(0 0 0 / 20%);
--figma-bg: #f2f3f0;
--figma-green: #b7d075;
--figma-hero-green-deep: rgb(39 76 38);
--figma-hero-green-mid: rgb(171 197 64);
--figma-hero-green-soft: rgb(211 223 164);
```

Components must use semantic tokens like `--color-bg`, `--color-green`, `--color-black-40`. Do not add component-level random colors.

The Home hero gradient is also tokenized as `--gradient-home-hero`. Its three green stops were measured from the Figma hero fill and should be replaced with canonical exported Figma variables if the design file later exposes named gradient styles.

## Typography

- Display: `Bebas Neue Local`
- Body and UI: `PingFang SC Web`

PingFang SC Web is split into Latin and CJK WOFF2 subsets for Regular, Medium and Semibold. Do not add another body/UI family; use the existing semantic type tokens.

Figma text-style mapping:

```css
/* 正文 r */
--type-body-r-family: var(--font-body);
--type-body-r-size: 1rem;
--type-body-r-weight: 400;
--type-body-r-line: 1.25;
--type-body-r-tracking: 0;

/* 正文 m */
--type-body-m-family: var(--font-body);
--type-body-m-size: 1rem;
--type-body-m-weight: 510;
--type-body-m-line: 1.25;
--type-body-m-tracking: 0;

/* 小字 */
--type-small-family: var(--font-body);
--type-small-size: 0.75rem;
--type-small-weight: 400;
--type-small-line: 1.8333;
--type-small-tracking: 0;

/* 标题 */
--type-title-family: var(--font-body);
--type-title-size: 1.625rem;
--type-title-weight: 510;
--type-title-line: 1.2;
--type-title-tracking: -0.025rem;

/* Compact list/detail title */
--type-title-s-tracking: -0.005em;

/* Work-detail Notion copy and headings */
--type-detail-copy-tracking: -0.01em;

/* 小标题 */
--type-subtitle-family: var(--font-body);
--type-subtitle-size: clamp(1.125rem, 2.8125vw, 2.25rem);
--type-subtitle-weight: 510;
--type-subtitle-line: 1.45;
--type-subtitle-tracking: -0.005em;

/* be display styles */
--type-display-family: var(--font-display);
--type-display-weight: 700;
--type-display-line: 1;
--type-display-tracking: -0.005em;
```

Usage constraints:

- Works empty-search text and work-detail `Previous` / `Next` pager labels
  use the regular body UI token (`16px`, `font-weight: 400`).
- The Works mode switch and bottom primary navigation labels use the medium
  body UI token (`16px`, `font-weight: 510`) and should stay visually matched.

- Body copy, footer copy, footer links and ordinary UI text use `正文 r` through `.body-copy` or `.caption-copy`.
- Navigation, footer group titles and emphasized UI labels use `正文 m`.
- Compact metadata, admin helper text, image captions and dense stats use `小字` through scoped CSS with `--text-caption` / `--type-small-*`.
- Public link headings such as `Featured Works` and `About` use `小标题`.
- Work titles and detail titles use `标题`.
- Hero, section kicker and works category display text use the Bebas Neue display tokens.
- Do not create one-off `font-size`, `line-height` or `letter-spacing` values for public pages when one of the mapped Figma styles applies.
- Do not treat `.caption-copy` as small text. In this project it maps to Figma `正文 r` because footer and body-adjacent text are 16px in the design.

## Spacing and Motion

Spacing tokens are named `--space-*`. Motion tokens are:

```css
--motion-fast: 120ms;
--motion-base: 240ms;
--motion-slow: 480ms;
--motion-page: 720ms;
--ease-out: cubic-bezier(0.22, 1, 0.36, 1);
--ease-in-out: cubic-bezier(0.65, 0, 0.35, 1);
```

All animations must respect `prefers-reduced-motion`.
