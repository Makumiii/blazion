import { Hono, type Context } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import { rateLimiter } from 'hono-rate-limiter';
import { Cron } from 'croner';
import { timingSafeEqual } from 'node:crypto';

import { loadRuntimeConfig } from './config';
import { DatabaseService } from './db';
import { NotionService } from './notion';
import { SyncService, type SyncResult } from './sync';
import { resolveRegisteredPacks, resolveUnknownPackNames } from './packs';

const runtime = await loadRuntimeConfig();
const app = new Hono();
const db = new DatabaseService(runtime.config.database.path);
db.migrate();

// Persist runtime-discovered pack bindings (e.g. env-provided NOTION_DATABASE_ID)
// so clean deployments become durable without requiring a separate setup command.
for (const [packName, notionDatabaseId] of Object.entries(runtime.notionDatabaseIds)) {
    if (!notionDatabaseId) {
        continue;
    }
    const existingBinding = db.getPackDatabaseId(packName);
    if (!existingBinding) {
        db.setPackDatabaseId(packName, notionDatabaseId);
        console.log(`[Bootstrap] Linked "${packName}" pack to Notion database from runtime config.`);
    }
}

const corsOrigins = parseCsv(process.env.CORS_ORIGINS);
const rateLimitEnabled = parseBooleanEnv(process.env.API_RATE_LIMIT_ENABLED, true);
const syncAdminApiKeyEnabled = parseBooleanEnv(
    process.env.SYNC_ADMIN_API_KEY_ENABLED,
    process.env.NODE_ENV === 'production',
);
const syncHintEnabled = parseBooleanEnv(
    process.env.SYNC_HINT_ENABLED,
    process.env.NODE_ENV !== 'production',
);
const syncAdminApiKey = process.env.SYNC_ADMIN_API_KEY?.trim() ?? '';
const defaultRateWindowMs = parseIntEnv(process.env.API_RATE_LIMIT_WINDOW_MS, 60_000);
const defaultRateLimit = parseIntEnv(process.env.API_RATE_LIMIT_MAX, 60);
const postsRateLimit = parseIntEnv(process.env.API_RATE_LIMIT_POSTS_MAX, 120);
const contentRateLimit = parseIntEnv(process.env.API_RATE_LIMIT_CONTENT_MAX, 30);
const syncRateLimit = parseIntEnv(process.env.API_RATE_LIMIT_SYNC_MAX, 2);
const imageUrlRefreshBufferSeconds = parseIntEnv(process.env.IMAGE_URL_REFRESH_BUFFER_SECONDS, 300);
const imageUrlRefreshCooldownSeconds = parseIntEnv(process.env.IMAGE_URL_REFRESH_COOLDOWN_SECONDS, 60);
const recommendationDefaultLimit = parseIntEnv(process.env.RECOMMENDATION_DEFAULT_LIMIT, 3);
const recommendationMaxLimit = parseIntEnv(process.env.RECOMMENDATION_MAX_LIMIT, 6);
const recommendationWeightRelated = parseIntEnv(process.env.RECOMMENDATION_WEIGHT_RELATED, 100);
const recommendationWeightTag = parseIntEnv(process.env.RECOMMENDATION_WEIGHT_TAG, 20);
const recommendationWeightSegment = parseIntEnv(process.env.RECOMMENDATION_WEIGHT_SEGMENT, 12);
const recommendationWeightFeatured = parseIntEnv(process.env.RECOMMENDATION_WEIGHT_FEATURED, 8);
const recommendationWeightRecency = parseIntEnv(process.env.RECOMMENDATION_WEIGHT_RECENCY, 6);
const recommendationRecencyWindowDays = parseIntEnv(process.env.RECOMMENDATION_RECENCY_WINDOW_DAYS, 30);

const notionService = runtime.notionConfigured
    ? new NotionService(runtime.config.notion.integrationKey)
    : null;

const enabledPackNames = runtime.enabledPacks;
const unknownPackNames = resolveUnknownPackNames(enabledPackNames);
const registeredPacks = resolveRegisteredPacks(enabledPackNames);
if (unknownPackNames.length > 0) {
    console.warn(`Unknown packs in config and skipped: ${unknownPackNames.join(', ')}`);
}

