# Notion Blazion - Specification

> A backend application that uses Notion as a content management system for blog websites.

---

## Overview

Blazion syncs content from a Notion database to a local SQLite database, exposes REST APIs for frontend consumption, and ships with a pre-built Next.js frontend for a complete blog experience.

### Key Features

- **Notion as CMS** - Write posts in Notion, they appear on your blog
- **Automatic Sync** - Cron jobs keep content up-to-date
- **SEO Optimized** - Server-side rendering with Next.js
- **Beautiful UI** - Modern design with dark/light mode
- **Easy Setup** - CLI command creates Notion database automatically

---

## Architecture

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│                 │     │                 │     │                 │
│  Notion (CMS)   │────▶│  Bun + Hono     │────▶│  Next.js SSR    │
│                 │     │  (API Server)   │     │  (Frontend)     │
└─────────────────┘     └────────┬────────┘     └─────────────────┘
                                 │
                        ┌────────▼────────┐
                        │                 │
                        │     SQLite      │
                        │   (Local DB)    │
                        └─────────────────┘
```

### Monorepo Structure

```
blogEngine/
├── packages/
│   ├── core-api/          # @blazion/core-api - Hono.js backend (Bun runtime)
│   ├── core-web/     # @blazion/core-web - Next.js SSR frontend
│   └── shared/       # @blazion/shared - Shared types and utilities
├── TASKS.md          # Implementation progress tracker
├── SPEC.md           # This file
├── turbo.json        # Turborepo configuration
├── pnpm-workspace.yaml
├── package.json
├── tsconfig.json
└── blazion.config.ts
```

---

## Tech Stack

### Backend (@blazion/core-api)
| Technology | Purpose |
|------------|---------|
| Bun | JavaScript runtime |
| Hono.js | Web framework |
| SQLite (better-sqlite3) | Local database |
| @notionhq/client | Official Notion API |
| notion-client | Unofficial client for recordMaps |
| Croner | Cron job scheduling |
| Zod | Schema validation |

### Frontend (@blazion/core-web)
| Technology | Purpose |
|------------|---------|
| Next.js 14+ | React framework with SSR/SSG |
| React 18 | UI library |
| Shadcn UI | Component library |
| TanStack Query | Client-side data fetching |
| react-notion-x | Notion page rendering |
| Tailwind CSS | Styling |

### Shared (@blazion/shared)
| Technology | Purpose |
|------------|---------|
| TypeScript | Type definitions |
| Zod | Runtime validation |

---

## Notion Database Schema

The Notion database requires these properties:

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| Title | Title | ✓ | Post title |
| Slug | Rich Text | ✓ | URL slug for the post |
| Summary | Rich Text | | Post excerpt for previews |
| Author | Rich Text | | Post author name |
| Tags | Multi-select | | Categorization tags |
| Status | Select | ✓ | `draft`, `pending`, `ready` |
| Published | Date | | Publish date |
| Banner | Files & Media | | Banner/cover image |

**Note:** Only posts with `status=ready` are exposed via the API.

---

## API Endpoints

Base URL: `http://localhost:3000`

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/health` | Health check |
| GET | `/api/blog/posts` | List all published posts (paginated) |
| GET | `/api/blog/posts?page=1&limit=10` | Pagination |
| GET | `/api/blog/posts?tags=tech,design` | Filter by tags |
| GET | `/api/blog/posts?author=john` | Filter by author |
| GET | `/api/blog/posts/:slug` | Get single post with metadata |
| GET | `/api/blog/posts/:slug/content` | Get recordMap for rendering |
| POST | `/api/sync` | Manually trigger sync (dev only) |

### Response Shapes

```typescript
// GET /api/blog/posts
{
  data: Post[],
  pagination: {
    page: number,
    limit: number,
    total: number,
    totalPages: number
  }
}

// GET /api/blog/posts/:slug
{
  data: Post
}

