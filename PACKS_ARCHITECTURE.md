# Blazion Pack Architecture

## Goal
Make Blazion modular so a user can enable only the packs they need (for example `blog` now, `docs` later), while core runtime remains stable and secure.

## Current Baseline (Implemented)
1. Runtime pack selection
- Config supports `packs` array in `blazion.config.ts`.
- Env override supported via `BLAZION_PACKS=blog,docs`.
- Unknown packs are detected and skipped with warnings.

2. Pack namespaced API contracts
- Pack routes are registered under `/api/<pack>/*`.
- Blog pack routes are available under:
  - `/api/blog/posts`
  - `/api/blog/posts/:slug`
  - `/api/blog/posts/:slug/recommendations`
  - `/api/blog/posts/:slug/content`
- Backward-compatible aliases remain at `/api/posts*`.

3. Pack-targeted sync orchestration
- Sync endpoints accept optional `?pack=<name>`.
- Sync status reports aggregate + per-pack sync results.

## Pack Contract Pattern
Each pack should define:
1. Schema contract
- Required Notion properties and field types.
- Valid domain values (for example blog statuses).

2. Mapping contract
- How Notion rows map to local DB rows.
- Validation, normalization, and conflict behavior.

3. API contract
- Route namespace under `/api/<pack>/*`.
- Request/response types owned by the pack.

4. Frontend contract
- Template data requirements and optional feature flags.

## Core vs Pack Responsibilities
Core should own:
- Runtime config loading + pack enablement.
- Security middleware, auth, rate limiting, shared observability.
- Sync orchestration across enabled packs.

Packs should own:
- Domain schema assumptions.
- Domain endpoints + scoring/filter rules.
- Domain migration and sync behavior.

## Installation Direction
Short-term (current monorepo):
- All code is present, but only enabled packs run.

Target model:
1. `create-blazion --preset blog` installs core + blog pack only.
2. `blazion add pack docs` installs docs pack and updates config.
3. Packs version independently with compatibility ranges against core.

## Next Steps
1. Extract blog sync/schema logic from generic services into explicit `blog` package boundary.
2. Introduce typed pack manifests in shared (`SchemaPack`, `ApiPack`, `TemplatePack`).
3. Publish packs as independent workspace/npm packages.
4. Add CI matrix for core + pack combinations.
