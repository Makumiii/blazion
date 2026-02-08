import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import { rateLimiter } from 'hono-rate-limiter';
import { Cron } from 'croner';
import { postsQuerySchema } from '@blog-engine/shared';
import type { BlogPost } from '@blog-engine/shared';

import { loadRuntimeConfig } from './config';
import { DatabaseService } from './db';
import { NotionService } from './notion';
import { SyncService } from './sync';

const runtime = await loadRuntimeConfig();
const app = new Hono();
const db = new DatabaseService(runtime.config.database.path);
db.migrate();

const corsOrigins = parseCsv(process.env.CORS_ORIGINS);
const rateLimitEnabled = parseBooleanEnv(process.env.API_RATE_LIMIT_ENABLED, true);
const syncAdminApiKeyEnabled = parseBooleanEnv(process.env.SYNC_ADMIN_API_KEY_ENABLED, false);
const syncAdminApiKey = process.env.SYNC_ADMIN_API_KEY?.trim() ?? '';
const defaultRateWindowMs = parseIntEnv(process.env.API_RATE_LIMIT_WINDOW_MS, 60_000);
const defaultRateLimit = parseIntEnv(process.env.API_RATE_LIMIT_MAX, 60);
const postsRateLimit = parseIntEnv(process.env.API_RATE_LIMIT_POSTS_MAX, 120);
const contentRateLimit = parseIntEnv(process.env.API_RATE_LIMIT_CONTENT_MAX, 30);
const syncRateLimit = parseIntEnv(process.env.API_RATE_LIMIT_SYNC_MAX, 2);

const notionService = runtime.notionConfigured
    ? new NotionService(runtime.config.notion.integrationKey)
    : null;

const syncService =
    notionService !== null
        ? new SyncService({
              notion: notionService,
              db,
              config: runtime.config,
          })
        : null;

const HINT_COOLDOWN_MS = 60_000;
const RATE_MINUTE_MS = 60_000;
const RATE_HOUR_MS = 60 * 60_000;
const IP_MINUTE_LIMIT = 1;
const IP_HOUR_LIMIT = 5;
const SESSION_MINUTE_LIMIT = 1;

let syncInProgress = false;
let lastSyncStartedAt = 0;
let lastSyncFinishedAt = 0;
let lastSyncSource: 'none' | 'cron' | 'manual' | 'hint' = 'none';
let lastSyncResult: { synced: number; skipped: number; errors: number } | null = null;
let lastSyncError: string | null = null;

const ipMinuteCounter = new Map<string, CounterState>();
const ipHourCounter = new Map<string, CounterState>();
const sessionMinuteCounter = new Map<string, CounterState>();

if (syncService !== null) {
    new Cron(runtime.config.cron.syncInterval, async () => {
        try {
            const result = await runSync('cron');
            console.log('Cron: sync run completed', result);
        } catch (error) {
            console.error('Cron: sync run failed', error);
        }
    });
    console.log(`Cron: sync job scheduled (${runtime.config.cron.syncInterval})`);

    new Cron(runtime.config.cron.imageRefreshInterval, async () => {
        try {
            const result = await syncService.refreshImageUrls();
            console.log('Cron: image refresh run completed', result);
        } catch (error) {
            console.error('Cron: image refresh run failed', error);
        }
    });
    console.log(`Cron: image refresh job scheduled (${runtime.config.cron.imageRefreshInterval})`);
}

// Middleware
app.use('*', logger());
app.use(
    '*',
    cors({
        origin: (origin) => {
            if (corsOrigins.length === 0) {
                return origin || '*';
            }
            if (origin && corsOrigins.includes(origin)) {
                return origin;
            }
            return corsOrigins[0];
        },
        allowMethods: ['GET', 'POST', 'OPTIONS'],
        allowHeaders: ['Content-Type', 'Authorization', 'X-API-Key', 'X-Sync-Session'],
    }),
);

