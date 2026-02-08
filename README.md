# Blog Engine

A monorepo blog platform that uses Notion as the CMS, Bun + Hono as API, SQLite for local persistence, and Next.js for SSR frontend rendering.

## Stack
- `@blog-engine/api`: Bun runtime, Hono, Notion sync, SQLite
- `@blog-engine/web`: Next.js App Router frontend
- `@blog-engine/shared`: shared types/config/validators

## Quick Start
1. Install dependencies:
```bash
pnpm install
```
2. Create environment file:
```bash
cp .env.example .env
```
3. Set your Notion API key in `.env`:
- `NOTION_API_KEY`

4. Create Notion database from a parent page:
```bash
pnpm --filter @blog-engine/api run setup -- --page-id=<your-notion-page-id>
```
- Copy returned value to `NOTION_DATABASE_ID` in `.env`

5. Run API and web:
```bash
pnpm dev
```

## Set Up Notion Integration
1. Create a Notion internal integration from the Notion developer dashboard.
2. Copy the integration secret and set it as `NOTION_API_KEY` in your `.env`.
3. In Notion, open the parent page (or database) you want to use and share it with your integration.
4. Run setup to create the blog database under that page:
```bash
pnpm --filter @blog-engine/api run setup -- --page-id=<your-notion-page-id>
```
5. Copy the returned database id into `.env` as `NOTION_DATABASE_ID`.

Official Notion docs:
- https://developers.notion.com/docs/create-a-notion-integration
- https://developers.notion.com/docs/create-a-notion-integration#give-your-integration-page-permissions

## Environment Variables
- `NOTION_API_KEY`: Notion integration key
- `NOTION_DATABASE_ID`: blog database id
- `PORT`: API port (default `3000`)
- `NEXT_PUBLIC_BLOG_ENGINE_API_URL`: web-to-api base URL (default `http://localhost:3000`)
- `DATABASE_PATH`: SQLite DB path (default `./data/blog.db`)
- `SYNC_INTERVAL`: cron for content sync (default `*/30 * * * *`)
- `IMAGE_REFRESH_INTERVAL`: cron for image refresh (default `0 * * * *`)
- `SYNC_PUBLIC_ONLY`: if `true`, skips non-public pages
- `CORS_ORIGINS`: comma-separated allowlist (e.g. `http://localhost:3001,https://example.com`)
- `API_RATE_LIMIT_ENABLED`: enable global/route rate limiting (default `true`)
- `API_RATE_LIMIT_WINDOW_MS`: limiter window in ms (default `60000`)
- `API_RATE_LIMIT_MAX`: global requests per window per IP (default `60`)
- `API_RATE_LIMIT_POSTS_MAX`: `/api/posts` requests per window per IP (default `120`)
- `API_RATE_LIMIT_CONTENT_MAX`: `/api/posts/:slug/content` requests per window per IP (default `30`)
- `API_RATE_LIMIT_SYNC_MAX`: sync route requests per window per IP (default `2`)
- `SYNC_ADMIN_API_KEY_ENABLED`: require API key for manual sync routes
- `SYNC_ADMIN_API_KEY`: key accepted via `x-api-key` or `Authorization: Bearer ...`
- `SOCIAL_LINKEDIN`, `SOCIAL_X`, `SOCIAL_INSTAGRAM`, `SOCIAL_LINKTREE`
- `SOCIAL_EMAIL`, `SOCIAL_PHONENUMBER`, `SOCIAL_FACEBOOK`, `SOCIAL_GITHUB`

## Configuration File Example
`blog-engine.config.ts` is loaded by the API at runtime and merged with env-driven overrides.

