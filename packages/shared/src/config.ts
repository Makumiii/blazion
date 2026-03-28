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

export const shareProviderSchema = z.enum([
    'x',
    'whatsapp',
    'facebook',
    'linkedin',
    'instagram',
    'telegram',
    'reddit',
    'email',
]);

export const siteSeoRobotsSchema = z.object({
    index: z.boolean(),
    follow: z.boolean(),
});

export type SiteSeoRobotsConfig = z.infer<typeof siteSeoRobotsSchema>;

export const siteSeoSchema = z.object({
    description: z.string().min(1),
    locale: z.string().min(2),
    keywords: z.array(z.string().min(1)),
    defaultOgImage: z.string().url().optional(),
    twitterHandle: z.string().min(1).optional(),
    robots: siteSeoRobotsSchema,
});

export type SiteSeoConfig = z.infer<typeof siteSeoSchema>;

export interface SiteSeoConfigInput {
    description?: string;
    locale?: string;
    keywords?: string[];
    defaultOgImage?: string;
    twitterHandle?: string;
    robots?: Partial<SiteSeoRobotsConfig>;
}

export const siteConfigSchema = z.object({
    name: z.string().min(1),
    homeHeader: z.string().min(1),
    seo: siteSeoSchema,
});

export type SiteConfig = z.infer<typeof siteConfigSchema>;

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
    share: z.object({
        providers: z.array(shareProviderSchema),
    }),
    site: siteConfigSchema,
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
    share?: Partial<BlogEngineConfig['share']>;
    site?: {
        name?: string;
        homeHeader?: string;
        seo?: SiteSeoConfigInput;
    };
    packs?: PackConfigInput[];
}

export const defaultSiteSeoConfig: SiteSeoConfig = {
    description: 'Articles, essays, and updates from this publication.',
    locale: 'en_US',
    keywords: [],
    robots: {
        index: true,
        follow: true,
    },
};

function normalizeTwitterHandle(value: string | undefined): string | undefined {
    const trimmed = value?.trim();
    if (!trimmed) {
        return undefined;
    }
    return trimmed.startsWith('@') ? trimmed : `@${trimmed}`;
}

export function defineSiteSeo(config: SiteSeoConfigInput = {}): SiteSeoConfig {
    return siteSeoSchema.parse({
        ...defaultSiteSeoConfig,
        ...config,
        keywords: config.keywords ?? defaultSiteSeoConfig.keywords,
        twitterHandle: normalizeTwitterHandle(config.twitterHandle),
        robots: {
            ...defaultSiteSeoConfig.robots,
            ...config.robots,
        },
    });
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
    share: {
        providers: ['x', 'whatsapp', 'facebook', 'linkedin'],
    },
    site: {
        name: 'Stories from your Notion publication',
        homeHeader: 'Stories from your Notion publication',
        seo: defaultSiteSeoConfig,
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
        share: {
            ...defaultBlogEngineConfig.share,
            ...config.share,
        },
        site: (() => {
            const homeHeader =
                config.site?.homeHeader?.trim() ||
                defaultBlogEngineConfig.site.homeHeader;
            const name =
                config.site?.name?.trim() ||
                homeHeader;

            return {
                name,
                homeHeader,
                seo: defineSiteSeo(config.site?.seo),
            };
        })(),
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
