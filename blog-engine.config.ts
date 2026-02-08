import { defineConfig } from '@blog-engine/shared';

export default defineConfig({
    notion: {
        integrationKey: process.env.NOTION_API_KEY ?? 'missing',
        databaseId: process.env.NOTION_DATABASE_ID ?? 'missing',
    },
    cron: {
        syncInterval: '*/30 * * * *',
        imageRefreshInterval: '0 * * * *',
    },
    sync: {
        publicOnly: true,
    },
    database: {
        path: './data/blog.db',
    },
    server: {
        port: Number(process.env.PORT ?? 3000),
    },
});
