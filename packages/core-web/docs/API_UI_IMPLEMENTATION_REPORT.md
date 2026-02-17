# Blazion Web: API Analysis + UI Delivery

## 1) API Analysis Report

### API Inventory

| Method | Path | Params | Request Body | Response Shape | Pagination | Sort/Filter | Auth | Errors |
|---|---|---|---|---|---|---|---|---|
| GET | `/api/health` | none | none | `{status,database,notionConfigured,timestamp}` | none | none | public | generic 500 |
| GET | `/api/site` | none | none | `{data:{socials,site{homeHeader}}}` | none | none | public | generic 500 |
| GET | `/api/posts` | `page,limit,q,dateFrom,dateTo,tags,author,authors,segment,segments,featured,sort` | none | `{data:BlogPost[],pagination,facets,appliedFilters}` | page+limit | `sort=newest|oldest` + listed filters | public | `400` invalid query, `429` rate limit |
| GET | `/api/search-index` | `limit` | none | `{data:BlogPost[]}` | none (limit slice) | none | public | generic |
| GET | `/api/posts/:slug` | `slug` | none | `{data:BlogPost}` | none | none | public | `404` |
| GET | `/api/posts/:slug/recommendations` | `slug`, `limit` | none | `{data:BlogPost[],strategy}` | none (limit) | recommendation ranking | public | `404` |
| GET | `/api/posts/:slug/content` | `slug` | none | `{recordMap,renderMode}` OR `{recordMap:{},blocks,renderMode:'blocks'}` | none | none | public | `404`,`502`,`503` |
| POST | `/api/sync` | none | none | `{synced,skipped,errors,removed}` | none | none | optional API key | `409`,`500`,`503`,`429`,`401` |
| POST | `/api/sync/images` | none | none | `{synced,skipped,errors,removed}` | none | none | optional API key | `500`,`503`,`429`,`401` |
| POST | `/api/sync/hint` | headers: `x-sync-session` | none | `{status:'queued'|'in_progress'|'cooldown'|'rate_limited',...}` | none | none | public | `429`,`503` |
| GET | `/api/sync/status` | none | none | sync + image refresh status object | none | none | public | generic |

### Auth and Rate Limits
- Read routes are public.
- Manual sync routes can require `x-api-key` or `Authorization: Bearer ...` when `SYNC_ADMIN_API_KEY_ENABLED=true`.
- Rate limiting is enabled per route class (`/api/posts`, `/api/posts/:slug/content`, `/api/sync*`).

### Error Shape
```json
{
  "error": "Not found",
  "message": "Post with slug \"...\" not found",
  "details": {}
}
```

## 2) Data Dictionary

### Entity: `BlogPost`
| Field | Type | Required |
|---|---|---|
| id | string | yes |
| notionPageId | string | yes |
| title | string | yes |
| slug | string | yes |
| summary | string \| null | nullable |
| author | string \| null | nullable |
| authorEmail | string \| null | nullable |
| authorAvatarUrl | string \| null | nullable |
| tags | string[] | yes |
| segment | string \| null | nullable |
| status | `draft \| pending \| ready` | yes |
| publishedAt | ISO datetime \| null | nullable |
| bannerImageUrl | URL \| null | nullable |
| readTimeMinutes | number \| null | nullable |
| featured | boolean | yes |
| relatedPostIds | string[] | yes |
| isPublic | boolean | yes |
| createdAt | ISO datetime | yes |
| updatedAt | ISO datetime | yes |

### Entity: `PostFacets`
- `authors: { value: string; count: number }[]`
- `segments: { value: string; count: number }[]`

### Entity: `SiteSettings`
- `socials`: optional links (`linkedin`, `x`, `instagram`, `linktree`, `facebook`, `github`, etc.)
- `site.homeHeader`: string

