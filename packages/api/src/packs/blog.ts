import { Hono } from 'hono';
import { postsQuerySchema } from '@blazion/shared';
import type { BlogPost } from '@blazion/shared';

import type { StoredPost, DatabaseService } from '../db';
import type { NotionService } from '../notion';
import type { SyncService } from '../sync';

export interface BlogPackRouteOptions {
    imageUrlRefreshBufferSeconds: number;
    recommendationDefaultLimit: number;
    recommendationMaxLimit: number;
    recommendationWeightRelated: number;
    recommendationWeightTag: number;
    recommendationWeightSegment: number;
    recommendationWeightFeatured: number;
    recommendationWeightRecency: number;
    recommendationRecencyWindowDays: number;
}

interface BlogPackDependencies {
    db: DatabaseService;
    notionService: NotionService | null;
    syncService: SyncService | null;
    options: BlogPackRouteOptions;
    runImageRefresh: (source: 'request' | 'manual' | 'cron') => Promise<{
        synced: number;
        skipped: number;
        errors: number;
        removed: number;
    }>;
}

export function createBlogPackApi(input: BlogPackDependencies): Hono {
    const app = new Hono();

    app.get('/posts', async (c) => {
        const parsedQuery = postsQuerySchema.safeParse({
            page: c.req.query('page'),
            limit: c.req.query('limit'),
            q: c.req.query('q'),
            dateFrom: c.req.query('dateFrom'),
            dateTo: c.req.query('dateTo'),
            tags: c.req.query('tags'),
            author: c.req.query('author'),
            authors: c.req.query('authors'),
            segment: c.req.query('segment'),
            segments: c.req.query('segments'),
            featured: c.req.query('featured'),
            sort: c.req.query('sort'),
        });

        if (!parsedQuery.success) {
            return c.json(
                {
                    error: 'Invalid query',
                    message: 'Invalid pagination or filter query parameters.',
                    details: parsedQuery.error.flatten(),
                },
                400,
            );
        }

        const query = parsedQuery.data;
        const q = normalizeQueryText(query.q);
        const dateFrom = normalizeDateBoundary(query.dateFrom, 'start');
        const dateTo = normalizeDateBoundary(query.dateTo, 'end');
        const tags = query.tags
            ? query.tags
                  .split(',')
                  .map((value) => value.trim())
                  .filter((value) => value.length > 0)
            : [];
        const authors = parseCsv(query.authors ?? query.author);
        const segments = parseCsv(query.segments ?? query.segment);
        const featuredOnly = parseBooleanEnv(query.featured, false);
        const sort = query.sort;

        let result = input.db.listReadyPosts({
            page: query.page,
            limit: query.limit,
            q,
            dateFrom,
            dateTo,
            tags,
            authors,
            segments,
            featuredOnly,
            sort,
        });

        if (
            input.syncService !== null &&
            shouldRefreshBannerUrls(result.data, Date.now(), input.options.imageUrlRefreshBufferSeconds)
        ) {
            try {
                await input.runImageRefresh('request');
                result = input.db.listReadyPosts({
                    page: query.page,
                    limit: query.limit,
                    q,
                    dateFrom,
                    dateTo,
                    tags,
                    authors,
                    segments,
                    featuredOnly,
                    sort,
                });
            } catch (error) {
                console.warn('Failed to run proactive image URL refresh for /api/posts', error);
            }
        }

        const totalPages = result.total === 0 ? 0 : Math.ceil(result.total / query.limit);

        c.header('Cache-Control', 'public, max-age=60, stale-while-revalidate=300');
        return c.json({
            data: result.data.map(toApiPost),
            pagination: {
                page: query.page,
                limit: query.limit,
                total: result.total,
                totalPages,
            },
            facets: result.facets,
            appliedFilters: {
                q,
                dateFrom,
                dateTo,
                tags,
                authors,
                segments,
                featuredOnly,
                sort,
            },
        });
    });

    app.get('/search-index', async (c) => {
        const limit = parseRecommendationLimit(c.req.query('limit'), 250, 1000);

        let posts = input.db.listAllReadyPosts();
        if (
            input.syncService !== null &&
            shouldRefreshBannerUrls(posts, Date.now(), input.options.imageUrlRefreshBufferSeconds)
        ) {
            try {
                await input.runImageRefresh('request');
                posts = input.db.listAllReadyPosts();
            } catch (error) {
                console.warn('Failed to run proactive image URL refresh for /api/search-index', error);
            }
        }

        c.header('Cache-Control', 'public, max-age=60, stale-while-revalidate=300');
        return c.json({
            data: posts.slice(0, limit).map(toApiPost),
        });
    });

    app.get('/posts/:slug', async (c) => {
        const slug = c.req.param('slug');
        let post = input.db.getReadyPostBySlug(slug);
        if (
            post &&
            input.syncService !== null &&
            shouldRefreshBannerUrl(post.bannerImageUrl, Date.now(), input.options.imageUrlRefreshBufferSeconds)
        ) {
            try {
                await input.runImageRefresh('request');
                post = input.db.getReadyPostBySlug(slug);
            } catch (error) {
                console.warn(`Failed to run proactive image URL refresh for /api/posts/${slug}`, error);
            }
        }
        if (!post) {
            return c.json(
                {
                    error: 'Not found',
                    message: `Post with slug "${slug}" not found`,
                },
                404,
            );
        }

        c.header('Cache-Control', 'public, max-age=120, stale-while-revalidate=600');
        return c.json({
            data: toApiPost(post),
        });
    });

    app.get('/posts/:slug/recommendations', async (c) => {
        const slug = c.req.param('slug');
        const post = input.db.getReadyPostBySlug(slug);
        if (!post) {
            return c.json(
                {
                    error: 'Not found',
                    message: `Post with slug "${slug}" not found`,
                },
                404,
            );
        }

        const limit = parseRecommendationLimit(
            c.req.query('limit'),
            input.options.recommendationDefaultLimit,
            input.options.recommendationMaxLimit,
        );

        let candidates = input.db.listAllReadyPosts().filter((candidate) => candidate.slug !== slug);
        if (
            input.syncService !== null &&
            shouldRefreshBannerUrls(candidates, Date.now(), input.options.imageUrlRefreshBufferSeconds)
        ) {
            try {
                await input.runImageRefresh('request');
                candidates = input.db.listAllReadyPosts().filter((candidate) => candidate.slug !== slug);
            } catch (error) {
                console.warn(
                    `Failed to run proactive image URL refresh for /api/posts/${slug}/recommendations`,
                    error,
                );
            }
        }

        const ranking = rankRecommendations({
            current: post,
            candidates,
            nowMs: Date.now(),
            limit,
            options: input.options,
        });

        c.header('Cache-Control', 'public, max-age=60, stale-while-revalidate=300');
        return c.json({
            data: ranking.posts.map(toApiPost),
            strategy: ranking.strategy,
        });
    });

    app.get('/posts/:slug/content', async (c) => {
        const slug = c.req.param('slug');
        const post = input.db.getReadyPostBySlug(slug);
        if (!post) {
            return c.json(
                {
                    error: 'Not found',
                    message: `Content for post "${slug}" not found`,
                },
                404,
            );
        }

        if (input.notionService === null) {
            return c.json(
                {
                    error: 'Not configured',
                    message: 'Set NOTION_API_KEY and NOTION_DATABASE_ID to enable content fetch.',
                },
                503,
            );
        }

        if (post.isPublic) {
            try {
                const recordMap = await input.notionService.getRecordMap(post.notionPageId);
                c.header('Cache-Control', 'public, max-age=120, stale-while-revalidate=600');
                return c.json({
                    recordMap,
                    renderMode: 'recordMap',
                });
            } catch (error) {
                console.error('Failed to fetch recordMap', error);
                return c.json(
                    {
                        error: 'Content fetch failed',
                        message: `Could not fetch content for post "${slug}"`,
                    },
                    502,
                );
            }
        }

        try {
            const blocks = await input.notionService.getBlockContent(post.notionPageId);
            c.header('Cache-Control', 'public, max-age=60, stale-while-revalidate=300');
            return c.json({
                recordMap: {},
                blocks,
                renderMode: 'blocks',
            });
        } catch (error) {
            console.error('Failed to fetch private blocks', error);
            return c.json(
                {
                    error: 'Content fetch failed',
                    message: `Could not fetch private block content for post "${slug}"`,
                },
                502,
            );
        }
    });

    return app;
}