if (rateLimitEnabled) {
    app.use(
        '/api/*',
        rateLimiter({
            windowMs: defaultRateWindowMs,
            limit: defaultRateLimit,
            keyGenerator: (c) => getClientIp(c),
            standardHeaders: 'draft-6',
            skip: (c) => c.req.method === 'OPTIONS',
            message: {
                error: 'Rate limit exceeded',
                message: 'Too many requests. Please retry later.',
            },
        }),
    );

    app.use(
        '/api/posts',
        rateLimiter({
            windowMs: defaultRateWindowMs,
            limit: postsRateLimit,
            keyGenerator: (c) => getClientIp(c),
            standardHeaders: 'draft-6',
            skip: (c) => c.req.method === 'OPTIONS',
            message: {
                error: 'Rate limit exceeded',
                message: 'Too many post listing requests.',
            },
        }),
    );

    app.use(
        '/api/posts/:slug/content',
        rateLimiter({
            windowMs: defaultRateWindowMs,
            limit: contentRateLimit,
            keyGenerator: (c) => getClientIp(c),
            standardHeaders: 'draft-6',
            skip: (c) => c.req.method === 'OPTIONS',
            message: {
                error: 'Rate limit exceeded',
                message: 'Too many content requests for this route.',
            },
        }),
    );

    app.use(
        '/api/sync',
        rateLimiter({
            windowMs: defaultRateWindowMs,
            limit: syncRateLimit,
            keyGenerator: (c) => getClientIp(c),
            standardHeaders: 'draft-6',
            skip: (c) => c.req.method === 'OPTIONS',
            message: {
                error: 'Rate limit exceeded',
                message: 'Too many sync requests.',
            },
        }),
    );

    app.use(
        '/api/sync/images',
        rateLimiter({
            windowMs: defaultRateWindowMs,
            limit: syncRateLimit,
            keyGenerator: (c) => getClientIp(c),
            standardHeaders: 'draft-6',
            skip: (c) => c.req.method === 'OPTIONS',
            message: {
                error: 'Rate limit exceeded',
                message: 'Too many image refresh requests.',
            },
        }),
    );
}

// Health check endpoint
app.get('/api/health', (c) => {
    return c.json({
        status: 'ok',
        database: db.isConnected() ? 'connected' : 'disconnected',
        notionConfigured: runtime.notionConfigured,
        timestamp: new Date().toISOString(),
    });
});

app.get('/api/site', (c) => {
    c.header('Cache-Control', 'public, max-age=300, stale-while-revalidate=900');
    return c.json({
        data: {
            socials: runtime.config.socials,
        },
    });
});

app.post('/api/sync/images', async (c) => {
    const authError = assertSyncAuthorization(c);
    if (authError) {
        return authError;
    }

    if (syncService === null) {
        return c.json(
            {
                error: 'Not configured',
                message: 'Set NOTION_API_KEY and NOTION_DATABASE_ID to enable sync.',
            },
            503,
        );
    }

    try {
        const result = await syncService.refreshImageUrls();
        return c.json(result);
    } catch (error) {
        console.error('Manual image refresh failed', error);
        return c.json(
            {
                error: 'Refresh failed',
                message: 'Could not refresh image URLs from Notion.',
            },
            500,
        );
    }
});

app.post('/api/sync', async (c) => {
    const authError = assertSyncAuthorization(c);
    if (authError) {
        return authError;
    }

    if (syncService === null) {
        return c.json(
            {
                error: 'Not configured',
                message: 'Set NOTION_API_KEY and NOTION_DATABASE_ID to enable sync.',
            },
            503,
        );
    }

    if (syncInProgress) {
        return c.json(
            {
                status: 'in_progress',
                message: 'A sync is already running.',
            },
            409,
        );
    }

    try {
        const result = await runSync('manual');
        return c.json(result);
    } catch (error) {
        console.error('Manual sync failed', error);
        return c.json(
            {
                error: 'Sync failed',
                message: 'Could not sync data from Notion.',
            },
            500,
        );
    }
});

app.post('/api/sync/hint', (c) => {
    if (syncService === null) {
        return c.json(
            {
                error: 'Not configured',
                message: 'Set NOTION_API_KEY and NOTION_DATABASE_ID to enable sync.',
            },
            503,
        );
    }

    const now = Date.now();
    const ip = getClientIp(c);
    const sessionId = c.req.header('x-sync-session')?.trim() || ip;

    const ipMinute = tryConsumeCounter(ipMinuteCounter, ip, RATE_MINUTE_MS, IP_MINUTE_LIMIT, now);
    if (!ipMinute.allowed) {
        return c.json(
            {
                status: 'rate_limited',
                scope: 'ip_minute',
                retryAfterMs: ipMinute.retryAfterMs,
            },
            429,
        );
    }

    const ipHour = tryConsumeCounter(ipHourCounter, ip, RATE_HOUR_MS, IP_HOUR_LIMIT, now);
    if (!ipHour.allowed) {
        return c.json(
            {
                status: 'rate_limited',
                scope: 'ip_hour',
                retryAfterMs: ipHour.retryAfterMs,
            },
            429,
        );
    }

    const sessionMinute = tryConsumeCounter(
        sessionMinuteCounter,
        sessionId,
        RATE_MINUTE_MS,
        SESSION_MINUTE_LIMIT,
        now,
    );
    if (!sessionMinute.allowed) {
        return c.json(
            {
                status: 'rate_limited',
                scope: 'session_minute',
                retryAfterMs: sessionMinute.retryAfterMs,
            },
            429,
        );
    }

    if (syncInProgress) {
        return c.json(
            {
                status: 'in_progress',
                lastSyncStartedAt: toIso(lastSyncStartedAt),
                lastSyncSource,
            },
            202,
        );
    }

    const nextAllowedAtMs = lastSyncStartedAt + HINT_COOLDOWN_MS;
    if (lastSyncStartedAt !== 0 && now < nextAllowedAtMs) {
        return c.json(
            {
                status: 'cooldown',
                nextAllowedAt: toIso(nextAllowedAtMs),
                retryAfterMs: nextAllowedAtMs - now,
            },
            202,
        );
    }

    void runSync('hint')
        .then((result) => {
            console.log('Hint sync completed', result);
        })
        .catch((error) => {
            console.error('Hint sync failed', error);
        });

    return c.json(
        {
            status: 'queued',
            nextAllowedAt: toIso(now + HINT_COOLDOWN_MS),
        },
        202,
    );
});

