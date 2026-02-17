# Blazion

A modular Notion-to-API-to-frontend platform. Today it ships with a `blog` pack (schema, sync rules, API contract, and frontend template) and is structured to add more packs (docs/wiki/etc.).

## Stack
- `@blazion/core-api`: Bun runtime, Hono, Notion sync, SQLite
- `@blazion/core-web`: Next.js App Router frontend
- `@blazion/shared`: shared types/config/validators + pack config contract

## Quick Start
1. Install dependencies:
```bash
pnpm install
```
2. Create environment file:
```bash
cp .env.example .env
```
3. Create app config file:
```bash
cp blazion.config.example.ts blazion.config.ts
```
4. Set your Notion API key in `.env`:
- `NOTION_API_KEY`

5. Create Notion database from a parent page:
```bash
pnpm --filter @blazion/core-api run setup -- --pack=blog --page-id=<your-notion-page-id>
```
- Blazion stores the created database id internally for the `blog` pack.

5. Start development:
```bash
pnpm dev
```

6. Optional: Enable Giscus comments
- Create/choose a GitHub repo with Discussions enabled.
- Configure at `https://giscus.app`.
- Add these values to your env:
  - `NEXT_PUBLIC_GISCUS_REPO`
  - `NEXT_PUBLIC_GISCUS_REPO_ID`
  - `NEXT_PUBLIC_GISCUS_CATEGORY`
  - `NEXT_PUBLIC_GISCUS_CATEGORY_ID`
  - `NEXT_PUBLIC_GISCUS_MAPPING=pathname`

7. Verify locally
- `http://localhost:3001` loads posts
- Open a post page, related articles render, and comments appear if Giscus is configured
- `http://localhost:3000/api/health` shows `enabledPacks` includes `blog`

## Set Up Notion Integration
1. Create a Notion internal integration from the Notion developer dashboard.
2. Copy the integration secret and set it as `NOTION_API_KEY` in your `.env`.
3. In Notion, open the parent page (or database) you want to use and share it with your integration.
4. Run setup to create the blog database under that page:
```bash
pnpm --filter @blazion/core-api run setup -- --pack=blog --page-id=<your-notion-page-id>
```
5. Setup links the created database internally. No `NOTION_DATABASE_ID` env var is needed.
6. Setup is idempotent: if a pack is already linked, it skips creating a second DB.
   - Relink to existing DB: `pnpm --filter @blazion/core-api run setup -- --pack=blog --database-id=<id>`
   - Force create a new DB: `pnpm --filter @blazion/core-api run setup -- --pack=blog --page-id=<page-id> --force-create=true`

Official Notion docs:
- https://developers.notion.com/docs/create-a-notion-integration
- https://developers.notion.com/docs/create-a-notion-integration#give-your-integration-page-permissions

## Environment Variables
- `NOTION_API_KEY`: Notion integration key
- Notion database id is managed internally per pack in local metadata after `setup`.
- `PORT`: API port (default `3000`)
- `BLAZION_API_URL` or `NEXT_PUBLIC_BLAZION_API_URL`: web-to-api base URL
  - development default: `http://localhost:3000`
  - production: must be explicitly set