const activeSyncServices = new Map<string, SyncService>();
for (const pack of registeredPacks) {
    const service = pack.createSyncService({
        db,
        notionService,
        config: runtime.config,
        notionDatabaseId: runtime.notionDatabaseIds[pack.name] ?? null,
    });
    if (service !== null) {
        activeSyncServices.set(pack.name, service);
    }
}

if (enabledPackNames.length === 0) {
    console.warn('No packs are enabled. Set "packs" in blazion.config.ts.');
} else {
    console.log(`Enabled packs: ${enabledPackNames.join(', ')}`);
}

for (const pack of registeredPacks) {
    if (activeSyncServices.has(pack.name)) {
        continue; // Already has a bound database and API key
    }

    if (!notionService || !runtime.notionPageId || !pack.setup) {
        continue;
    }

    try {
        console.log(`[Auto-Init] Checking for existing Notion database for pack: ${pack.name}...`);
        const existingDbId = await notionService.findCompatibleDatabaseInPage(runtime.notionPageId);

        let boundDbId: string;
        if (existingDbId) {
            console.log(`[Auto-Init] Found existing compatible Notion database for pack: ${pack.name}`);
            boundDbId = existingDbId;
        } else {
            console.log(`[Auto-Init] No compatible database found. Creating new Notion database for pack: ${pack.name}...`);
            boundDbId = await pack.setup.createDatabase({
                client: (notionService as any).client,
                pageId: runtime.notionPageId,
            });
            console.log(`[Auto-Init] Successfully created new Notion database for pack: ${pack.name}`);
        }

        db.setPackDatabaseId(pack.name, boundDbId);

        const service = pack.createSyncService({
            db,
            notionService,
            config: runtime.config,
            notionDatabaseId: boundDbId,
        });

        if (service !== null) {
            activeSyncServices.set(pack.name, service);
        }
    } catch (error) {
        console.error(`[Auto-Init] Failed to initialize Notion database for pack: ${pack.name}`, error);
    }
}

if (activeSyncServices.size === 0) {
    console.warn('No enabled pack has sync active (likely missing Notion credentials for current packs).');
} else {
    console.log(`Sync-active packs: ${Array.from(activeSyncServices.keys()).join(', ')}`);
}

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
let lastSyncResult: SyncResult | null = null;
let lastSyncPackResults: Record<string, SyncResult> = {};
let lastSyncError: string | null = null;
let imageRefreshInProgress = false;
let lastImageRefreshStartedAt = 0;
let lastImageRefreshFinishedAt = 0;
let lastImageRefreshSource: 'none' | 'cron' | 'manual' | 'request' = 'none';
let lastImageRefreshResult: SyncResult | null = null;
let lastImageRefreshPackResults: Record<string, SyncResult> = {};
let lastImageRefreshError: string | null = null;

const ipMinuteCounter = new Map<string, CounterState>();
const ipHourCounter = new Map<string, CounterState>();
const sessionMinuteCounter = new Map<string, CounterState>();

if (activeSyncServices.size > 0) {
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
            const result = await runImageRefresh('cron');
            console.log('Cron: image refresh run completed', result);
        } catch (error) {
            console.error('Cron: image refresh run failed', error);
        }
    });
    console.log(`Cron: image refresh job scheduled (${runtime.config.cron.imageRefreshInterval})`);
}

