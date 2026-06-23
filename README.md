# Carl Wang Studio

Next.js implementation for `studio.carlwang.cn`, based on the Notion execution document for Carl Wang Studio.

## Local Development

```bash
npm install
npm run dev
```

Open `http://localhost:3000`.

## Commands

```bash
npm run lint
npm run build
npm run check
```

## Environment

Copy `.env.example` to `.env.local` and fill server-only secrets locally or in the deployment platform. Do not expose Aliyun OSS keys, Notion tokens, or admin secrets in client code.

The public site currently reads `NEXT_PUBLIC_CONTENT_URL` and falls back to local mock data when the OSS JSON fails or does not match the expected schema.

## Routes

- `/`: Home with hero, featured works, work fields, about preview, and contact CTA.
- `/works`: Works index with Year and Category filters plus Grid/List toggle.
- `/works/[slug]`: Work detail with gallery, metadata, Notion block rendering, and previous/next navigation.
- `/about`: About, skills, experience, and `#contact` form.
- `/admin`: Hidden admin console prototype. It is not linked from public nav and is blocked in `robots.ts`.

## Project Structure

- `src/lib/site-data.ts`: OSS read path, fallback content, content guards.
- `src/lib/types.ts`: Work, media, Notion block, profile, and settings types.
- `src/lib/notion-renderer.tsx`: V1 renderer for supported Notion-like blocks.
- `src/components`: Shared public and admin-facing components.
- `docs`: Architecture, design system, sync, renderer, harness, and open questions.

## Production Notes

Before production, add real authentication to `/admin`, connect server-side sync actions, and replace demo contact handling with a server action or API route.
