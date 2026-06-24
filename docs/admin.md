# Admin

Admin is deferred until the front-end visual match is approved.

## Phase 1

`/admin` is a no-index placeholder that explains the deferral. It has no public navigation link and performs no write actions.

## Future Scope

- Authentication with `ADMIN_SESSION_SECRET`.
- Works management.
- Tools management.
- Social links and contact management.
- Site settings.
- Contact message review.
- Notion sync.
- OSS read/write tests.
- Preview, publish and rollback.

## Security

The admin must never expose:

- `ALIYUN_OSS_ACCESS_KEY_ID`
- `ALIYUN_OSS_ACCESS_KEY_SECRET`
- `NOTION_TOKEN`
- Any server-only session secret

Public settings may show public OSS base URLs and published JSON paths only.