// GET /api/blog/posts/:slug/content
{
  recordMap: RecordMap,  // For react-notion-x
  renderMode: 'recordMap' | 'blocks'
}
```

---

## Configuration

```typescript
// blazion.config.ts
import { defineConfig } from '@blazion/shared';

export default defineConfig({
  notion: {
    integrationKey: process.env.NOTION_API_KEY!,
  },
  cron: {
    syncInterval: '*/30 * * * *',      // Every 30 minutes
    imageRefreshInterval: '0 * * * *', // Every hour
  },
  sync: {
    publicOnly: true,  // Only sync pages with public URLs
  },
  database: {
    path: './data/blog.db',
  },
  server: {
    port: 3000,
  },
});
```

### Configuration Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `notion.integrationKey` | string | required | Notion integration API key |
| `pack database binding` | internal | setup-managed | Notion database ID linked internally after setup |
| `cron.syncInterval` | string | `*/30 * * * *` | Cron expression for sync |
| `cron.imageRefreshInterval` | string | `0 * * * *` | Cron for image URL refresh |
| `sync.publicOnly` | boolean | `true` | Only sync public pages |
| `database.path` | string | `./data/blog.db` | SQLite database path |
| `server.port` | number | `3000` | API server port |

---

## Public vs Private Pages

The `notion-client` library (used for recordMaps) only works with **publicly shared** Notion pages.

| `sync.publicOnly` | Behavior |
|-------------------|----------|
| `true` (default) | Only sync pages with public URL. Skip private pages with warning. |
| `false` | Sync all pages. Use recordMap for public, block content for private. |

**Rendering modes:**
- `recordMap` → Full react-notion-x rendering (public pages)
- `blocks` → Custom block renderer (private pages)

---

## Design System

### Typography
| Element | Font | Weight | Size |
|---------|------|--------|------|
| Headings | Inter | 700 | 2.5rem - 1.25rem |
| Body | Inter | 400 | 1rem (16px) |
| Code | JetBrains Mono | 400 | 0.875rem |

### Color Palette

**Light Mode:**
- Background: `#FAFAFA`
- Foreground: `#1A1A1A`
- Accent: `#6366F1` (Indigo)
- Muted: `#6B7280`

**Dark Mode:**
- Background: `#0A0A0A`
- Foreground: `#FAFAFA`
- Accent: `#818CF8`
- Card: `#18181B`

### Visual Effects
- Glassmorphism on cards
- Micro-animations on hover
- Bento grid for featured posts
- Reading progress indicator

---

## Edge Cases

### Image URL Expiration
Notion S3 URLs expire after ~1 hour. The image refresh cron job updates URLs before they expire.

### Sync Failures
- Retry with exponential backoff
- Log errors without crashing
- Skip invalid entries, continue with valid ones

### Rate Limiting
Notion API has rate limits. The sync service respects these and backs off when necessary.

---

## Getting Started

```bash
# 1. Clone and install
git clone <repo>
cd blogEngine
pnpm install

# 2. Set up environment
cp .env.example .env
# Add your NOTION_API_KEY

# 3. Create Notion database
pnpm --filter @blazion/core-api run setup -- --pack=blog --page-id=<your-notion-page-id>
# Database binding is stored internally per pack.

# 4. Start development
pnpm dev
```

---

## Frontend Routes

| Route | Rendering | Description |
|-------|-----------|-------------|
| `/` | SSG | Home page with featured posts |
| `/posts` | SSR | Paginated post list with filters |
| `/posts/[slug]` | SSR/ISR | Single post with Notion content |
| `/tags/[tag]` | SSR | Posts filtered by tag |

---

## Scripts

```bash
pnpm dev          # Start all packages in dev mode
pnpm build        # Build all packages
pnpm lint         # Lint all packages
pnpm typecheck    # TypeScript check
pnpm test         # Run tests

# Package-specific
pnpm --filter @blazion/core-api dev
pnpm --filter @blazion/core-web dev
pnpm --filter @blazion/core-api run setup -- --pack=blog --page-id=<id>
```
