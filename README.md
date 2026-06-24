# Carl Wang Studio

PW2 rebuild for `studio.carlwang.cn`.

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

## Phase 1 Scope

- Static front end rebuilt from an empty tree.
- Local Bebas Neue and SF Pro fonts.
- Figma color, type, spacing and motion tokens.
- Home, Works, Work Detail, About and Contact.
- Public OSS JSON read with local fallback.
- Admin, Notion writes, OSS upload, preview, publish and rollback are deferred.

## Content URL

The front end reads:

```ts
const CONTENT_URL = "https://carlwang-cn.oss-cn-shanghai.aliyuncs.com/uploads/site-content.json";
```

Secrets must stay server-side. Do not expose Aliyun AccessKey, AccessKey Secret or Notion token to the browser.
