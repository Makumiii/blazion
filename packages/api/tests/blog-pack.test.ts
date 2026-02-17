import { describe, expect, test } from 'bun:test';

import { createBlogPackApi, type BlogPackRouteOptions } from '../src/packs/blog';
import type { StoredPost } from '../src/db';

const defaultOptions: BlogPackRouteOptions = {
    imageUrlRefreshBufferSeconds: 300,
    recommendationDefaultLimit: 3,
    recommendationMaxLimit: 6,
    recommendationWeightRelated: 100,
    recommendationWeightTag: 20,
    recommendationWeightSegment: 12,
    recommendationWeightFeatured: 8,
    recommendationWeightRecency: 6,
    recommendationRecencyWindowDays: 30,
};

describe('blog pack api', () => {
    test('returns 400 for invalid posts query', async () => {
        const api = createApiWithPosts([makePost('root')]);
        const response = await api.fetch(
            new Request('http://localhost/posts?page=0&limit=999&sort=invalid'),
        );
        expect(response.status).toBe(400);
    });

    test('supports date normalization and search-index limit clamping', async () => {
        const posts = [makePost('a'), makePost('b'), makePost('c')];
        const api = createApiWithPosts(posts);

        const postsResponse = await api.fetch(
            new Request('http://localhost/posts?dateFrom=2026-01-01&dateTo=2026-01-31'),
        );
        expect(postsResponse.status).toBe(200);

        const indexResponse = await api.fetch(new Request('http://localhost/search-index?limit=5000'));
        expect(indexResponse.status).toBe(200);
        const indexPayload = (await indexResponse.json()) as { data: unknown[] };
        expect(indexPayload.data.length).toBe(3);
    });

    test('recommendations prefer related_ids strategy when relation exists', async () => {
        const root = makePost('root', {
            relatedPostIds: ['rel-1'],
        });
        const related = makePost('rel-1', { slug: 'related-1' });
        const tagOnly = makePost('tag-1', { slug: 'tag-1', tags: ['infra'] });

        const api = createApiWithPosts([root, related, tagOnly]);
        const response = await api.fetch(
            new Request('http://localhost/posts/root/recommendations?limit=2'),
        );

        expect(response.status).toBe(200);
        const payload = (await response.json()) as {
            strategy: string;
            data: Array<{ slug: string }>;
        };
        expect(payload.strategy).toBe('related_ids');
        expect(payload.data.some((post) => post.slug === 'related-1')).toBe(true);
    });

    test('recommendations fall back to latest when no signals exist', async () => {
        const root = makePost('root', {
            tags: [],
            segment: null,
            featured: false,
            relatedPostIds: [],
        });
        const latest = makePost('newer', {
            slug: 'newer',
            tags: [],
            segment: null,
            featured: false,
            relatedPostIds: [],
            publishedAt: '2026-02-10T00:00:00.000Z',
            createdAt: '2026-02-10T00:00:00.000Z',
        });
        const older = makePost('older', {
            slug: 'older',
            tags: [],
            segment: null,
            featured: false,
            relatedPostIds: [],
            publishedAt: '2026-01-10T00:00:00.000Z',
            createdAt: '2026-01-10T00:00:00.000Z',
        });

        const api = createApiWithPosts([root, latest, older]);
        const response = await api.fetch(new Request('http://localhost/posts/root/recommendations?limit=2'));
        expect(response.status).toBe(200);
        const payload = (await response.json()) as {
            strategy: string;
            data: Array<{ slug: string }>;
        };
        expect(payload.strategy).toBe('latest');
        expect(payload.data[0]?.slug).toBe('newer');
    });

    test('triggers proactive image refresh when signed url is near expiry', async () => {
        const now = Date.now();
        const amzDate = toAmzDate(new Date(now - 55 * 60 * 1000)); // signed 55 minutes ago
        const signedExpiringSoon =
            `https://example.com/file.png?X-Amz-Date=${amzDate}&X-Amz-Expires=3600`;

        let refreshed = false;
        const api = createApiWithPosts(
            [makePost('root', { bannerImageUrl: signedExpiringSoon })],
            {
                syncService: {} as any,
                runImageRefresh: async () => {
                    refreshed = true;
                    return { synced: 1, skipped: 0, errors: 0, removed: 0 };
                },
            },
        );

        const response = await api.fetch(new Request('http://localhost/posts?limit=1&page=1'));
        expect(response.status).toBe(200);
        expect(refreshed).toBe(true);
    });

    test('content route handles both public recordMap and private blocks', async () => {
        const publicPost = makePost('public', { slug: 'public', isPublic: true });
        const privatePost = makePost('private', { slug: 'private', isPublic: false });

        const api = createApiWithPosts([publicPost, privatePost], {
            notionService: {
                getRecordMap: async () => ({ block: {} }),
                getBlockContent: async () => [{ id: 'block-1' }],
            } as any,
        });

        const publicResponse = await api.fetch(new Request('http://localhost/posts/public/content'));
        expect(publicResponse.status).toBe(200);
        const publicPayload = (await publicResponse.json()) as { renderMode: string };
        expect(publicPayload.renderMode).toBe('recordMap');

        const privateResponse = await api.fetch(new Request('http://localhost/posts/private/content'));
        expect(privateResponse.status).toBe(200);
        const privatePayload = (await privateResponse.json()) as { renderMode: string; blocks: unknown[] };
        expect(privatePayload.renderMode).toBe('blocks');
        expect(Array.isArray(privatePayload.blocks)).toBe(true);
    });
});

