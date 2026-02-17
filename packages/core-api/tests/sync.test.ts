import { describe, expect, test } from 'bun:test';

import { SyncService } from '../src/sync';

describe('sync service', () => {
    test('syncNow skips non-ready and private when publicOnly=true', async () => {
        const now = new Date().toISOString();
        const upserts: unknown[] = [];
        const recorded: unknown[] = [];

        const notion = {
            assertMinimumDatabaseSchema: async () => undefined,
            getDatabasePosts: async () => [
                {
                    id: '1',
                    notionPageId: '1',
                    title: 'Ready Public',
                    slug: 'ready-public',
                    summary: null,
                    author: null,
                    authorEmail: null,
                    authorAvatarUrl: null,
                    tags: [],
                    segment: null,
                    status: 'ready',
                    publishedAt: now,
                    bannerImageUrl: null,
                    readTimeMinutes: null,
                    featured: false,
                    relatedPostIds: [],
                    isPublic: true,
                    notionUrl: 'https://notion.so/1',
                    createdAt: now,
                    updatedAt: now,
                },
                {
                    id: '2',
                    notionPageId: '2',
                    title: 'Draft',
                    slug: 'draft',
                    summary: null,
                    author: null,
                    authorEmail: null,
                    authorAvatarUrl: null,
                    tags: [],
                    segment: null,
                    status: 'draft',
                    publishedAt: now,
                    bannerImageUrl: null,
                    readTimeMinutes: null,
                    featured: false,
                    relatedPostIds: [],
                    isPublic: true,
                    notionUrl: 'https://notion.so/2',
                    createdAt: now,
                    updatedAt: now,
                },
                {
                    id: '3',
                    notionPageId: '3',
                    title: 'Ready Private',
                    slug: 'ready-private',
                    summary: null,
                    author: null,
                    authorEmail: null,
                    authorAvatarUrl: null,
                    tags: [],
                    segment: null,
                    status: 'ready',
                    publishedAt: now,
                    bannerImageUrl: null,
                    readTimeMinutes: null,
                    featured: false,
                    relatedPostIds: [],
                    isPublic: false,
                    notionUrl: 'https://notion.so/3',
                    createdAt: now,
                    updatedAt: now,
                },
            ],
            estimateReadTime: async () => 5,
        };

        const db = {
            upsertPost: (post: unknown) => upserts.push(post),
            deletePostsNotInNotionIds: (_ids: string[]) => 0,
            recordSyncRun: (run: unknown) => recorded.push(run),
        };

        const service = new SyncService({
            notion: notion as any,
            db: db as any,
            config: {
                notion: {
                    integrationKey: 'test',
                },
                cron: {
                    syncInterval: '*/30 * * * *',
                    imageRefreshInterval: '0 * * * *',
                },
                sync: {
                    publicOnly: true,
                },
                database: {
                    path: './data/test.db',
                },
                server: {
                    port: 3000,
                },
                socials: {},
                site: {
                    homeHeader: 'Test',
                },
                packs: [{ name: 'blog', enabled: true, options: {} }],
            },
            notionDatabaseId: 'db',
        });

        const result = await service.syncNow();
        expect(result.synced).toBe(1);
        expect(result.skipped).toBe(2);
        expect(result.errors).toBe(0);
        expect(upserts.length).toBe(1);
        expect(recorded.length).toBe(1);
    });

    test('refreshImageUrls only syncs entries with banner URLs', async () => {
        const now = new Date().toISOString();
        const upserts: Array<{ slug: string }> = [];

        const notion = {
            assertMinimumDatabaseSchema: async () => undefined,
            getDatabasePosts: async () => [
                {
                    id: '1',
                    notionPageId: '1',
                    title: 'With Banner',
                    slug: 'with-banner',
                    summary: null,
                    author: null,
                    authorEmail: null,
                    authorAvatarUrl: null,
                    tags: [],
                    segment: null,
                    status: 'ready',
                    publishedAt: now,
                    bannerImageUrl: 'https://example.com/banner.png',
                    readTimeMinutes: 3,
                    featured: false,
                    relatedPostIds: [],
                    isPublic: true,
                    notionUrl: 'https://notion.so/1',
                    createdAt: now,
                    updatedAt: now,
                },
                {
                    id: '2',
                    notionPageId: '2',
                    title: 'No Banner',
                    slug: 'no-banner',
                    summary: null,
                    author: null,
                    authorEmail: null,
                    authorAvatarUrl: null,
                    tags: [],
                    segment: null,
                    status: 'ready',
                    publishedAt: now,
                    bannerImageUrl: null,
                    readTimeMinutes: 4,
                    featured: false,
                    relatedPostIds: [],
                    isPublic: true,
                    notionUrl: 'https://notion.so/2',
                    createdAt: now,
                    updatedAt: now,
                },
            ],
            estimateReadTime: async () => 99,
        };

        const db = {
            upsertPost: (post: { slug: string }) => upserts.push(post),
            deletePostsNotInNotionIds: (_ids: string[]) => 0,
            recordSyncRun: (_run: unknown) => undefined,
        };

        const service = new SyncService({
            notion: notion as any,
            db: db as any,
            config: {
                notion: {
                    integrationKey: 'test',
                },
                cron: {
                    syncInterval: '*/30 * * * *',
                    imageRefreshInterval: '0 * * * *',
                },
                sync: {
                    publicOnly: false,
                },
                database: {
                    path: './data/test.db',
                },
                server: {
                    port: 3000,
                },
                socials: {},
                site: {
                    homeHeader: 'Test',
                },
                packs: [{ name: 'blog', enabled: true, options: {} }],
            },
            notionDatabaseId: 'db',
        });

        const result = await service.refreshImageUrls();
        expect(result.synced).toBe(1);
        expect(result.skipped).toBe(1);
        expect(result.errors).toBe(0);
        expect(upserts.map((post) => post.slug)).toEqual(['with-banner']);
    });
});
