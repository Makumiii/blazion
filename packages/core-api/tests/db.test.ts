import fs from 'node:fs';
import path from 'node:path';

import { afterAll, beforeAll, describe, expect, test } from 'bun:test';

import { DatabaseService } from '../src/db';

const TMP_DIR = path.join(import.meta.dir, '.tmp-db-tests');
const DB_PATH = path.join(TMP_DIR, `db-test-${Date.now()}.sqlite`);

let db: DatabaseService;

beforeAll(() => {
    fs.mkdirSync(TMP_DIR, { recursive: true });
    db = new DatabaseService(DB_PATH);
    db.migrate();
});

afterAll(() => {
    try {
        fs.rmSync(TMP_DIR, { recursive: true, force: true });
    } catch {
        // ignore cleanup failures
    }
});

describe('database service', () => {
    test('upsert + list + slug lookup works', () => {
        const now = new Date().toISOString();

        db.upsertPost({
            id: 'db-post-1',
            notionPageId: 'db-post-1',
            title: 'DB Test Post',
            slug: 'db-test-post',
            summary: 'Testing sqlite access path.',
            author: 'DB Tester',
            authorEmail: null,
            authorAvatarUrl: null,
            tags: ['db', 'tests'],
            segment: 'engineering',
            status: 'ready',
            publishedAt: now,
            bannerImageUrl: null,
            readTimeMinutes: 4,
            featured: true,
            relatedPostIds: [],
            isPublic: true,
            notionUrl: 'https://notion.so/db-post-1',
            createdAt: now,
            updatedAt: now,
        });

        const page = db.listReadyPosts({
            page: 1,
            limit: 10,
            q: '',
            dateFrom: '',
            dateTo: '',
            tags: [],
            authors: [],
            segments: [],
            featuredOnly: false,
            sort: 'newest',
        });

        expect(page.total).toBeGreaterThan(0);
        expect(page.data.some((post) => post.slug === 'db-test-post')).toBe(true);

        const single = db.getReadyPostBySlug('db-test-post');
        expect(single).not.toBeNull();
        expect(single?.title).toBe('DB Test Post');
    });

    test('filters for query, tags, author, segment, and featured', () => {
        const result = db.listReadyPosts({
            page: 1,
            limit: 10,
            q: 'sqlite',
            dateFrom: '',
            dateTo: '',
            tags: ['db'],
            authors: ['db tester'],
            segments: ['engineering'],
            featuredOnly: true,
            sort: 'newest',
        });

        expect(result.total).toBeGreaterThanOrEqual(1);
        expect(result.data[0]?.slug).toBe('db-test-post');
        expect(result.facets.authors.some((facet) => facet.value === 'DB Tester')).toBe(true);
        expect(result.facets.segments.some((facet) => facet.value === 'engineering')).toBe(true);
    });

    test('deletePostsNotInNotionIds removes stale posts', () => {
        const now = new Date().toISOString();
        db.upsertPost({
            id: 'db-post-2',
            notionPageId: 'db-post-2',
            title: 'DB Test Post 2',
            slug: 'db-test-post-2',
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
            notionUrl: 'https://notion.so/db-post-2',
            createdAt: now,
            updatedAt: now,
        });

        const removed = db.deletePostsNotInNotionIds(['db-post-1']);
        expect(removed).toBeGreaterThanOrEqual(1);
        expect(db.getReadyPostBySlug('db-test-post-2')).toBeNull();
    });

    test('recordSyncRun accepts metrics payload', () => {
        expect(() =>
            db.recordSyncRun({
                synced: 1,
                skipped: 2,
                errors: 0,
                removed: 1,
            }),
        ).not.toThrow();
    });

    test('pack database bindings are persisted and retrievable', () => {
        db.setPackDatabaseId('blog', 'notion-db-1');
        expect(db.getPackDatabaseId('blog')).toBe('notion-db-1');

        db.setPackDatabaseId('blog', 'notion-db-2');
        expect(db.getPackDatabaseId('blog')).toBe('notion-db-2');
        expect(db.getPackDatabaseId('docs')).toBeNull();
    });
});
