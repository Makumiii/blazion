import fs from 'node:fs';
import path from 'node:path';

import { afterAll, beforeAll, describe, expect, test } from 'bun:test';

import { DatabaseService } from '../src/db';

const TEST_SYNC_KEY = 'integration-test-sync-key';
const TEST_PORT = 4141;
const BASE_URL = `http://localhost:${TEST_PORT}`;
const API_PACKAGE_DIR = path.resolve(import.meta.dir, '..');
const TEST_TMP_DIR = path.join(API_PACKAGE_DIR, '.tmp-tests');
const TEST_DB_PATH = path.join(TEST_TMP_DIR, `blazion-api-integration-${Date.now()}.db`);

let apiProcess: Bun.Subprocess | null = null;

beforeAll(async () => {
    fs.mkdirSync(TEST_TMP_DIR, { recursive: true });
    seedDatabase(TEST_DB_PATH);
    apiProcess = Bun.spawn([process.execPath, 'run', 'src/index.ts'], {
        cwd: API_PACKAGE_DIR,
        stdout: 'pipe',
        stderr: 'pipe',
        env: {
            ...process.env,
            NODE_ENV: 'test',
            PORT: String(TEST_PORT),
            DATABASE_PATH: TEST_DB_PATH,
            BLAZION_PACKS: 'blog',
            NOTION_API_KEY: '',
            NOTION_DATABASE_ID: '',
            SYNC_ADMIN_API_KEY_ENABLED: 'true',
            SYNC_ADMIN_API_KEY: TEST_SYNC_KEY,
            SYNC_HINT_ENABLED: 'true',
            NEXT_PUBLIC_SYNC_HINT_ENABLED: 'false',
            API_RATE_LIMIT_ENABLED: 'false',
        },
    });

    await waitForHealthy(`${BASE_URL}/api/health`);
});

afterAll(async () => {
    if (apiProcess) {
        apiProcess.kill();
        await apiProcess.exited;
    }
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
        const response = await fetch(`${BASE_URL}/api/health`);
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

    test('blog routes and legacy aliases return seeded posts', async () => {
        const blogResponse = await fetch(`${BASE_URL}/api/blog/posts?limit=5&page=1`);
        expect(blogResponse.status).toBe(200);
        const blogPayload = (await blogResponse.json()) as {
            data: Array<{ slug: string }>;
            pagination: { total: number };
        };
        expect(blogPayload.pagination.total).toBeGreaterThan(0);
        expect(blogPayload.data.some((post) => post.slug === 'integration-seeded-post')).toBe(true);

        const legacyResponse = await fetch(`${BASE_URL}/api/posts?limit=5&page=1`);
        expect(legacyResponse.status).toBe(200);
        const legacyPayload = (await legacyResponse.json()) as {
            data: Array<{ slug: string }>;
        };
        expect(legacyPayload.data.some((post) => post.slug === 'integration-seeded-post')).toBe(true);
    });

    test('single and recommendations endpoints behave as expected', async () => {
        const singleResponse = await fetch(`${BASE_URL}/api/posts/integration-seeded-post`);
        expect(singleResponse.status).toBe(200);
        const singlePayload = (await singleResponse.json()) as { data: { slug: string } };
        expect(singlePayload.data.slug).toBe('integration-seeded-post');

        const recommendationResponse = await fetch(
            `${BASE_URL}/api/posts/integration-seeded-post/recommendations?limit=3`,
        );
        expect(recommendationResponse.status).toBe(200);
        const recommendations = (await recommendationResponse.json()) as {
            data: Array<{ slug: string }>;
        };
        expect(Array.isArray(recommendations.data)).toBe(true);
    });

    test('content endpoint returns 503 without notion credentials', async () => {
        const response = await fetch(`${BASE_URL}/api/posts/integration-seeded-post/content`);
        expect(response.status).toBe(503);
    });

    test('sync endpoints enforce auth and pack-aware response', async () => {
        const unauthSync = await fetch(`${BASE_URL}/api/sync`, { method: 'POST' });
        expect(unauthSync.status).toBe(401);

        const authSync = await fetch(`${BASE_URL}/api/sync?pack=blog`, {
            method: 'POST',
            headers: {
                'x-api-key': TEST_SYNC_KEY,
            },
        });
        expect([400, 503]).toContain(authSync.status);

        const unknownPackSync = await fetch(`${BASE_URL}/api/sync?pack=docs`, {
            method: 'POST',
            headers: {
                'x-api-key': TEST_SYNC_KEY,
            },
        });
        expect(unknownPackSync.status).toBe(400);
    });

    test('sync hint status endpoint stays available', async () => {
        const hintResponse = await fetch(`${BASE_URL}/api/sync/hint`, { method: 'POST' });
        expect([202, 503]).toContain(hintResponse.status);

        const statusResponse = await fetch(`${BASE_URL}/api/sync/status`);
        expect(statusResponse.status).toBe(200);
        const payload = (await statusResponse.json()) as {
            enabledPacks: string[];
            syncEnabledPacks: string[];
        };
        expect(payload.enabledPacks).toContain('blog');
        expect(Array.isArray(payload.syncEnabledPacks)).toBe(true);
    });
});

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

async function waitForHealthy(url: string): Promise<void> {
    const maxAttempts = 40;
    for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
        try {
            const response = await fetch(url);
            if (response.ok) {
                return;
            }
        } catch {
            // retry
        }
        await Bun.sleep(250);
    }
    throw new Error(`API did not become healthy in time at ${url}`);
}
