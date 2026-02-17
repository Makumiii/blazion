# Blazion

Blazion is a pack-based Notion publishing platform in a pnpm monorepo.

## What You Deploy Today

Deploy these two apps:
- `@blazion/core-api` (Bun + Hono + SQLite)
- `@blazion/core-web` (Next.js host)

These are loaded by core at runtime/build time:
- `@blazion/pack-blog-api`
- `@blazion/pack-blog-web`

Current production-ready pack:
- `blog`

## Architecture

```text
Notion -> core-api (+ pack-blog-api) -> core-web (+ pack-blog-web)
                    |
                  SQLite
```

Core packages are runtimes.
Pack packages are domain modules.

## Repository Layout

```text
packages/
  core-api/       # deployable API runtime
  core-web/       # deployable web runtime
  pack-blog-api/  # blog API routes + sync logic
  pack-blog-web/  # blog UI routes + components
  shared/         # shared config/types/utils
```

## Prerequisites

- Node.js `20+` (Node `22` recommended)
- pnpm `9`
- Bun (required for API scripts/tests)
- Notion integration token (`NOTION_API_KEY`)

## 1. Run Locally (End-to-End)

### Step 1: Install

```bash
git clone <your-repo-url>
cd blazion
pnpm install
```

### Step 2: Create local config files

```bash
cp .env.example .env
cp blazion.config.example.ts blazion.config.ts
```

### Step 3: Set minimum env values

Edit `.env` and set at least:

```env
NOTION_API_KEY=ntn_...
NEXT_PUBLIC_BLAZION_API_URL=http://localhost:3000
CORS_ORIGINS=http://localhost:3001
```

### Step 4: Link the `blog` pack to Notion

Choose one path.

1. Create a new blog database under a Notion page:
```bash
pnpm --filter @blazion/core-api run setup -- --pack=blog --page-id=<notion-page-id>
```

2. Link to an existing Notion database:
```bash
pnpm --filter @blazion/core-api run setup -- --pack=blog --database-id=<notion-db-id>
```

Notes:
- Setup is idempotent by default.
- To force creating a new DB when one is already linked:
```bash
pnpm --filter @blazion/core-api run setup -- --pack=blog --page-id=<notion-page-id> --force-create=true
```

### Step 5: Start everything

```bash
pnpm dev
```

### Step 6: Verify

- Web UI: `http://localhost:3001`
- API health: `http://localhost:3000/api/health`
- Blog posts API: `http://localhost:3000/api/blog/posts?page=1&limit=10&sort=newest`

If your Notion DB already has ready/public content, trigger a sync:

```bash
curl -X POST http://localhost:3000/api/sync
```

## 2. Key Config

### `blazion.config.ts`

Important sections:
- `packs`: enables/disables packs at runtime
- `socials`: author profile links
- `share.providers`: share actions on post metadata

Supported `share.providers`:
- `x`
- `whatsapp`
- `facebook`
- `linkedin`
- `instagram`
- `telegram`
- `reddit`
- `email`

Example:

```ts
packs: [{ name: 'blog', enabled: true }],
share: { providers: ['whatsapp', 'facebook', 'x'] },
```

### `.env`

Most used variables:
- `NOTION_API_KEY`
- `PORT` (default `3000`)
- `DATABASE_PATH` (default `./data/blog.db`)
- `NEXT_PUBLIC_BLAZION_API_URL`
- `CORS_ORIGINS`
- `SYNC_ADMIN_API_KEY_ENABLED`
- `SYNC_ADMIN_API_KEY`

Full template: `.env.example`

## 3. API Surface (Current Blog Pack)

- `GET /api/health`
- `GET /api/site`
- `GET /api/blog/posts`
- `GET /api/blog/posts/:slug`
- `GET /api/blog/posts/:slug/content`
- `GET /api/blog/posts/:slug/recommendations`
- `POST /api/sync`
- `POST /api/sync/images`
- `POST /api/sync/hint`
- `GET /api/sync/status`

