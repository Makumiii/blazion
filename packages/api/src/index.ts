import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';

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
    return c.json({
        data: [],
        pagination: {
            page: 1,
            limit: 10,
            total: 0,
            totalPages: 0,
        },
    });
});

app.get('/api/posts/:slug', (c) => {
    const slug = c.req.param('slug');
    return c.json({
        error: 'Not implemented',
        message: `Post with slug "${slug}" not found`,
    }, 404);
});

app.get('/api/posts/:slug/content', (c) => {
    const slug = c.req.param('slug');
    return c.json({
        error: 'Not implemented',
        message: `Content for post "${slug}" not found`,
    }, 404);
});

// Start server
const port = runtime.config.server.port;

console.log(`Blog Engine API running on http://localhost:${port}`);

export default {
    port,
    fetch: app.fetch,
};
