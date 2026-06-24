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
- Body and UI: `SF Pro Local`

Current SF Pro source is SF Pro Display. The `--font-body` token is intentionally stable so SF Pro Text can replace it later without page rewrites.

Measured type scale tokens:

```css
--text-body-r: 1rem;
--text-body-m: 1rem;
--text-title: 1.625rem;
--text-subtitle: clamp(1.125rem, 2.8125vw, 2.25rem);
--text-display-hero: clamp(3.75rem, 7.8125vw, 6.25rem);
--text-display-field: clamp(2.5rem, 6.25vw, 6.25rem);
--text-display-category: clamp(1.25rem, 3.125vw, 2.5rem);
--text-display-works-year: clamp(3.125rem, 7.8125vw, 6.25rem);
--text-footer-logo: clamp(1.875rem, 4.6875vw, 3.75rem);
```

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
