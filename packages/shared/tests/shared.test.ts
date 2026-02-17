import { describe, expect, test } from 'bun:test';

import {
    defineApiPackManifest,
    defineConfig,
    defineSetupPackManifest,
    defineSyncPackManifest,
    defineWebPackManifest,
    formatDate,
    normalizeTags,
    normalizePackConfig,
    resolveEnabledPackNames,
    slugify,
    validatePost,
} from '../src';

describe('shared package', () => {
    test('validatePost throws for an empty title', () => {
        expect(() =>
            validatePost({
                id: 'post_1',
                notionPageId: 'page_1',
                title: '',
                slug: 'hello-world',
                summary: null,
                author: null,
                tags: [],
                segment: null,
                status: 'ready',
                publishedAt: null,
                bannerImageUrl: null,
                featured: false,
                relatedPostIds: [],
                isPublic: true,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
            }),
        ).toThrow();
    });

    test('defineConfig applies defaults', () => {
        const config = defineConfig({
            notion: {
                integrationKey: 'test-key',
            },
        });

        expect(config.sync.publicOnly).toBe(true);
        expect(config.server.port).toBe(3000);
        expect(config.database.path).toBe('./data/blog.db');
        expect(config.socials).toEqual({});
        expect(config.packs).toEqual([
            {
                name: 'blog',
                enabled: true,
                options: {},
            },
        ]);
    });

    test('defineConfig allows explicit pack list and resolves enabled names', () => {
        const config = defineConfig({
            notion: {
                integrationKey: 'test-key',
            },
            packs: [
                { name: 'blog', enabled: true },
                { name: 'docs', enabled: false },
            ],
        });

        expect(resolveEnabledPackNames(config.packs)).toEqual(['blog']);
    });

    test('defineConfig rejects duplicate packs', () => {
        expect(() =>
            defineConfig({
                notion: {
                    integrationKey: 'test-key',
                },
                packs: [{ name: 'blog' }, { name: 'blog' }],
            }),
        ).toThrow('Duplicate pack entry "blog"');
    });

    test('slugify and formatDate produce stable values', () => {
        expect(slugify(' Hello, Notion Blog! ')).toBe('hello-notion-blog');
        expect(formatDate('2026-01-15T00:00:00.000Z', 'en-US')).toBe('Jan 15, 2026');
    });

    test('normalizeTags removes duplicates and empty values', () => {
        expect(normalizeTags([' Tech ', 'tech', 'Design', '', 'Design'])).toEqual([
            'Tech',
            'Design',
        ]);
    });

    test('normalizePackConfig accepts string shorthand', () => {
        expect(normalizePackConfig('blog')).toEqual({
            name: 'blog',
            enabled: true,
            options: {},
        });
    });

    test('defineApiPackManifest enforces manifest shape and marks api capability', () => {
        const manifest = defineApiPackManifest({
            name: 'blog',
            version: '1.0.0',
            description: 'Blog API pack',
            registerApiRoutes: () => {},
        });

        expect(manifest.capabilities?.api).toBe(true);
    });

    test('defineSyncPackManifest marks sync capability and keeps explicit flags', () => {
        const manifest = defineSyncPackManifest({
            name: 'blog',
            version: '1.0.0',
            description: 'Blog sync pack',
            capabilities: {
                search: true,
            },
            runSync: async () => ({
                synced: 0,
                skipped: 0,
                errors: 0,
                removed: 0,
            }),
        });

        expect(manifest.capabilities?.sync).toBe(true);
        expect(manifest.capabilities?.search).toBe(true);
    });

    test('defineSetupPackManifest rejects invalid semver', () => {
        expect(() =>
            defineSetupPackManifest({
                name: 'blog',
                version: '1',
                description: 'Blog setup',
                runSetup: async () => {},
            }),
        ).toThrow('Version must be valid semver');
    });

    test('defineWebPackManifest validates navigation items', () => {
        expect(() =>
            defineWebPackManifest({
                name: 'blog',
                version: '1.0.0',
                description: 'Blog web',
                registerWebRoutes: () => {},
                navigation: [{ label: '', href: '/posts' }],
            }),
        ).toThrow();
    });
});
