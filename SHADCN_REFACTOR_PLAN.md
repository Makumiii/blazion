# Shadcn Refactor Plan (No Visual Drift)

## Goal
- Migrate pack UI interactions to shadcn primitives.
- Keep the current visual style unchanged.
- Keep `@blazion/core-web` as host shell and `@blazion/pack-blog-web` as UI owner.

## Phase 0 Baseline Lock
- [x] Capture screenshots for `/`, `/posts`, `/posts/[slug]`, `/search`, `/tags/[tag]` in light/dark.
- [ ] Freeze acceptance checklist:
  - spacing, typography, border radius, hover/active states, focus rings.
- [ ] Keep full validation green before each migration step:
  - `pnpm -r typecheck`
  - `pnpm -r test`
  - `NEXT_PUBLIC_BLAZION_API_URL=http://localhost:3000 pnpm -r build`

## Phase 1 Foundation Alignment
- [x] Add shadcn config for pack workspace (`packages/pack-blog-web/components.json`).
- [x] Align pack TS aliases for shadcn paths (`@/*` in `packages/pack-blog-web/tsconfig.json`).
- [x] Normalize `Button` primitive with an `unstyled` mode for safe migrations without visual drift.

## Phase 2 Incremental Component Migration
- [x] `theme-toggle` -> shadcn `Button`.
- [x] `back-button` -> shadcn `Button`.
- [x] `home-feed` filter tabs -> shadcn `Button`.
- [x] `header-search` result actions -> shadcn `Button`.
- [x] `post-share-panel` copy action -> shadcn `Button`.
- [x] `social-dock` toggle/copy actions -> shadcn `Button`.
- [x] `search-page` form controls -> shadcn `Input` + `Button`.

## Phase 3 Pending
- [x] Theme provider migration to `next-themes` while preserving current behavior.
- [ ] Optional adoption of additional shadcn components (`tooltip`, `popover`, `dropdown-menu`) where it reduces custom edge-case code.
- [x] Visual regression baseline + local checker script (`pnpm test:visual`).
- [x] Wire `pnpm test:visual` into CI.
