# Architecture

## Goal

Build a static-feeling studio site with a maintainable content system:

```plain text
GitHub source
  -> Next.js app, tokens, renderer, admin shell, docs

Notion Database
  -> Works metadata and rich detail content

Sync Service
  -> Reads Notion, normalizes blocks, uploads assets to Aliyun OSS, writes JSON

Aliyun OSS
  -> Public JSON and media files consumed by the website

Static Website
  -> Reads OSS JSON with local fallback and renders pages
```

## Current Implementation

- Next.js App Router with TypeScript and Tailwind v4.
- Server components read content through `getStudioData()`.
- `NEXT_PUBLIC_CONTENT_URL` points to the temporary OSS JSON endpoint.
- If OSS fetch fails or does not match the expected shape, local fallback data keeps the site from blanking.
- `/admin` is a prototype control surface and is not linked from public navigation.

## Target Data Flow

1. Content editor updates a Notion database item and page body.
2. Admin or scheduled sync reads the row and blocks through Notion API.
3. Sync downloads Notion media, uploads optimized files to OSS, and records width, height, alt, caption, poster, and blur metadata.
4. Sync writes preview JSON first.
5. Admin validates preview and publishes public JSON.
6. Frontend revalidates and renders the published content.

## Security Boundaries

- GitHub stores code, types, docs, renderer, and scripts only.
- OSS stores public media and JSON only.
- Notion is the editorial source for rich content.
- Secrets stay in server environment variables.
- `/admin` must be protected before production.