```ts
const config = {
    notion: {
        integrationKey: process.env.NOTION_API_KEY ?? 'missing',
        databaseId: process.env.NOTION_DATABASE_ID ?? 'missing',
    },
    cron: {
        syncInterval: '*/30 * * * *',
        imageRefreshInterval: '0 * * * *',
    },
    sync: {
        publicOnly: true,
    },
    database: {
        path: './data/blog.db',
    },
    server: {
        port: Number(process.env.PORT ?? 3000),
    },
    socials: {
        linkedin: process.env.SOCIAL_LINKEDIN,
        x: process.env.SOCIAL_X,
        instagram: process.env.SOCIAL_INSTAGRAM,
        linktree: process.env.SOCIAL_LINKTREE,
        email: process.env.SOCIAL_EMAIL,
        phonenumber: process.env.SOCIAL_PHONENUMBER,
        facebook: process.env.SOCIAL_FACEBOOK,
        github: process.env.SOCIAL_GITHUB,
    },
};

export default config;
```

## Rate Limiting (Open-Source Defaults)
The API applies both generic and route-specific rate limits.

- Global limiter on `/api/*`
- Higher limits on read routes (`/api/posts`)
- Tighter limits on heavy routes (`/api/posts/:slug/content`)
- Very tight limits on manual sync routes
- Additional strict protections on `/api/sync/hint` (cooldown + in-progress lock + per-IP/session windows)

### Low-Traffic Recommended `.env`
```env
# Allowed frontend origins
CORS_ORIGINS=http://localhost:3001,https://yourdomain.com

# Generic limiter
API_RATE_LIMIT_ENABLED=true
API_RATE_LIMIT_WINDOW_MS=60000
API_RATE_LIMIT_MAX=40

# Route-specific caps
API_RATE_LIMIT_POSTS_MAX=80
API_RATE_LIMIT_CONTENT_MAX=20
API_RATE_LIMIT_SYNC_MAX=2

# Protect manual sync endpoints
SYNC_ADMIN_API_KEY_ENABLED=true
SYNC_ADMIN_API_KEY=replace_with_a_long_random_secret
```

### Manual Sync with API Key
```bash
curl -X POST http://localhost:3000/api/sync \
  -H "x-api-key: <your-sync-admin-key>"
```

## API Endpoints
- `GET /api/health`
- `POST /api/sync`
- `POST /api/sync/hint` (rate-limited async sync trigger, safe for public traffic)
- `GET /api/sync/status`
- `POST /api/sync/images`
- `GET /api/posts`
- `GET /api/posts/:slug`
- `GET /api/posts/:slug/content`
- `GET /api/site` (public site settings, currently `socials`)

## Notion Database Properties
- Required:
  - `Title` (title)
  - `Slug` (rich_text)
  - `Status` (select: `draft|pending|ready`)
- Optional:
  - `Summary` (rich_text)
  - `Author` (people)
  - `Tags` (multi_select)
  - `Published` (date)
  - `Banner` (files)
  - `Featured` (checkbox)
  - `Related Posts` (relation to same database)

## Sync Behavior
- Only `status=ready` posts are exposed by API routes.
- If `SYNC_PUBLIC_ONLY=true`, private posts are skipped during sync.
- Public posts return `renderMode=recordMap`.
- Private posts return `renderMode=blocks` with block fallback payload.
- Site visits trigger a best-effort `POST /api/sync/hint` once per browser session.
- Hint endpoint protections:
  - max 1 request/min per IP
  - max 1 request/min per session id
  - max 5 requests/hour per IP
  - global cooldown and in-progress lock prevent sync stampedes
- Manual sync routes (`/api/sync`, `/api/sync/images`) can be API-key protected via env vars.

## Social Dock
- Configure `socials` in `blog-engine.config.ts` (or via the `SOCIAL_*` env vars shown above).
- Supported keys: `linkedin`, `x`, `instagram`, `linktree`/`linkedtree`, `email`, `phonenumber`, `facebook`, `github`.
- Web app renders these as a right-side collapsible dock.

## Commands
```bash
pnpm dev
pnpm build
pnpm lint
pnpm typecheck
pnpm test
```

Package-specific:
```bash
pnpm --filter @blog-engine/api dev
pnpm --filter @blog-engine/web dev
pnpm --filter @blog-engine/api run setup -- --page-id=<id>
```
