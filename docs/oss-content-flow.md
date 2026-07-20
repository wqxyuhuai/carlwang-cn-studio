# OSS Content Flow

## Phase 1

The public front end reads the normalized OSS content index:

```ts
https://carlwang-cn-studio.oss-cn-shanghai.aliyuncs.com/uploads/admin/site-content.json
```

If that JSON fails or does not match the PW2 shape, the front end falls back to local reference data.

## Production Flow

```plain text
Notion databases and page bodies
  -> server-side sync service
  -> reuse an existing OSS optimized object when available
  -> copy an existing old-path OSS object inside OSS when rehoming
  -> use local or Notion downloads only when OSS recovery is impossible
  -> publish each project body JSON before marking it 已同步
  -> publish the public index JSON
  -> public front end reads the index and resolves work bodies from contentUrl
```

The canonical priority, status, timeout, optimization and deletion rules are in
`docs/CONTENT_SYNC_RULES.md`.

## Security Rules

- Aliyun AccessKey and Secret are server-only.
- Notion token is server-only.
- Browser may only read public JSON and public media URLs.
- Upload, sync, publish and rollback must run through server or serverless routes.

## Future Paths

```plain text
/studio-carlwang/assets/works/{slug}/{hash}.webp
/studio-carlwang/assets/works/{slug}/{hash}.mp4
/studio-carlwang/data/works/index.json
/studio-carlwang/data/works/{slug}.json
/studio-carlwang/data/site.json
```
