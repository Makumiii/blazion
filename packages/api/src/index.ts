import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import { Cron } from 'croner';
import { postsQuerySchema } from '@blog-engine/shared';
import type { BlogPost } from '@blog-engine/shared';

import { loadRuntimeConfig } from './config';
import { DatabaseService } from './db';
import { NotionService } from './notion';
import { SyncService } from './sync';

const runtime = loadRuntimeConfig();
const app = new Hono();
const db = new DatabaseService(runtime.config.database.path);
db.migrate();

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

if (syncService !== null) {
    new Cron(runtime.config.cron.syncInterval, async () => {
        try {
            const result = await syncService.syncNow();
            console.log('Cron: sync run completed', result);
        } catch (error) {
            console.error('Cron: sync run failed', error);
        }
    });
    console.log(`Cron: sync job scheduled (${runtime.config.cron.syncInterval})`);

    new Cron(runtime.config.cron.imageRefreshInterval, async () => {
        try {
            const result = await syncService.syncNow();
            console.log('Cron: image refresh run completed', result);
        } catch (error) {
            console.error('Cron: image refresh run failed', error);
        }
    });
    console.log(`Cron: image refresh job scheduled (${runtime.config.cron.imageRefreshInterval})`);
}

// Middleware
app.use('*', logger());
app.use('*', cors());

// Health check endpoint
app.get('/api/health', (c) => {
    return c.json({
        status: 'ok',
        database: db.isConnected() ? 'connected' : 'disconnected',
        notionConfigured: runtime.notionConfigured,
        timestamp: new Date().toISOString(),
    });
});

app.post('/api/sync', async (c) => {
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
        const result = await syncService.syncNow();
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

    return c.json({
        recordMap: {},
        renderMode: 'blocks',
    });
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