app.get('/api/sync/status', (c) => {
    const now = Date.now();
    const nextAllowedAtMs = lastSyncStartedAt + HINT_COOLDOWN_MS;
    return c.json({
        status: syncInProgress ? 'in_progress' : 'idle',
        lastSyncStartedAt: toIso(lastSyncStartedAt),
        lastSyncFinishedAt: toIso(lastSyncFinishedAt),
        lastSyncSource,
        lastSyncResult,
        lastSyncError,
        nextHintAllowedAt: toIso(nextAllowedAtMs),
        hintCooldownRemainingMs: Math.max(0, nextAllowedAtMs - now),
    });
});

// Placeholder routes - will be implemented in Phase 3 & 4
app.get('/api/posts', (c) => {
    const parsedQuery = postsQuerySchema.safeParse({
        page: c.req.query('page'),
        limit: c.req.query('limit'),
        tags: c.req.query('tags'),
        author: c.req.query('author'),
    });

    if (!parsedQuery.success) {
        return c.json(
            {
                error: 'Invalid query',
                message: 'Invalid pagination or filter query parameters.',
                details: parsedQuery.error.flatten(),
            },
            400,
        );
    }

    const query = parsedQuery.data;
    const tags = query.tags
        ? query.tags
              .split(',')
              .map((value) => value.trim())
              .filter((value) => value.length > 0)
        : [];

    const result = db.listReadyPosts({
        page: query.page,
        limit: query.limit,
        tags,
        author: query.author,
    });

    const totalPages = result.total === 0 ? 0 : Math.ceil(result.total / query.limit);

    c.header('Cache-Control', 'public, max-age=60, stale-while-revalidate=300');
    return c.json({
        data: result.data.map(toApiPost),
        pagination: {
            page: query.page,
            limit: query.limit,
            total: result.total,
            totalPages,
        },
    });
});

app.get('/api/posts/:slug', (c) => {
    const slug = c.req.param('slug');
    const post = db.getReadyPostBySlug(slug);
    if (!post) {
        return c.json(
            {
                error: 'Not found',
                message: `Post with slug "${slug}" not found`,
            },
            404,
        );
    }

    c.header('Cache-Control', 'public, max-age=120, stale-while-revalidate=600');
    return c.json({
        data: toApiPost(post),
    });
});

app.get('/api/posts/:slug/content', async (c) => {
    const slug = c.req.param('slug');
    const post = db.getReadyPostBySlug(slug);
    if (!post) {
        return c.json(
            {
                error: 'Not found',
                message: `Content for post "${slug}" not found`,
            },
            404,
        );
    }

    if (notionService === null) {
        return c.json(
            {
                error: 'Not configured',
                message: 'Set NOTION_API_KEY and NOTION_DATABASE_ID to enable content fetch.',
            },
            503,
        );
    }

    if (post.isPublic) {
        try {
            const recordMap = await notionService.getRecordMap(post.notionPageId);
            c.header('Cache-Control', 'public, max-age=120, stale-while-revalidate=600');
            return c.json({
                recordMap,
                renderMode: 'recordMap',
            });
        } catch (error) {
            console.error('Failed to fetch recordMap', error);
            return c.json(
                {
                    error: 'Content fetch failed',
                    message: `Could not fetch content for post "${slug}"`,
                },
                502,
            );
        }
    }

    try {
        const blocks = await notionService.getBlockContent(post.notionPageId);
        c.header('Cache-Control', 'public, max-age=60, stale-while-revalidate=300');
        return c.json({
            recordMap: {},
            blocks,
            renderMode: 'blocks',
        });
    } catch (error) {
        console.error('Failed to fetch private blocks', error);
        return c.json(
            {
                error: 'Content fetch failed',
                message: `Could not fetch private block content for post "${slug}"`,
            },
            502,
        );
    }
});

