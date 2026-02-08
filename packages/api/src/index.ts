import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';

const app = new Hono();

// Middleware
app.use('*', logger());
app.use('*', cors());

// Health check endpoint
app.get('/api/health', (c) => {
    return c.json({
        status: 'ok',
        timestamp: new Date().toISOString(),
    });
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
const port = process.env.PORT ? parseInt(process.env.PORT) : 3000;

console.log(`🚀 Blog Engine API running on http://localhost:${port}`);

export default {
    port,
    fetch: app.fetch,
};