## 4. Deployment (Monorepo-First)

Because current internal dependencies use `workspace:*`, deploy from the same repo checkout.

### Frontend on Vercel

Use this repo as the Vercel source.

- Root Directory: `packages/core-web`
- Install Command: `pnpm install`
- Build Command: `pnpm --filter @blazion/core-web build`
- Output: Next.js default

Required env vars on Vercel:
- `NEXT_PUBLIC_BLAZION_API_URL=https://api.yourdomain.com`
- `NEXT_PUBLIC_SITE_URL=https://your-frontend-domain.com`

Optional (comments):
- `NEXT_PUBLIC_GISCUS_REPO`
- `NEXT_PUBLIC_GISCUS_REPO_ID`
- `NEXT_PUBLIC_GISCUS_CATEGORY`
- `NEXT_PUBLIC_GISCUS_CATEGORY_ID`
- `NEXT_PUBLIC_GISCUS_MAPPING`

### API on your server/PaaS

1. Clone full repo
2. Install deps: `pnpm install`
3. Configure `.env` and `blazion.config.ts`
4. Run one-time pack setup (`--pack=blog`)
5. Build and start core API:

```bash
pnpm --filter @blazion/core-api build
pnpm --filter @blazion/core-api start
```

For development/watch:

```bash
pnpm --filter @blazion/core-api dev
```

Production baseline:
- Set strict `CORS_ORIGINS`
- Enable sync endpoint auth with `SYNC_ADMIN_API_KEY_ENABLED=true`
- Use persistent `DATABASE_PATH` (not ephemeral deploy storage)
- Put API behind reverse proxy (Nginx/Caddy or platform equivalent)

## 5. Contributor Guide (Add a New Pack)

Use this checklist to add `pack-<name>` in a modular way.

### Phase A: Create packages

- `packages/pack-<name>-api`
- `packages/pack-<name>-web`

### Phase B: Implement API pack contract

In `pack-<name>-api`, export pack entrypoints from `src/index.ts`:
- route registration
- sync service creation
- optional setup database creator

Mirror the shape used by `pack-blog-api`.

### Phase C: Register in core API runtime

Edit `packages/core-api/src/packs/index.ts` and register the pack with:
- `name`
- `description`
- `routePrefix` (for example `/api/<name>`)
- `createSyncService(context)`
- `registerApiRoutes(app, context)`
- optional `setup.createDatabase(...)`

### Phase D: Implement web pack

In `pack-<name>-web`:
- build routes/components/hooks
- expose route modules via package exports

### Phase E: Wire host routes

In `packages/core-web/src/app/*`, add route wrappers that re-export from `@blazion/pack-<name>-web/...`.

### Phase F: Enable pack in local config

Edit `blazion.config.ts`:

```ts
packs: [
  { name: 'blog', enabled: true },
  { name: '<name>', enabled: true },
]
```

### Phase G: Validate

```bash
pnpm -r typecheck
pnpm -r test
pnpm -r build
pnpm test:visual
```

## 6. Developer Commands

```bash
pnpm dev
pnpm build
pnpm typecheck
pnpm test
pnpm test:api
pnpm test:smoke:api
pnpm test:visual
pnpm test:visual:update
```

## 7. Troubleshooting

### No articles in UI

- Confirm pack is enabled in `blazion.config.ts`
- Confirm blog DB is linked (`setup -- --pack=blog --database-id=<id>`)
- Trigger sync: `POST /api/sync`
- Confirm Notion rows satisfy blog mapping rules (status/public flags)

### Frontend cannot call API

- `NEXT_PUBLIC_BLAZION_API_URL` must point to reachable API
- API `CORS_ORIGINS` must include frontend origin

### Theme/hydration glitches in dev

- Restart `pnpm dev`
- Hard refresh browser
- Remove stale `.next` if needed

## 8. Security Notes

- Never commit `.env`
- Protect sync endpoints in production
- Keep SQLite files in private persistent storage

## License

MIT