- `BLAZION_API_URL` or `NEXT_PUBLIC_BLAZION_API_URL`: API base URL aliases
- `NEXT_PUBLIC_GISCUS_REPO`: GitHub repo in `owner/name` format for Giscus discussions
- `NEXT_PUBLIC_GISCUS_REPO_ID`: repository id from giscus.app setup
- `NEXT_PUBLIC_GISCUS_CATEGORY`: discussion category name from giscus.app setup
- `NEXT_PUBLIC_GISCUS_CATEGORY_ID`: category id from giscus.app setup
- `NEXT_PUBLIC_GISCUS_MAPPING`: mapping strategy (default `pathname`)
- `DATABASE_PATH`: SQLite DB path (default `./data/blog.db`)
- `SYNC_HINT_ENABLED`: enable public `/api/sync/hint` endpoint (default `true` in non-production, `false` in production)
- `IMAGE_URL_REFRESH_BUFFER_SECONDS`: proactive buffer before signed image URL expiry (default `300`)
- `IMAGE_URL_REFRESH_COOLDOWN_SECONDS`: minimum gap between request-triggered image refresh runs (default `60`)
- `RECOMMENDATION_DEFAULT_LIMIT`: default recommendation count per post (default `3`)
- `RECOMMENDATION_MAX_LIMIT`: max `limit` accepted by recommendations endpoint (default `6`)
- `RECOMMENDATION_WEIGHT_RELATED`: score boost for manual related-post relation match (default `100`)
- `RECOMMENDATION_WEIGHT_TAG`: score boost per shared tag (default `20`)
- `RECOMMENDATION_WEIGHT_SEGMENT`: score boost for same segment (default `12`)
- `RECOMMENDATION_WEIGHT_FEATURED`: score boost for featured posts (default `8`)
- `RECOMMENDATION_WEIGHT_RECENCY`: max recency bonus inside window (default `6`)
- `RECOMMENDATION_RECENCY_WINDOW_DAYS`: days window for recency bonus decay (default `30`)
- `CORS_ORIGINS`: comma-separated allowlist (e.g. `http://localhost:3001,https://example.com`)
- `API_RATE_LIMIT_ENABLED`: enable global/route rate limiting (default `true`)
- `API_RATE_LIMIT_WINDOW_MS`: limiter window in ms (default `60000`)
- `API_RATE_LIMIT_MAX`: global requests per window per IP (default `60`)
- `API_RATE_LIMIT_POSTS_MAX`: `/api/blog/posts` requests per window per IP (default `120`)
- `API_RATE_LIMIT_CONTENT_MAX`: `/api/blog/posts/:slug/content` requests per window per IP (default `30`)
- `API_RATE_LIMIT_SYNC_MAX`: sync route requests per window per IP (default `2`)
- `SYNC_ADMIN_API_KEY_ENABLED`: require API key for manual sync routes (defaults to `true` in production, `false` otherwise)
- `SYNC_ADMIN_API_KEY`: key accepted via `x-api-key` or `Authorization: Bearer ...`
- `NEXT_PUBLIC_SYNC_HINT_ENABLED`: frontend opt-in for sending sync hints (default `true` in non-production, `false` in production)
- `SOCIAL_LINKEDIN`, `SOCIAL_X`, `SOCIAL_INSTAGRAM`, `SOCIAL_LINKTREE`
- `SOCIAL_EMAIL`, `SOCIAL_PHONENUMBER`, `SOCIAL_FACEBOOK`, `SOCIAL_GITHUB`

## Configuration File Example
`blazion.config.ts` is the source of truth for app behavior (packs, sync behavior, cron cadence, socials, share providers, site text).
Environment variables are used for secrets and deployment/infrastructure values.

```ts
const config = {
    notion: {
        integrationKey: process.env.NOTION_API_KEY ?? 'missing',
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
    share: {
        providers: ['x', 'whatsapp', 'facebook', 'linkedin'],
    },
    packs: [
        {
            name: 'blog',
            enabled: true,
        },
    ],
};

export default config;
```

## Rate Limiting (Open-Source Defaults)
The API applies both generic and route-specific rate limits.

- Global limiter on `/api/*`
- Higher limits on read routes (`/api/blog/posts`)
- Tighter limits on heavy routes (`/api/blog/posts/:slug/content`)
- Very tight limits on manual sync routes
- Additional strict protections on `/api/sync/hint` (cooldown + in-progress lock + per-IP/session windows) when enabled

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

# Disable public sync hints in production
SYNC_HINT_ENABLED=false
NEXT_PUBLIC_SYNC_HINT_ENABLED=false
```

### Manual Sync with API Key
```bash
curl -X POST http://localhost:3000/api/sync \
  -H "x-api-key: <your-sync-admin-key>"
