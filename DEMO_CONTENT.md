# Demo Content Seed

Use this checklist to create showcase posts quickly in Notion:

## Post 1: Product Intro
- `Title`: Welcome to Blog Engine
- `Slug`: welcome-to-blog-engine
- `Summary`: Intro post synced from Notion
- `Author`: Demo Author
- `Tags`: intro, product
- `Status`: ready
- `Published`: today
- `Featured`: checked
- `Public Share`: enabled

## Post 2: Engineering Notes
- `Title`: How Notion Sync Works
- `Slug`: how-notion-sync-works
- `Summary`: Sync pipeline, retries, and rendering modes
- `Author`: Demo Author
- `Tags`: engineering, architecture
- `Status`: ready
- `Published`: today
- `Featured`: unchecked
- `Related Posts`: link to `Welcome to Blog Engine`
- `Public Share`: enabled

## Post 3: Private Draft
- `Title`: Private Working Draft
- `Slug`: private-working-draft
- `Summary`: Used to validate private fallback block rendering
- `Author`: Demo Author
- `Tags`: draft
- `Status`: ready
- `Published`: today
- `Public Share`: disabled

Notes:
- If `SYNC_PUBLIC_ONLY=true`, Post 3 will be skipped.
- If `SYNC_PUBLIC_ONLY=false`, Post 3 will be served with `renderMode="blocks"`.
