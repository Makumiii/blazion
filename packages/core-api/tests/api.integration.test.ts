import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

import { afterAll, beforeAll, describe, expect, test } from 'bun:test';

import { DatabaseService } from '../src/db';

const TEST_SYNC_KEY = 'integration-test-sync-key';
const TEST_PORT = Number(process.env.BLAZION_TEST_PORT ?? 4141);
const API_PACKAGE_DIR = path.resolve(import.meta.dir, '..');
const TEST_TMP_DIR = path.join(API_PACKAGE_DIR, '.tmp-tests');
const TEST_DB_PATH = path.join(TEST_TMP_DIR, `blazion-api-integration-${Date.now()}.db`);

let apiFetch: ((request: Request) => Response | Promise<Response>) | null = null;

beforeAll(async () => {
    fs.mkdirSync(TEST_TMP_DIR, { recursive: true });
    seedDatabase(TEST_DB_PATH);
    process.env.NODE_ENV = 'test';
    process.env.PORT = String(TEST_PORT);
    process.env.DATABASE_PATH = TEST_DB_PATH;
    process.env.NOTION_API_KEY = '';
    process.env.SYNC_ADMIN_API_KEY_ENABLED = 'true';
    process.env.SYNC_ADMIN_API_KEY = TEST_SYNC_KEY;
    process.env.SYNC_HINT_ENABLED = 'true';
    process.env.NEXT_PUBLIC_SYNC_HINT_ENABLED = 'false';
    process.env.API_RATE_LIMIT_ENABLED = 'false';

    const moduleUrl = `${pathToFileURL(path.join(API_PACKAGE_DIR, 'src/index.ts')).href}?t=${Date.now()}`;
    const imported = (await import(moduleUrl)) as {
        default?: { fetch?: (request: Request) => Response | Promise<Response> };
    };
    if (!imported.default || typeof imported.default.fetch !== 'function') {
        throw new Error('Failed to initialize API fetch handler for integration tests.');
    }
    apiFetch = imported.default.fetch;
});

afterAll(async () => {
    apiFetch = null;
    try {
        fs.unlinkSync(TEST_DB_PATH);
    } catch {
        // ignore cleanup failures
    }
    try {
        fs.rmSync(TEST_TMP_DIR, { recursive: true, force: true });
    } catch {
        // ignore cleanup failures
    }
});

describe('api integration', () => {
    test('health includes enabled blog pack', async () => {
        const response = await request('/api/health');
        expect(response.status).toBe(200);
        const payload = (await response.json()) as {
            status: string;
            enabledPacks: string[];
            syncEnabledPacks: string[];
        };
        expect(payload.status).toBe('ok');
        expect(payload.enabledPacks).toContain('blog');
        expect(payload.syncEnabledPacks).toEqual([]);
    });

    test('blog routes return seeded posts', async () => {
        const blogResponse = await request('/api/blog/posts?limit=5&page=1');
        expect(blogResponse.status).toBe(200);
        const blogPayload = (await blogResponse.json()) as {
            data: Array<{ slug: string }>;
            pagination: { total: number };
        };
        expect(blogPayload.pagination.total).toBeGreaterThan(0);
        expect(blogPayload.data.some((post) => post.slug === 'integration-seeded-post')).toBe(true);
    });

    test('single and recommendations endpoints behave as expected', async () => {
        const singleResponse = await request('/api/blog/posts/integration-seeded-post');
        expect(singleResponse.status).toBe(200);
        const singlePayload = (await singleResponse.json()) as { data: { slug: string } };
        expect(singlePayload.data.slug).toBe('integration-seeded-post');

        const recommendationResponse = await request(
            '/api/blog/posts/integration-seeded-post/recommendations?limit=3',
        );
        expect(recommendationResponse.status).toBe(200);
        const recommendations = (await recommendationResponse.json()) as {
            data: Array<{ slug: string }>;
        };
        expect(Array.isArray(recommendations.data)).toBe(true);
    });

    test('content endpoint returns 503 without notion credentials', async () => {
        const response = await request('/api/blog/posts/integration-seeded-post/content');
        expect(response.status).toBe(503);
    });

    test('sync endpoints enforce auth and pack-aware response', async () => {
        const unauthSync = await request('/api/sync', { method: 'POST' });
        expect(unauthSync.status).toBe(401);

        const authSync = await request('/api/sync?pack=blog', {
            method: 'POST',
            headers: {
                'x-api-key': TEST_SYNC_KEY,
            },
        });
        expect([400, 503]).toContain(authSync.status);

        const unknownPackSync = await request('/api/sync?pack=docs', {
            method: 'POST',
            headers: {
                'x-api-key': TEST_SYNC_KEY,
            },
        });
        expect(unknownPackSync.status).toBe(400);
    });

    test('sync hint status endpoint stays available', async () => {
        const hintResponse = await request('/api/sync/hint', { method: 'POST' });
        expect([202, 503]).toContain(hintResponse.status);

        const statusResponse = await request('/api/sync/status');
        expect(statusResponse.status).toBe(200);
        const payload = (await statusResponse.json()) as {
            enabledPacks: string[];
            syncEnabledPacks: string[];
        };
        expect(payload.enabledPacks).toContain('blog');
        expect(Array.isArray(payload.syncEnabledPacks)).toBe(true);
    });
});

async function request(pathname: string, init?: RequestInit): Promise<Response> {
    if (!apiFetch) {
        throw new Error('API fetch handler is not initialized.');
    }
    const url = new URL(pathname, 'http://blazion.test').toString();
    const requestObject = new Request(url, init);
    return await apiFetch(requestObject);
}

function seedDatabase(dbPath: string): void {
    const db = new DatabaseService(dbPath);
    db.migrate();

    const now = new Date().toISOString();
    db.upsertPost({
        id: 'integration-post-1',
        notionPageId: 'integration-post-1',
        title: 'Integration Seeded Post',
        slug: 'integration-seeded-post',
        summary: 'Seeded post used for API integration testing.',
        author: 'Integration Bot',
        authorEmail: null,
        authorAvatarUrl: null,
        tags: ['testing', 'integration'],
        segment: 'engineering',
        status: 'ready',
        publishedAt: now,
        bannerImageUrl: null,
        readTimeMinutes: 3,
        featured: true,
        relatedPostIds: [],
        isPublic: false,
        notionUrl: 'https://notion.so/integration-post-1',
        createdAt: now,
        updatedAt: now,
    });
}