```

## API Endpoints
- `GET /api/health`
- `POST /api/sync` (`?pack=blog` optional)
- `POST /api/sync/hint` (rate-limited async sync trigger, disabled by default in production)
- `GET /api/sync/status`
- `POST /api/sync/images` (`?pack=blog` optional)
- `GET /api/blog/posts` (pack namespace route)
- `GET /api/blog/posts/:slug`
- `GET /api/blog/posts/:slug/recommendations?limit=3`
- `GET /api/blog/posts/:slug/content`
- `GET /api/site` (public site settings, currently `socials`, `share`, `site`)

## Pack Architecture
- Core runtime reads enabled packs from `blazion.config.ts` (`packs`).
- Each pack owns:
  - Notion schema assumptions + validation
  - sync mapping rules
  - API route contract (namespaced under `/api/<pack>/*`)
  - frontend template compatibility contract
- Current built-in pack:
  - `blog`

## Installation Model
- Contributor mode (this monorepo): contains core + all packs.
- Product-user mode (recommended): should install only required packs via starter/preset CLI workflow.
- Short-term (current repo state): enable only needed packs via `packs` in `blazion.config.ts`.
- Long-term: packs publish independently (for example `@blazion/pack-blog`) with compatible core version ranges.

## Notion Database Properties
- Required:
  - `Title` (title)
  - `Slug` (rich_text)
  - `Status` (select: `draft|pending|ready`)
- Optional:
  - `Summary` (rich_text)
  - `Author` (people)
  - `Tags` (multi_select)
  - `Segment` (select or rich_text)
  - `Published` (date)
  - `Banner` (files)
  - `Featured` (checkbox)
  - `Related Posts` (relation to same database)

## Sync Behavior
- Only `status=ready` posts are exposed by API routes.
- If `sync.publicOnly=true` in `blazion.config.ts`, private posts are skipped during sync.
- Public posts return `renderMode=recordMap`.
- Private posts return `renderMode=blocks` with block fallback payload.
- Site visits trigger a best-effort `POST /api/sync/hint` once per browser session only when both:
  - backend: `SYNC_HINT_ENABLED=true`
  - frontend: `NEXT_PUBLIC_SYNC_HINT_ENABLED=true`
- Hint endpoint protections:
  - max 1 request/min per IP
  - max 1 request/min per session id
  - max 5 requests/hour per IP
  - global cooldown and in-progress lock prevent sync stampedes
- Signed Notion image URLs are proactively refreshed before expiry using `IMAGE_URL_REFRESH_BUFFER_SECONDS`.
- Manual sync routes (`/api/sync`, `/api/sync/images`) are API-key protected by default in production.

## Production Checklist
Before merging/deploying:
- Set `NEXT_PUBLIC_BLAZION_API_URL` to your production API host.
- Set `CORS_ORIGINS` to your exact frontend origin(s).
- Keep manual sync protected:
  - `SYNC_ADMIN_API_KEY_ENABLED=true`
  - strong `SYNC_ADMIN_API_KEY`
- Keep public hint sync disabled unless explicitly needed:
  - `SYNC_HINT_ENABLED=false`
  - `NEXT_PUBLIC_SYNC_HINT_ENABLED=false`
- Keep secrets out of git:
  - `.env*` ignored
  - only `.env.example` tracked

## Database Security Notes
- SQLite does not provide a built-in password mechanism in default builds.
- Blazion enforces restrictive filesystem permissions on startup for the DB directory/file where possible (`0700` for directory, `0600` for DB file).
- Keep `DATABASE_PATH` in a private server directory (for example `./data/blog.db`), never inside `public/` or build output folders.
- If you need encrypted-at-rest SQLite, use an encryption-enabled build such as SQLCipher.

## Social Dock
- Configure `socials` in `blazion.config.ts` (or via the `SOCIAL_*` env vars shown above).
- Supported keys: `linkedin`, `x`, `instagram`, `linktree`/`linkedtree`, `email`, `phonenumber`, `facebook`, `github`.
- Web app renders these as a right-side collapsible dock.

## Commands
```bash
pnpm dev
pnpm build
pnpm lint
pnpm typecheck
pnpm test
pnpm test:api
pnpm test:smoke:api
```

Package-specific:
```bash
pnpm --filter @blazion/core-api dev
pnpm --filter @blazion/core-web dev
pnpm --filter @blazion/core-api run setup -- --pack=blog --page-id=<id>
pnpm --filter @blazion/core-api test
pnpm --filter @blazion/core-api test:smoke
```

## Testing Strategy
- Unit tests:
  - shared validation/config helpers
  - pack resolution logic
- API integration/smoke tests:
  - starts real API process with isolated SQLite db seed
  - verifies pack loading (`enabledPacks`), blog namespace routes, auth behavior, sync status paths
- Keep assertions focused on contracts and invariants (status codes, required fields) to stay robust across UI/content changes.