function toApiPost(post: BlogPost & { notionUrl: string }): BlogPost {
    const { notionUrl: _, ...rest } = post;
    return rest;
}

function parseCsv(input: string | undefined): string[] {
    if (!input) {
        return [];
    }
    return input
        .split(',')
        .map((value) => value.trim())
        .filter((value) => value.length > 0);
}

function parseBooleanEnv(input: string | undefined, fallback: boolean): boolean {
    if (typeof input !== 'string') {
        return fallback;
    }
    const value = input.trim().toLowerCase();
    if (value === 'true' || value === '1' || value === 'yes' || value === 'on') {
        return true;
    }
    if (value === 'false' || value === '0' || value === 'no' || value === 'off') {
        return false;
    }
    return fallback;
}

function parseRecommendationLimit(
    input: string | undefined,
    defaultLimit: number,
    maxLimit: number,
): number {
    if (!input) {
        return Math.min(defaultLimit, maxLimit);
    }

    const parsed = Number(input);
    if (!Number.isFinite(parsed) || parsed <= 0) {
        return Math.min(defaultLimit, maxLimit);
    }

    return Math.max(1, Math.min(Math.floor(parsed), maxLimit));
}

function normalizeQueryText(input: string | undefined): string {
    if (!input) {
        return '';
    }
    return input.trim();
}

