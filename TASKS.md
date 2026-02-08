# Notion Blog Engine - Phased Implementation

---

## Confirmed Constraints
- [x] Deliver phase-by-phase with each phase fully testable before moving on
- [x] Keep API runtime Bun-only
- [x] Keep `sync.publicOnly=true`
- [x] Defer frontend-heavy work until API is stable
- [x] Keep tests minimal per phase
- [x] Update this checklist in real time

---

## Phase 1: Monorepo Foundation
**Goal:** Set up the project structure with all tooling configured

### Deliverables
- [x] Turborepo monorepo initialized with pnpm
- [x] Three packages: `@blog-engine/shared`, `@blog-engine/api`, `@blog-engine/web`
- [x] TypeScript configured with path aliases
- [x] ESLint + Prettier configured
- [x] Environment variables template (.env.example)
- [x] Basic package.json scripts working

### Verification
```bash
# All commands should pass without errors
pnpm install           # Dependencies install
pnpm build             # All packages build
pnpm lint              # Linting passes
pnpm typecheck         # TypeScript compiles
```

### Success Criteria
- [x] `packages/shared/dist/` exists after build
- [x] `packages/api/dist/` exists after build  
- [x] `packages/web/.next/` exists after build
- [x] No TypeScript errors

---

## Phase 2: Shared Types & Config System
**Goal:** Define all shared types and configuration system

### Deliverables
- [x] Blog post schema types (matching Notion properties)
- [x] API response types (posts, pagination, errors)
- [x] Config types with `defineConfig` helper
- [x] Zod validators for runtime validation
- [x] Utility functions (slugify, date formatting)

### Verification
```bash
pnpm --filter @blog-engine/shared test   # Unit tests pass
pnpm --filter @blog-engine/shared build  # Compiles
```

### Success Criteria
- [x] Can import types in both api and web packages
- [x] `defineConfig({...})` provides autocomplete
- [x] Schema validation catches invalid data
- [x] Test: `validatePost({ title: '' })` throws validation error

---

## Phase 3: API Core & Notion Integration
**Goal:** Working API that can fetch and store Notion data

### Deliverables
- [x] Hono.js server running on Bun
- [x] Notion client wrapper (official + unofficial)
- [x] SQLite database with migrations
- [x] CLI setup command (`pnpm run setup --page-id=xxx`)
- [x] Basic sync service (Notion → SQLite)
- [x] Health endpoint (`GET /api/health`)

### Verification
```bash
# 1. Setup creates database in Notion
pnpm --filter @blog-engine/api setup --page-id=<test-page-id>
# Expected: Outputs new database ID

# 2. Server starts
pnpm --filter @blog-engine/api dev
# Expected: "Server running on http://localhost:3000"

# 3. Health check works
curl http://localhost:3000/api/health
# Expected: {"status":"ok","database":"connected"}

# 4. Manual sync test
curl -X POST http://localhost:3000/api/sync
# Expected: {"synced":0,"skipped":0,"errors":0}

# Note: Steps 1 and 4 require valid NOTION_API_KEY + NOTION_DATABASE_ID.
```

### Success Criteria
- [ ] Notion database created via CLI with correct schema
- [x] SQLite database file created at configured path
- [x] Server responds to health check
- [ ] Sync fetches pages from Notion (even if 0 posts)

---

## Phase 4: API Endpoints & Cron Jobs  
**Goal:** Complete REST API with automatic syncing

### Deliverables
- [ ] `GET /api/posts` - List posts with pagination
- [ ] `GET /api/posts?tags=x&author=y` - Filtering
- [ ] `GET /api/posts/:slug` - Single post metadata
- [ ] `GET /api/posts/:slug/content` - RecordMap for rendering
- [ ] Cron job: Sync at configured interval
- [ ] Cron job: Image URL refresh (hourly)
- [ ] Public/private page detection

