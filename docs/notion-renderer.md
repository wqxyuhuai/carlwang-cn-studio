# Notion Renderer

## Location

Renderer: `src/lib/notion-renderer.tsx`

Types: `src/lib/types.ts`

## V1 Supported Blocks

- Paragraph.
- Heading 1, Heading 2, Heading 3.
- Bulleted list and numbered list.
- Quote and callout.
- Divider.
- Image and video.
- Bookmark.
- Inline links.
- Bold, italic, code, underline, strikethrough.
- Text color and background color.
- Column list and columns.
- Toggle.
- Unsupported block fallback.

## Rendering Rules

- Column lists become CSS grid on desktop and stacked content on mobile.
- Images use OSS or local static URLs, not Notion temporary URLs.
- Captions are preserved.
- External links open in a new tab with `rel="noreferrer"`.
- Unsupported blocks render a visible fallback rather than crashing the page.

## Next Work

- Add a Notion API normalizer that converts official Notion block payloads into the local `NotionBlock` schema.
- Add unsupported block reporting in Admin sync status.
- Add asset normalization for width, height, blur placeholder, poster, and thumbnails.