function normalizeDateBoundary(input: string | undefined, kind: 'start' | 'end'): string {
    if (!input) {
        return '';
    }

    const value = input.trim();
    if (!value) {
        return '';
    }

    const dateOnlyMatch = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (dateOnlyMatch) {
        return kind === 'start' ? `${value}T00:00:00.000Z` : `${value}T23:59:59.999Z`;
    }

    const parsed = Date.parse(value);
    if (!Number.isFinite(parsed)) {
        return '';
    }
    return new Date(parsed).toISOString();
}

function rankRecommendations(input: {
    current: StoredPost;
    candidates: StoredPost[];
    nowMs: number;
    limit: number;
    options: BlogPackRouteOptions;
}): { posts: StoredPost[]; strategy: 'related_ids' | 'tags' | 'segment' | 'featured' | 'latest' } {
    const currentRelatedIds = new Set(input.current.relatedPostIds);
    const currentTagSet = new Set(input.current.tags.map((tag) => tag.toLowerCase()));
    const currentSegment = normalizeSegment(input.current.segment);

    const scored = input.candidates
        .map((candidate) => {
            const hasDirectRelation =
                currentRelatedIds.has(candidate.id) || candidate.relatedPostIds.includes(input.current.id);
            const sharedTags = countSharedTags(currentTagSet, candidate.tags);
            const hasSegmentMatch =
                currentSegment !== null && currentSegment === normalizeSegment(candidate.segment);
            const recencyScore = computeRecencyScore(
                resolvePostTimestampMs(candidate),
                input.nowMs,
                input.options.recommendationRecencyWindowDays,
                input.options.recommendationWeightRecency,
            );

            const score =
                (hasDirectRelation ? input.options.recommendationWeightRelated : 0) +
                sharedTags * input.options.recommendationWeightTag +
                (hasSegmentMatch ? input.options.recommendationWeightSegment : 0) +
                (candidate.featured ? input.options.recommendationWeightFeatured : 0) +
                recencyScore;

            return {
                candidate,
                score,
                hasDirectRelation,
                sharedTags,
                hasSegmentMatch,
            };
        })
        .sort((a, b) => {
            if (b.score !== a.score) {
                return b.score - a.score;
            }

            return resolvePostTimestampMs(b.candidate) - resolvePostTimestampMs(a.candidate);
        });

    const selected = scored.slice(0, input.limit);
    const strategy = resolveRecommendationStrategy(selected);
    return {
        posts: selected.map((entry) => entry.candidate),
        strategy,
    };
}

