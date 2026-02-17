import { z } from 'zod';
import { normalizePackConfig, packConfigSchema, type PackConfig, type PackConfigInput } from './packs';

export const socialLinksSchema = z.object({
    linkedin: z.string().url().optional(),
    x: z.string().url().optional(),
    instagram: z.string().url().optional(),
    linktree: z.string().url().optional(),
    linkedtree: z.string().url().optional(),
    email: z.string().email().optional(),
    phonenumber: z.string().min(3).optional(),
    facebook: z.string().url().optional(),
    github: z.string().url().optional(),
});

export const blogEngineConfigSchema = z.object({
    notion: z.object({
        integrationKey: z.string().min(1),
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
    socials: socialLinksSchema,
    site: z.object({
        homeHeader: z.string().min(1),
    }),
    packs: z.array(packConfigSchema).min(1),
});

export type BlogEngineConfig = z.infer<typeof blogEngineConfigSchema>;

export interface BlogEngineConfigInput {
    notion: BlogEngineConfig['notion'];
    cron?: Partial<BlogEngineConfig['cron']>;
    sync?: Partial<BlogEngineConfig['sync']>;
    database?: Partial<BlogEngineConfig['database']>;
    server?: Partial<BlogEngineConfig['server']>;
    socials?: Partial<BlogEngineConfig['socials']>;
    site?: Partial<BlogEngineConfig['site']>;
    packs?: PackConfigInput[];
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
    socials: {},
    site: {
        homeHeader: 'Stories from your Notion publication',
    },
    packs: [
        {
            name: 'blog',
            enabled: true,
            options: {},
        },
    ],
};

export function defineConfig(config: BlogEngineConfigInput): BlogEngineConfig {
    const resolvedPacks = resolvePackConfig(config.packs ?? defaultBlogEngineConfig.packs);
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
        socials: {
            ...defaultBlogEngineConfig.socials,
            ...config.socials,
        },
        site: {
            ...defaultBlogEngineConfig.site,
            ...config.site,
        },
        packs: resolvedPacks,
    };

    return blogEngineConfigSchema.parse(merged);
}

function resolvePackConfig(input: PackConfigInput[]): PackConfig[] {
    const normalized = input.map((pack) => normalizePackConfig(pack));
    const seen = new Set<string>();
    for (const pack of normalized) {
        if (seen.has(pack.name)) {
            throw new Error(`Duplicate pack entry "${pack.name}" in configuration.`);
        }
        seen.add(pack.name);
    }
    return normalized;
}