### Example payload (`GET /api/posts`)
```json
{
  "data": [
    {
      "id": "7de...",
      "notionPageId": "7de...",
      "title": "Shipping Editorial Systems",
      "slug": "shipping-editorial-systems",
      "summary": "How to design blogs from API contracts.",
      "author": "Maks",
      "authorEmail": null,
      "authorAvatarUrl": null,
      "tags": ["design", "engineering"],
      "segment": "Product",
      "status": "ready",
      "publishedAt": "2026-02-10T10:00:00.000Z",
      "bannerImageUrl": "https://s3...",
      "readTimeMinutes": 6,
      "featured": true,
      "relatedPostIds": [],
      "isPublic": true,
      "createdAt": "2026-02-10T09:00:00.000Z",
      "updatedAt": "2026-02-10T10:00:00.000Z"
    }
  ],
  "pagination": { "page": 1, "limit": 10, "total": 1, "totalPages": 1 },
  "facets": { "authors": [], "segments": [] },
  "appliedFilters": { "q": "", "dateFrom": "", "dateTo": "", "tags": [], "authors": [], "segments": [], "featuredOnly": false, "sort": "newest" }
}
```

### Image availability notes
- API exposes a single `bannerImageUrl` string.
- No API-provided width/height/variants, so UI must reserve aspect-ratio slots and apply `object-fit: cover`.
- Signed Notion URLs can expire; API proactively refreshes them.

## 3) API -> UI Mapping Plan (implemented)

- Pagination supported (`page`, `limit`) -> paged navigation on Home, Posts, Tag, Search.
- Text search supported (`q`) -> dedicated `/search` page and search form.
- Tag filtering supported (`tags`) -> `/tags/[tag]` pages.
- Segment/author filters supported -> `/posts` accepts filter query params.
- Recommendations endpoint supported -> related posts section on Post Detail.
- Content endpoint supports `recordMap` and fallback `blocks` -> dual renderer.
- Site settings endpoint supported -> footer social links + site context.
- No category entity endpoint -> no synthetic category UI.
- No media metadata variants -> image strategy uses fixed aspect-ratio wrappers and fallback artwork.

## 4) Design System Summary

### Design direction
Calm modern newspaper: restrained serif headlines, neutral paper-like surfaces, thin grid texture, and warm clay accent. The audience is readers who want focus and legibility over dashboard noise, while still feeling premium and crafted.

### Typography
- Headings: `Source Serif 4`
- Body: `Mona Sans Variable`
- Scale:
  - `H1`: clamp(2rem, 4vw, 3.4rem), line-height 1.1
  - `H2`: clamp(1.5rem, 3vw, 2.2rem), line-height 1.2
  - `H3`: clamp(1.2rem, 2.3vw, 1.55rem), line-height 1.28
  - Body: 1rem to 1.05rem
  - Small/meta: 0.74rem to 0.9rem

### Palette
- `--bg: #f5f3ef`
- `--text: #171514`
- `--muted: #675f58`
- `--border: #cfc7bf`
- `--accent: #9f4f2c`
- `--accent-hover: #813b1d`
- `--surface: #f0ece6`

### Spacing + layout
- Tokens `--space-1` to `--space-7`
- 12-column card grid
- Max reading shell `76rem`
- Content measure around `72ch`

### Premium components
- Post cards with stable media ratio and compact metadata strips
- Large editorial post headers with hero media
- Polished article body spacing and rhythm
- Minimal sticky nav + subtle footer social row

## 5) Architecture + Contract Tests

### Architecture
- Typed API client in `src/lib/api/client.ts`
- Centralized API response contracts in `src/lib/api/types.ts`
- Server-first fetching with Next.js revalidation + route-level loading/error boundaries

### Contract checks
Run:
```bash
pnpm --filter @blazion/core-web run contract:test
```
Checks:
- `/api/health` reachable
- `/api/posts?limit=1` returns pagination keys
- First post contains `slug`
- `/api/posts/:slug` returns matching post
- `/api/posts/:slug/content` includes `renderMode`

## 6) Tradeoffs
- Category pages are not implemented because API has no category entity.
- Share links are lightweight URL intents; no analytics layer added.
- Private block rendering is plain-text oriented unless `recordMap` is available.

## 7) Success Criteria Checklist
- ✅ UI uses API-native capabilities (pagination, q, tags, recommendations, content modes).
- ✅ Distinct editorial visual style (serif-led, warm neutral system, structured grid rhythm).
- ✅ Minimal and readable layout with semantic HTML and metadata.
- ✅ Image strategy prevents distortion and layout shift via fixed aspect-ratio wrappers and fallbacks.
- ✅ Responsive breakpoints cover mobile/tablet/desktop and avoid horizontal overflow.
- ✅ Accessibility baseline included: landmark elements, labels, focusable controls, hierarchy.
