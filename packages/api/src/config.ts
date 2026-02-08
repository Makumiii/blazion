import { defineConfig, type BlogEngineConfig } from '@blog-engine/shared';

export interface RuntimeConfig {
    config: BlogEngineConfig;
    notionConfigured: boolean;
}

export function loadRuntimeConfig(): RuntimeConfig {
    const notionIntegrationKey = process.env.NOTION_API_KEY ?? '';
    const notionDatabaseId = process.env.NOTION_DATABASE_ID ?? '';

    const config = defineConfig({
        notion: {
            integrationKey: notionIntegrationKey || 'missing',
            databaseId: notionDatabaseId || 'missing',
        },
        cron: {
            syncInterval: process.env.SYNC_INTERVAL ?? '*/30 * * * *',
            imageRefreshInterval: process.env.IMAGE_REFRESH_INTERVAL ?? '0 * * * *',
        },
        sync: {
            publicOnly: (process.env.SYNC_PUBLIC_ONLY ?? 'true') !== 'false',
        },
        database: {
            path: process.env.DATABASE_PATH ?? './data/blog.db',
        },
        server: {
            port: Number(process.env.PORT ?? 3000),
        },
    });

    return {
        config,
        notionConfigured: Boolean(notionIntegrationKey && notionDatabaseId),
    };
}