function createApiWithPosts(
    posts: StoredPost[],
    overrides?: Partial<{
        syncService: unknown;
        notionService: unknown;
        runImageRefresh: () => Promise<{ synced: number; skipped: number; errors: number; removed: number }>;
    }>,
) {
    const bySlug = new Map(posts.map((post) => [post.slug, post]));
    const db = {
        listReadyPosts: () => ({
            data: posts,
            total: posts.length,
            facets: {
                authors: [],
                segments: [],
            },
        }),
        listAllReadyPosts: () => posts,
        getReadyPostBySlug: (slug: string) => bySlug.get(slug) ?? null,
    };

    return createBlogPackApi({
        db: db as any,
        notionService: (overrides?.notionService ?? null) as any,
        syncService: (overrides?.syncService ?? null) as any,
        options: defaultOptions,
        runImageRefresh:
            overrides?.runImageRefresh ??
            (async () => ({
                synced: 0,
                skipped: 0,
                errors: 0,
                removed: 0,
            })),
    });
}

function makePost(
    id: string,
    overrides?: Partial<StoredPost>,
): StoredPost {
    const timestamp = '2026-02-01T00:00:00.000Z';
    return {
        id,
        notionPageId: id,
        title: `Post ${id}`,
        slug: id,
        summary: 'Summary',
        author: 'Author',
        authorEmail: null,
        authorAvatarUrl: null,
        tags: ['infra'],
        segment: 'engineering',
        status: 'ready',
        publishedAt: timestamp,
        bannerImageUrl: null,
        readTimeMinutes: 3,
        featured: false,
        relatedPostIds: [],
        isPublic: true,
        notionUrl: `https://notion.so/${id}`,
        createdAt: timestamp,
        updatedAt: timestamp,
        ...overrides,
    };
}

function toAmzDate(date: Date): string {
    const yyyy = date.getUTCFullYear().toString().padStart(4, '0');
    const mm = String(date.getUTCMonth() + 1).padStart(2, '0');
    const dd = String(date.getUTCDate()).padStart(2, '0');
    const hh = String(date.getUTCHours()).padStart(2, '0');
    const mi = String(date.getUTCMinutes()).padStart(2, '0');
    const ss = String(date.getUTCSeconds()).padStart(2, '0');
    return `${yyyy}${mm}${dd}T${hh}${mi}${ss}Z`;
}