function resolveRecommendationStrategy(
    selected: Array<{
        hasDirectRelation: boolean;
        sharedTags: number;
        hasSegmentMatch: boolean;
        candidate: StoredPost;
    }>,
): 'related_ids' | 'tags' | 'segment' | 'featured' | 'latest' {
    if (selected.some((entry) => entry.hasDirectRelation)) {
        return 'related_ids';
    }
    if (selected.some((entry) => entry.sharedTags > 0)) {
        return 'tags';
    }
    if (selected.some((entry) => entry.hasSegmentMatch)) {
        return 'segment';
    }
    if (selected.some((entry) => entry.candidate.featured)) {
        return 'featured';
    }
    return 'latest';
}

function normalizeSegment(input: string | null): string | null {
    if (!input) {
        return null;
    }
    const normalized = input.trim().toLowerCase();
    return normalized.length > 0 ? normalized : null;
}

function countSharedTags(currentTagSet: Set<string>, candidateTags: string[]): number {
    if (currentTagSet.size === 0 || candidateTags.length === 0) {
        return 0;
    }

    let count = 0;
    for (const tag of candidateTags) {
        if (currentTagSet.has(tag.toLowerCase())) {
            count += 1;
        }
    }
    return count;
}

function resolvePostTimestampMs(post: StoredPost): number {
    const published = post.publishedAt ? Date.parse(post.publishedAt) : NaN;
    if (Number.isFinite(published)) {
        return published;
    }

    const created = Date.parse(post.createdAt);
    if (Number.isFinite(created)) {
        return created;
    }

    return 0;
}

function computeRecencyScore(
    postTimeMs: number,
    nowMs: number,
    windowDays: number,
    maxScore: number,
): number {
    if (!postTimeMs || postTimeMs > nowMs) {
        return 0;
    }

    const ageDays = (nowMs - postTimeMs) / (24 * 60 * 60 * 1000);
    if (ageDays >= windowDays) {
        return 0;
    }

    const ratio = 1 - ageDays / windowDays;
    return ratio * maxScore;
}

function shouldRefreshBannerUrls(
    posts: Array<{ bannerImageUrl: string | null }>,
    nowMs: number,
    refreshBufferSeconds: number,
): boolean {
    for (const post of posts) {
        if (shouldRefreshBannerUrl(post.bannerImageUrl, nowMs, refreshBufferSeconds)) {
            return true;
        }
    }
    return false;
}

function shouldRefreshBannerUrl(
    bannerUrl: string | null,
    nowMs: number,
    refreshBufferSeconds: number,
): boolean {
    if (!bannerUrl) {
        return false;
    }

    const expiresAtMs = getSignedUrlExpiryMs(bannerUrl);
    if (expiresAtMs === null) {
        return false;
    }

    const refreshThresholdMs = refreshBufferSeconds * 1000;
    return expiresAtMs - nowMs <= refreshThresholdMs;
}

function getSignedUrlExpiryMs(urlValue: string): number | null {
    let url: URL;
    try {
        url = new URL(urlValue);
    } catch {
        return null;
    }

    const amzDate = url.searchParams.get('X-Amz-Date');
    const amzExpires = url.searchParams.get('X-Amz-Expires');
    if (!amzDate || !amzExpires) {
        return null;
    }

    const signedAtMs = parseAmzDateToMs(amzDate);
    const expiresSeconds = Number(amzExpires);
    if (signedAtMs === null || !Number.isFinite(expiresSeconds) || expiresSeconds <= 0) {
        return null;
    }

    return signedAtMs + expiresSeconds * 1000;
}

function parseAmzDateToMs(input: string): number | null {
    const match = input.match(/^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})Z$/);
    if (!match) {
        return null;
    }

    const [, year, month, day, hour, minute, second] = match;
    return Date.UTC(
        Number(year),
        Number(month) - 1,
        Number(day),
        Number(hour),
        Number(minute),
        Number(second),
    );
}

