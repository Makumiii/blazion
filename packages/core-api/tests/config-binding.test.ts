import { afterEach, describe, expect, test } from 'bun:test';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

import { loadRuntimeConfig } from '../src/config';
import { DatabaseService } from '../src/db';

const originalCwd = process.cwd();
const tempDirs: string[] = [];

afterEach(async () => {
    process.chdir(originalCwd);
    await Promise.all(
        tempDirs.splice(0).map((dir) => fs.rm(dir, { recursive: true, force: true })),
    );
});

async function createWorkspace(envLines: string[]): Promise<string> {
    const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'blazion-config-'));
    tempDirs.push(tempDir);

    await fs.writeFile(path.join(tempDir, 'pnpm-workspace.yaml'), 'packages:\n  - "packages/*"\n');
    await fs.writeFile(
        path.join(tempDir, 'blazion.config.ts'),
        `export default {
  notion: { integrationKey: process.env.NOTION_API_KEY ?? 'missing' },
  database: { path: './data/blog.db' },
  server: { port: 3000 },
  packs: [{ name: 'blog', enabled: true }]
};\n`,
    );
    await fs.mkdir(path.join(tempDir, 'data'), { recursive: true });
    await fs.writeFile(path.join(tempDir, '.env'), `${envLines.join('\n')}\n`);

    return tempDir;
}

const ISOLATED_ENV_KEYS = [
    'NOTION_API_KEY',
    'NOTION_DATABASE_ID',
    'NOTION_DATABASE_ID_BLOG',
    'DATABASE_PATH',
] as const;

function withIsolatedEnv<T>(fn: () => Promise<T>): Promise<T> {
    const previous: Partial<Record<(typeof ISOLATED_ENV_KEYS)[number], string | undefined>> = {};
    for (const key of ISOLATED_ENV_KEYS) {
        previous[key] = process.env[key];
        delete process.env[key];
    }

    return fn().finally(() => {
        for (const key of ISOLATED_ENV_KEYS) {
            process.env[key] = previous[key];
        }
    });
}

describe('runtime config notion bindings', () => {
    test('uses NOTION_DATABASE_ID for blog pack when local binding is missing', async () => {
        const tempDir = await createWorkspace([
            'NOTION_API_KEY=secret_key',
            'NOTION_DATABASE_ID=env-db-id',
        ]);
        process.chdir(tempDir);

        await withIsolatedEnv(async () => {
            const runtime = await loadRuntimeConfig();
            expect(runtime.notionConfigured).toBe(true);
            expect(runtime.notionDatabaseIds.blog).toBe('env-db-id');
        });
    });

    test('keeps existing local pack binding over NOTION_DATABASE_ID fallback', async () => {
        const tempDir = await createWorkspace([
            'NOTION_API_KEY=secret_key',
            'NOTION_DATABASE_ID=env-db-id',
        ]);
        const db = new DatabaseService(path.join(tempDir, 'data', 'blog.db'));
        db.migrate();
        db.setPackDatabaseId('blog', 'local-db-id');
        process.chdir(tempDir);

        await withIsolatedEnv(async () => {
            const runtime = await loadRuntimeConfig();
            expect(runtime.notionConfigured).toBe(true);
            expect(runtime.notionDatabaseIds.blog).toBe('local-db-id');
        });
    });
});
