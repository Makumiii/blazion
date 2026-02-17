import { describe, expect, test } from 'bun:test';

import {
    defineConfig,
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
                databaseId: 'db-id',
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
                databaseId: 'db-id',
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
                    databaseId: 'db-id',
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
});
