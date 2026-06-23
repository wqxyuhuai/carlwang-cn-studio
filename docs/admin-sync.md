# Admin and Sync

## Current Admin

`/admin` is a prototype control surface with:

- Works management table.
- Status counts.
- Sync status panel.
- Site settings preview.
- Empty contact messages state.

It is hidden from public navigation and blocked by `robots.ts`, but it still needs authentication before production.

## Required Production Actions

- Add session protection using `ADMIN_SESSION_SECRET`.
- Move all write actions to server actions or API routes.
- Keep Aliyun and Notion secrets server-only.
- Add manual single-work sync and full sync.
- Add Preview, Publish, Unpublish, Archive, and Rollback actions.
- Write sync errors back to Admin and optionally Notion.

## Recommended OSS Paths

```plain text
/studio-carlwang/assets/works/{slug}/{hash}.webp
/studio-carlwang/assets/works/{slug}/{hash}.mp4
/studio-carlwang/preview/works/{slug}.json
/studio-carlwang/public/works/{slug}.json
/studio-carlwang/public/works/index.json
/studio-carlwang/public/config/site.json
```

## Sync Safety

- Publish never overwrites the last known good public JSON until preview validation succeeds.
- Sync failure must not affect currently published works.
- Store rollback snapshots or versioned JSON paths.
- Do not expose AccessKey ID or Secret in browser bundles.
