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

## Environment Variables
- `NOTION_API_KEY`: Notion integration key
- `NOTION_DATABASE_ID`: blog database id
- `PORT`: API port (default `3000`)
- `DATABASE_PATH`: SQLite DB path (default `./data/blog.db`)
- `SYNC_INTERVAL`: cron for content sync (default `*/30 * * * *`)
- `IMAGE_REFRESH_INTERVAL`: cron for image refresh (default `0 * * * *`)
- `SYNC_PUBLIC_ONLY`: if `true`, skips non-public pages

## API Endpoints
- `GET /api/health`
- `POST /api/sync`
- `POST /api/sync/images`
- `GET /api/posts`
- `GET /api/posts/:slug`
- `GET /api/posts/:slug/content`

## Notion Database Properties
- Required:
  - `Title` (title)
  - `Slug` (rich_text)
  - `Status` (select: `draft|pending|ready`)
- Optional:
  - `Summary` (rich_text)
  - `Author` (rich_text)
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
