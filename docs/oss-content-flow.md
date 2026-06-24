# OSS Content Flow

## Phase 1

The static front end reads the temporary public JSON:

```ts
https://carlwang-cn.oss-cn-shanghai.aliyuncs.com/uploads/site-content.json
```

If that JSON fails or does not match the PW2 shape, the front end falls back to local reference data.

## Production Flow

```plain text
Notion databases and page bodies
  -> server-side sync service
  -> download Notion media
  -> upload images and videos to Aliyun OSS
  -> write preview JSON
  -> validate
  -> publish public JSON
  -> static front end reads public JSON
```

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