// Start server
const port = runtime.config.server.port;

console.log(`Blog Engine API running on http://localhost:${port}`);

export default {
    port,
    fetch: app.fetch,
};

function toApiPost(post: BlogPost & { notionUrl: string }): BlogPost {
    const { notionUrl: _, ...rest } = post;
    return rest;
}

async function runSync(source: 'cron' | 'manual' | 'hint'): Promise<{ synced: number; skipped: number; errors: number }> {
    if (syncService === null) {
        throw new Error('Sync service is not configured.');
    }

    syncInProgress = true;
    lastSyncStartedAt = Date.now();
    lastSyncSource = source;
    lastSyncError = null;

    try {
        const result = await syncService.syncNow();
        lastSyncResult = result;
        return result;
    } catch (error) {
        lastSyncError = error instanceof Error ? error.message : String(error);
        throw error;
    } finally {
        lastSyncFinishedAt = Date.now();
        syncInProgress = false;
    }
}

interface CounterState {
    windowStartAt: number;
    count: number;
}

function tryConsumeCounter(
    map: Map<string, CounterState>,
    key: string,
    windowMs: number,
    maxInWindow: number,
    now: number,
): { allowed: true } | { allowed: false; retryAfterMs: number } {
    if (key.length === 0) {
        return { allowed: true };
    }

    const current = map.get(key);
    if (!current || now - current.windowStartAt >= windowMs) {
        map.set(key, { windowStartAt: now, count: 1 });
        cleanupCounterMap(map, windowMs, now);
        return { allowed: true };
    }

    if (current.count >= maxInWindow) {
        return {
            allowed: false,
            retryAfterMs: Math.max(0, current.windowStartAt + windowMs - now),
        };
    }

    current.count += 1;
    map.set(key, current);
    return { allowed: true };
}

function cleanupCounterMap(map: Map<string, CounterState>, windowMs: number, now: number): void {
    if (map.size < 2000) {
        return;
    }

    for (const [key, value] of map.entries()) {
        if (now - value.windowStartAt >= windowMs * 2) {
            map.delete(key);
        }
    }
}

function getClientIp(c: { req: { header: (name: string) => string | undefined } }): string {
    const forwarded = c.req.header('x-forwarded-for');
    if (forwarded) {
        const first = forwarded.split(',')[0]?.trim();
        if (first) {
            return first;
        }
    }

    return (
        c.req.header('cf-connecting-ip') ||
        c.req.header('x-real-ip') ||
        c.req.header('x-client-ip') ||
        'unknown'
    );
}

function toIso(valueMs: number): string | null {
    if (!valueMs) {
        return null;
    }
    return new Date(valueMs).toISOString();
}

function parseCsv(input: string | undefined): string[] {
    if (!input) {
        return [];
    }
    return input
        .split(',')
        .map((value) => value.trim())
        .filter((value) => value.length > 0);
}

function parseBooleanEnv(input: string | undefined, fallback: boolean): boolean {
    if (typeof input !== 'string') {
        return fallback;
    }
    const value = input.trim().toLowerCase();
    if (value === 'true' || value === '1' || value === 'yes' || value === 'on') {
        return true;
    }
    if (value === 'false' || value === '0' || value === 'no' || value === 'off') {
        return false;
    }
    return fallback;
}

function parseIntEnv(input: string | undefined, fallback: number): number {
    if (!input) {
        return fallback;
    }
    const parsed = Number(input);
    if (!Number.isFinite(parsed) || parsed <= 0) {
        return fallback;
    }
    return Math.floor(parsed);
}

function assertSyncAuthorization(
    c: { req: { header: (name: string) => string | undefined }; json: (body: unknown, status?: number) => Response },
): Response | null {
    if (!syncAdminApiKeyEnabled) {
        return null;
    }

    if (!syncAdminApiKey) {
        return c.json(
            {
                error: 'Server misconfigured',
                message: 'SYNC_ADMIN_API_KEY_ENABLED=true but SYNC_ADMIN_API_KEY is missing.',
            },
            500,
        );
    }

    const provided = extractApiKey(c.req.header('x-api-key'), c.req.header('authorization'));
    if (!provided || provided !== syncAdminApiKey) {
        return c.json(
            {
                error: 'Unauthorized',
                message: 'Missing or invalid API key.',
            },
            401,
        );
    }
    return null;
}

function extractApiKey(directHeader: string | undefined, authHeader: string | undefined): string {
    if (directHeader?.trim()) {
        return directHeader.trim();
    }
    if (authHeader?.toLowerCase().startsWith('bearer ')) {
        return authHeader.slice(7).trim();
    }
    return '';
}
