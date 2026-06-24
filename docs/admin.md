# Admin

The protected admin console is available at `/admin`.

## Runtime model

Admin requires a server runtime because it uses HttpOnly cookies, API routes, Notion writes and Aliyun OSS uploads. The default `next build` now targets server output.

For a pure static front-end export, run:

```bash
NEXT_OUTPUT_MODE=export npm run build
```

Static export mode is not compatible with `/admin` API features.

## Authentication

Set these server-only variables:

```env
ADMIN_PASSWORD_HASH=
ADMIN_SESSION_SECRET=
```

Generate a bcrypt password hash locally:

```bash
npm run admin:hash -- "A-Strong-Password-123!"
```

Password rules enforced by the helper:

- At least 12 characters.
- Uppercase and lowercase letters.
- Number and special character.
- No common password words such as `password`, `admin123` or `123456`.

Sessions are signed with `ADMIN_SESSION_SECRET`, stored in an HttpOnly cookie, and expire after 8 hours. Mutating admin API calls require both the session cookie and an `x-admin-csrf` header generated from the session.

Production cookies are `Secure` by default. For a local HTTP production preview only, set:

```env
ADMIN_COOKIE_SECURE=false
```

## Content source

The admin supports two modes:

```env
ADMIN_CONTENT_SOURCE=local
```

Local mode stores editable development data in `.admin/admin-content.json`. That folder is ignored by Git.

```env
ADMIN_CONTENT_SOURCE=notion
```

Notion mode reads and writes each configured Notion database. If a collection has no database ID, it falls back to local mode for that collection.

Required server-only Notion variable:

```env
NOTION_TOKEN=
```

Database IDs are configured with the variables in `.env.example`, including:

- `NOTION_WORKS_DATABASE_ID`
- `NOTION_WORK_TYPES_DATABASE_ID`
- `NOTION_TOOLS_DATABASE_ID`
- `NOTION_PAGE_SECTIONS_DATABASE_ID`
- `NOTION_SOCIAL_LINKS_DATABASE_ID`
- `NOTION_MEDIA_ASSETS_DATABASE_ID`
- `NOTION_CONTACT_MESSAGES_DATABASE_ID`

Legacy aliases such as `NOTION_PROJECTS_DATA_SOURCE_ID` are still supported.

## OSS uploads

Media uploads go through `/api/admin/media/upload` and use the Aliyun SDK server-side. The browser never receives Aliyun AccessKey secrets.

Required variables:

```env
ALIYUN_ACCESS_KEY_ID=
ALIYUN_ACCESS_KEY_SECRET=
ALIYUN_OSS_REGION=
ALIYUN_OSS_BUCKET=
ALIYUN_OSS_PUBLIC_BASE_URL=
ALIYUN_OSS_UPLOAD_PREFIX=uploads/admin
```

The API accepts common image formats, SVG, MP4/WebM and PDF. Images and documents are limited to 20 MB; videos are limited to 80 MB.

## API surface

Implemented routes:

- `POST /api/admin/login`
- `POST /api/admin/logout`
- `GET /api/admin/session`
- `GET /api/admin/dashboard`
- `GET /api/admin/:collection`
- `POST /api/admin/:collection`
- `PUT /api/admin/:collection/:id`
- `DELETE /api/admin/:collection/:id`
- `GET /api/admin/integrations/status`
- `POST /api/admin/integrations/test-notion`
- `POST /api/admin/integrations/test-oss`
- `POST /api/admin/media/upload`
- `POST /api/admin/revalidate`
- `POST /api/contact`

Supported admin collections are defined in `src/lib/admin/schema.ts`.

## Security rules

The admin must never expose:

- `ALIYUN_ACCESS_KEY_ID`
- `ALIYUN_ACCESS_KEY_SECRET`
- `ALIYUN_OSS_ACCESS_KEY_ID`
- `ALIYUN_OSS_ACCESS_KEY_SECRET`
- `NOTION_TOKEN`
- `ADMIN_PASSWORD_HASH`
- `ADMIN_SESSION_SECRET`

The Integrations page only displays masked token/key endings and database ID snippets.
