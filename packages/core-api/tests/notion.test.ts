import { describe, expect, test } from 'bun:test';

import { NotionService } from '../src/notion';

describe('notion service', () => {
    test('assertMinimumDatabaseSchema passes for valid schema', async () => {
        const service = new NotionService('test');
        let attempts = 0;

        (service as any).client = {
            databases: {
                retrieve: async () => {
                    attempts += 1;
                    return {
                        object: 'database',
                        properties: {
                            Title: { type: 'title' },
                            Slug: { type: 'rich_text' },
                            Status: {
                                type: 'select',
                                select: {
                                    options: [
                                        { name: 'draft' },
                                        { name: 'pending' },
                                        { name: 'ready' },
                                    ],
                                },
                            },
                        },
                    };
                },
            },
        };

        await expect(service.assertMinimumDatabaseSchema('db')).resolves.toBeUndefined();
        expect(attempts).toBe(1);
    });

    test('assertMinimumDatabaseSchema fails for missing required fields', async () => {
        const service = new NotionService('test');
        (service as any).client = {
            databases: {
                retrieve: async () => ({
                    object: 'database',
                    properties: {
                        Title: { type: 'title' },
                    },
                }),
            },
        };

        await expect(service.assertMinimumDatabaseSchema('db')).rejects.toThrow(
            'Notion database schema does not match minimum viable shape',
        );
    });

    test('withRetry retries retryable errors and then succeeds', async () => {
        const service = new NotionService('test');
        let attempts = 0;

        (service as any).client = {
            databases: {
                retrieve: async () => {
                    attempts += 1;
                    if (attempts === 1) {
                        throw { status: 429 };
                    }
                    return {
                        object: 'database',
                        properties: {
                            Title: { type: 'title' },
                            Slug: { type: 'rich_text' },
                            Status: {
                                type: 'select',
                                select: {
                                    options: [
                                        { name: 'draft' },
                                        { name: 'pending' },
                                        { name: 'ready' },
                                    ],
                                },
                            },
                        },
                    };
                },
            },
        };

        await expect(service.assertMinimumDatabaseSchema('db')).resolves.toBeUndefined();
        expect(attempts).toBe(2);
    });

    test('getDatabasePosts maps notion properties and filters invalid rows', async () => {
        const service = new NotionService('test');
        (service as any).client = {
            databases: {
                query: async () => ({
                    results: [
                        {
                            object: 'page',
                            id: 'post-1',
                            url: 'https://notion.so/post-1',
                            public_url: null,
                            created_time: '2026-02-01T00:00:00.000Z',
                            last_edited_time: '2026-02-02T00:00:00.000Z',
                            properties: {
                                Title: { type: 'title', title: [{ plain_text: 'Hello World' }] },
                                Slug: { type: 'rich_text', rich_text: [{ plain_text: '' }] },
                                Summary: { type: 'rich_text', rich_text: [{ plain_text: 'Summary text' }] },
                                Author: {
                                    type: 'people',
                                    people: [
                                        {
                                            name: 'Jane',
                                            person: { email: 'jane@example.com' },
                                            avatar_url: null,
                                        },
                                    ],
                                },
                                Tags: {
                                    type: 'multi_select',
                                    multi_select: [{ name: 'AI' }, { name: 'ai' }],
                                },
                                Segment: { type: 'select', select: { name: 'engineering' } },
                                Status: { type: 'select', select: { name: 'ready' } },
                                Published: { type: 'date', date: { start: '2026-02-02' } },
                                Banner: {
                                    type: 'files',
                                    files: [{ type: 'external', external: { url: 'https://img.test/banner.png' } }],
                                },
                                Featured: { type: 'checkbox', checkbox: true },
                                'Related Posts': {
                                    type: 'relation',
                                    relation: [{ id: 'post-2' }],
                                },
                            },
                        },
                        {
                            object: 'page',
                            id: 'post-ignored',
                            url: 'https://notion.so/post-ignored',
                            public_url: null,
                            created_time: '2026-02-01T00:00:00.000Z',
                            last_edited_time: '2026-02-02T00:00:00.000Z',
                            properties: {
                                Title: { type: 'title', title: [] },
                                Slug: { type: 'rich_text', rich_text: [] },
                            },
                        },
                    ],
                    has_more: false,
                    next_cursor: null,
                }),
            },
        };

        const posts = await service.getDatabasePosts('db');
        expect(posts.length).toBe(1);
        expect(posts[0]?.slug).toBe('hello-world');
        expect(posts[0]?.tags).toEqual(['AI']);
        expect(posts[0]?.segment).toBe('engineering');
        expect(posts[0]?.featured).toBe(true);
        expect(posts[0]?.relatedPostIds).toEqual(['post-2']);
        expect(posts[0]?.authorEmail).toBe('jane@example.com');
        expect(typeof posts[0]?.authorAvatarUrl).toBe('string');
        expect(posts[0]?.authorAvatarUrl?.includes('gravatar.com/avatar/')).toBe(true);
    });

    test('getBlockContent paginates children list', async () => {
        const service = new NotionService('test');
        let call = 0;
        (service as any).client = {
            blocks: {
                children: {
                    list: async () => {
                        call += 1;
                        if (call === 1) {
                            return {
                                results: [{ id: 'b1' }],
                                has_more: true,
                                next_cursor: 'next',
                            };
                        }
                        return {
                            results: [{ id: 'b2' }],
                            has_more: false,
                            next_cursor: null,
                        };
                    },
                },
            },
        };

        const blocks = await service.getBlockContent('page-1');
        expect(blocks).toHaveLength(2);
    });

    test('estimateReadTime uses recordMap for public pages and falls back to blocks', async () => {
        const service = new NotionService('test');
        (service as any).notionApi = {
            getPage: async () => ({
                block: {
                    one: {
                        value: {
                            properties: {
                                title: [['This is a long enough sentence for read time calculation']],
                            },
                        },
                    },
                },
            }),
        };
        (service as any).client = {
            blocks: {
                children: {
                    list: async () => ({
                        results: [
                            {
                                type: 'paragraph',
                                paragraph: {
                                    rich_text: [{ plain_text: 'Fallback block text content' }],
                                },
                            },
                        ],
                        has_more: false,
                        next_cursor: null,
                    }),
                },
            },
        };

        const publicReadTime = await service.estimateReadTime('public-page', true);
        expect(publicReadTime).toBeGreaterThan(0);

        (service as any).notionApi = {
            getPage: async () => {
                throw new Error('record map unavailable');
            },
        };
        const fallbackReadTime = await service.estimateReadTime('private-page', true);
        expect(fallbackReadTime).toBeGreaterThan(0);
    });

    test('non-retryable errors are not retried repeatedly', async () => {
        const service = new NotionService('test');
        let attempts = 0;
        (service as any).client = {
            databases: {
                retrieve: async () => {
                    attempts += 1;
                    throw { status: 400 };
                },
            },
        };

        await expect(service.assertMinimumDatabaseSchema('db')).rejects.toBeDefined();
        expect(attempts).toBe(1);
    });
});