app.use('*', logger());
app.use('*', async (c, next) => {
    c.header('X-Content-Type-Options', 'nosniff');
    c.header('Referrer-Policy', 'strict-origin-when-cross-origin');
    c.header('X-Frame-Options', 'DENY');
    c.header('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
    await next();
});
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
        '/api/blog/posts',
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
        '/api/blog/posts/:slug/content',
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

app.get('/api/health', (c) => {
    return c.json({
        status: 'ok',
        database: db.isConnected() ? 'connected' : 'disconnected',
        notionConfigured: runtime.notionConfigured,
        enabledPacks: enabledPackNames,
        syncEnabledPacks: Array.from(activeSyncServices.keys()),
        timestamp: new Date().toISOString(),
    });
});

app.get('/api/site', (c) => {
    c.header('Cache-Control', 'public, max-age=300, stale-while-revalidate=900');
    return c.json({
        data: {
            socials: runtime.config.socials,
            share: runtime.config.share,
            site: runtime.config.site,
        },
    });
});

app.post('/api/sync/images', async (c) => {
    const authError = assertSyncAuthorization(c);
    if (authError) {
        return authError;
    }

    const pack = c.req.query('pack');
    const packError = assertPackAvailable(c, pack);
    if (packError) {
        return packError;
    }

    if (activeSyncServices.size === 0) {
        return c.json(
            {
                error: 'Not configured',
                message:
                    'No enabled pack has sync configured. Ensure a supported pack is enabled, NOTION_API_KEY is set, and setup has linked the pack database.',
            },
            503,
        );
    }

    try {
        const result = await runImageRefresh('manual', pack);
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

    const pack = c.req.query('pack');
    const packError = assertPackAvailable(c, pack);
    if (packError) {
        return packError;
    }

    if (activeSyncServices.size === 0) {
        return c.json(
            {
                error: 'Not configured',
                message:
                    'No enabled pack has sync configured. Ensure a supported pack is enabled, NOTION_API_KEY is set, and setup has linked the pack database.',
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
        const result = await runSync('manual', pack);
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
    if (!syncHintEnabled) {
        return c.json(
            {
                status: 'disabled',
                message: 'Sync hint endpoint is disabled.',
            },
            403,
        );
    }

    if (activeSyncServices.size === 0) {
        return c.json(
            {
                error: 'Not configured',
                message:
                    'No enabled pack has sync configured. Ensure a supported pack is enabled, NOTION_API_KEY is set, and setup has linked the pack database.',
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
        lastSyncPackResults,
        lastSyncError,
        imageRefreshInProgress,
        lastImageRefreshStartedAt: toIso(lastImageRefreshStartedAt),
        lastImageRefreshFinishedAt: toIso(lastImageRefreshFinishedAt),
        lastImageRefreshSource,
        lastImageRefreshResult,
        lastImageRefreshPackResults,
        lastImageRefreshError,
        imageUrlRefreshBufferSeconds,
        imageUrlRefreshCooldownSeconds,
        syncHintEnabled,
        enabledPacks: enabledPackNames,
        syncEnabledPacks: Array.from(activeSyncServices.keys()),
        nextHintAllowedAt: toIso(nextAllowedAtMs),
        hintCooldownRemainingMs: Math.max(0, nextAllowedAtMs - now),
    });
});

const blogRouteOptions = {
    imageUrlRefreshBufferSeconds,
    recommendationDefaultLimit,
    recommendationMaxLimit,
    recommendationWeightRelated,
    recommendationWeightTag,
    recommendationWeightSegment,
    recommendationWeightFeatured,
    recommendationWeightRecency,
    recommendationRecencyWindowDays,
};

for (const pack of registeredPacks) {
    pack.registerApiRoutes(app, {
        db,
        notionService,
        syncService: activeSyncServices.get(pack.name) ?? null,
        blogRouteOptions,
        runImageRefresh,
    });
}

const port = runtime.config.server.port;
console.log(`Blazion API running on http://localhost:${port}`);

export default {
    port,
    fetch: app.fetch,
};

async function runSync(source: 'cron' | 'manual' | 'hint', packName?: string): Promise<SyncResult> {
    const targets = getSyncTargets(packName);
    if (targets.length === 0) {
        throw new Error('No sync-capable packs available for this request.');
    }

    syncInProgress = true;
    lastSyncStartedAt = Date.now();
    lastSyncSource = source;
    lastSyncError = null;

    try {
        const packResults = await runSyncTargets(targets, (service) => service.syncNow());
        lastSyncPackResults = packResults;
        const aggregated = aggregateSyncResults(packResults);
        lastSyncResult = aggregated;
        return aggregated;
    } catch (error) {
        lastSyncError = error instanceof Error ? error.message : String(error);
        throw error;
    } finally {
        lastSyncFinishedAt = Date.now();
        syncInProgress = false;
    }
}

async function runImageRefresh(
    source: 'cron' | 'manual' | 'request',
    packName?: string,
): Promise<SyncResult> {
    const targets = getSyncTargets(packName);
    if (targets.length === 0) {
        throw new Error('No sync-capable packs available for this request.');
    }

    const now = Date.now();
    if (source === 'request') {
        const cooldownMs = imageUrlRefreshCooldownSeconds * 1000;
        if (lastImageRefreshStartedAt !== 0 && now - lastImageRefreshStartedAt < cooldownMs) {
            return lastImageRefreshResult ?? { synced: 0, skipped: 0, errors: 0, removed: 0 };
        }
    }

    if (imageRefreshInProgress) {
        return lastImageRefreshResult ?? { synced: 0, skipped: 0, errors: 0, removed: 0 };
    }

    imageRefreshInProgress = true;
    lastImageRefreshStartedAt = now;
    lastImageRefreshSource = source;
    lastImageRefreshError = null;

    try {
        const packResults = await runSyncTargets(targets, (service) => service.refreshImageUrls());
        lastImageRefreshPackResults = packResults;
        const aggregated = aggregateSyncResults(packResults);
        lastImageRefreshResult = aggregated;
        return aggregated;
    } catch (error) {
        lastImageRefreshError = error instanceof Error ? error.message : String(error);
        throw error;
    } finally {
        lastImageRefreshFinishedAt = Date.now();
        imageRefreshInProgress = false;
    }
}

function getSyncTargets(packName?: string): Array<[string, SyncService]> {
    if (packName && packName.trim().length > 0) {
        const target = activeSyncServices.get(packName);
        return target ? [[packName, target]] : [];
    }
    return Array.from(activeSyncServices.entries());
}

async function runSyncTargets(
    targets: Array<[string, SyncService]>,
    runner: (service: SyncService) => Promise<SyncResult>,
): Promise<Record<string, SyncResult>> {
    const results: Record<string, SyncResult> = {};
    for (const [packName, service] of targets) {
        results[packName] = await runner(service);
    }
    return results;
}

function aggregateSyncResults(results: Record<string, SyncResult>): SyncResult {
    let synced = 0;
    let skipped = 0;
    let errors = 0;
    let removed = 0;

    for (const result of Object.values(results)) {
        synced += result.synced;
        skipped += result.skipped;
        errors += result.errors;
        removed += result.removed;
    }

    return { synced, skipped, errors, removed };
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

function assertPackAvailable(
    c: Context,
    packName: string | undefined,
): Response | null {
    if (!packName || packName.trim().length === 0) {
        return null;
    }
    if (activeSyncServices.has(packName)) {
        return null;
    }
    return c.json(
        {
            error: 'Pack not available',
            message: `Pack "${packName}" is not enabled or not sync-capable in this deployment.`,
            available: Array.from(activeSyncServices.keys()),
        },
        400,
    );
}

function assertSyncAuthorization(
    c: Context,
): Response | null {
    if (!syncAdminApiKeyEnabled) {
        return null;
    }

    if (!syncAdminApiKey) {
        return c.json(
            {
                error: 'Unauthorized',
                message: 'SYNC_ADMIN_API_KEY is required when sync key protection is enabled.',
            },
            401,
        );
    }

    const provided =
        c.req.header('x-api-key') ||
        c.req.header('authorization')?.replace(/^Bearer\s+/i, '').trim() ||
        '';

    if (!provided || !constantTimeEqual(provided, syncAdminApiKey)) {
        return c.json(
            {
                error: 'Unauthorized',
                message: 'Missing or invalid API key for sync endpoints.',
            },
            401,
        );
    }

    return null;
}

function constantTimeEqual(a: string, b: string): boolean {
    const aBuffer = Buffer.from(a);
    const bBuffer = Buffer.from(b);
    if (aBuffer.length !== bBuffer.length) {
        return false;
    }
    return timingSafeEqual(aBuffer, bBuffer);
}
