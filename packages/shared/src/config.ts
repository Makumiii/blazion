import { z } from 'zod';

export const blogEngineConfigSchema = z.object({
    notion: z.object({
        integrationKey: z.string().min(1),
        databaseId: z.string().min(1),
    }),
    cron: z.object({
        syncInterval: z.string().min(1),
        imageRefreshInterval: z.string().min(1),
    }),
    sync: z.object({
        publicOnly: z.boolean(),
    }),
    database: z.object({
        path: z.string().min(1),
    }),
    server: z.object({
        port: z.number().int().min(1).max(65535),
    }),
});

export type BlogEngineConfig = z.infer<typeof blogEngineConfigSchema>;

export interface BlogEngineConfigInput {
    notion: BlogEngineConfig['notion'];
    cron?: Partial<BlogEngineConfig['cron']>;
    sync?: Partial<BlogEngineConfig['sync']>;
    database?: Partial<BlogEngineConfig['database']>;
    server?: Partial<BlogEngineConfig['server']>;
}

export const defaultBlogEngineConfig: Omit<BlogEngineConfig, 'notion'> = {
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
        port: 3000,
    },
};

export function defineConfig(config: BlogEngineConfigInput): BlogEngineConfig {
    const merged: BlogEngineConfig = {
        notion: config.notion,
        cron: {
            ...defaultBlogEngineConfig.cron,
            ...config.cron,
        },
        sync: {
            ...defaultBlogEngineConfig.sync,
            ...config.sync,
        },
        database: {
            ...defaultBlogEngineConfig.database,
            ...config.database,
        },
        server: {
            ...defaultBlogEngineConfig.server,
            ...config.server,
        },
    };

    return blogEngineConfigSchema.parse(merged);
}