### Verification
```bash
# 1. Create test post in Notion (status=ready, public URL enabled)

# 2. Trigger sync
curl -X POST http://localhost:3000/api/sync
# Expected: {"synced":1,"skipped":0,"errors":0}

# 3. List posts
curl http://localhost:3000/api/posts
# Expected: {"data":[{...post}],"pagination":{...}}

# 4. Get single post
curl http://localhost:3000/api/posts/my-test-slug
# Expected: {"data":{...full post with metadata}}

# 5. Get content for rendering
curl http://localhost:3000/api/posts/my-test-slug/content
# Expected: {"recordMap":{...},"renderMode":"recordMap"}

# 6. Verify cron is scheduled
# Check server logs for "Cron: sync job scheduled"
```

### Success Criteria
- [ ] Posts appear in API after sync
- [ ] Pagination works (test with limit=1)
- [ ] Tag filtering returns correct subset
- [ ] RecordMap is valid (can be parsed as JSON)
- [ ] Cron logs show scheduled jobs

---

## Phase 5: Next.js Frontend
**Goal:** Beautiful, SEO-optimized blog frontend

### Deliverables
- [ ] Next.js 14 with App Router
- [ ] Shadcn UI components installed
- [ ] Design system implemented (colors, typography)
- [ ] Dark/light mode toggle
- [ ] Home page with featured posts (SSG)
- [ ] Posts list page with pagination (SSR)
- [ ] Single post page with react-notion-x (SSR/ISR)
- [ ] Tag filter page (SSR)
- [ ] Responsive design (mobile-first)

### Verification
```bash
# 1. Dev server runs
pnpm --filter @blog-engine/web dev
# Expected: "Ready on http://localhost:3001"

# 2. Build succeeds (SSR pages pre-render)
pnpm --filter @blog-engine/web build
# Expected: No errors, pages listed in output

# 3. Browser tests
# - Navigate to http://localhost:3001
# - Home page shows posts
# - Click post → renders Notion content
# - Toggle dark mode → colors change
# - Resize to mobile → layout adapts
```

### Success Criteria
- [ ] Lighthouse SEO score > 90
- [ ] All pages render without JS (view source shows content)
- [ ] Dark/light mode persists across refresh
- [ ] Post content renders with proper Notion formatting
- [ ] No layout shift on page load

---

## Phase 6: Integration & Polish
**Goal:** Production-ready with documentation and edge cases handled

### Deliverables
- [ ] Full end-to-end flow working
- [ ] Error handling for sync failures
- [ ] Image URL refresh tested
- [ ] Fallback block renderer for private pages
- [ ] README with setup instructions
- [ ] Sample blog-engine.config.ts
- [ ] Demo content for showcasing

### Verification
```bash
# 1. Full stack runs together
pnpm dev  # Starts both API and Web

# 2. E2E flow
# - Create post in Notion
# - Wait for sync (or trigger manually)
# - Verify post appears on frontend
# - Edit post in Notion
# - Verify changes appear after next sync

# 3. Edge cases
# - Set post status to "draft" → should not appear
# - Remove public URL → skipped with warning (if publicOnly=true)
# - Corrupt image URL → refreshes on next cron
```

### Success Criteria
- [ ] Fresh clone + setup works in < 5 minutes
- [ ] README instructions are complete and accurate
- [ ] No console errors in production build
- [ ] Handles Notion API rate limits gracefully
- [ ] Handles network failures without crashing

---

## Implementation Order

```
Phase 1 ──► Phase 2 ──► Phase 3 ──► Phase 4 ──► Phase 5 ──► Phase 6
```

**Estimated Timeline:**
| Phase | Duration | Dependencies |
|-------|----------|--------------|
| Phase 1 | 1 session | None |
| Phase 2 | 1 session | Phase 1 |
| Phase 3 | 2 sessions | Phase 2 |
| Phase 4 | 1-2 sessions | Phase 3 |
| Phase 5 | 2-3 sessions | Phase 2 |
| Phase 6 | 1 session | Phase 4, 5 |
