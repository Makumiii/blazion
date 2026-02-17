import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

import { defineConfig, resolveEnabledPackNames, type BlogEngineConfig } from '@blazion/shared';
import { DatabaseService } from './db';

export interface RuntimeConfig {
    config: BlogEngineConfig;
    notionConfigured: boolean;
    notionDatabaseIds: Record<string, string>;
    enabledPacks: string[];
}

export async function loadRuntimeConfig(): Promise<RuntimeConfig> {
    const workspaceRoot = findWorkspaceRoot(process.cwd());
    const envFromFile = readEnvFile(path.join(workspaceRoot, '.env'));
    const fileConfig = await loadConfigFile(workspaceRoot);

    const notionIntegrationKey = readEnv('NOTION_API_KEY', envFromFile) || fileConfig?.notion?.integrationKey || '';
    const databasePath = readEnv('DATABASE_PATH', envFromFile) || fileConfig?.database?.path || './data/blog.db';
    const portValue = readEnv('PORT', envFromFile);
    const configPort = fileConfig?.server?.port;
    const resolvedDatabasePath = resolveDatabasePath(databasePath);
    const config = defineConfig({
        notion: {
            integrationKey: notionIntegrationKey || 'missing',
        },
        cron: fileConfig?.cron,
        sync: fileConfig?.sync,
        database: {
            path: resolvedDatabasePath,
        },
        server: {
            port: Number(portValue || configPort || 3000),
        },
        socials: fileConfig?.socials ?? {},
        site: fileConfig?.site ?? {},
        packs: fileConfig?.packs,
    });
    const enabledPacks = resolveEnabledPackNames(config.packs);
    const notionDatabaseIds = readPackDatabaseIdsFromLocalDatabase(resolvedDatabasePath, enabledPacks);

    return {
        config,
        notionConfigured: Boolean(notionIntegrationKey && Object.keys(notionDatabaseIds).length > 0),
        notionDatabaseIds,
        enabledPacks,
    };
}

async function loadConfigFile(workspaceRoot: string): Promise<Partial<BlogEngineConfig> | null> {
    const configPaths = [
        path.join(workspaceRoot, 'blazion.config.ts'),
        path.join(workspaceRoot, 'blazion.config.mjs'),
        path.join(workspaceRoot, 'blazion.config.js'),
    ];

    const existing = configPaths.find((candidate) => fs.existsSync(candidate));
    if (!existing) {
        return null;
    }

    try {
        const fileUrl = pathToFileURL(existing).href;
        const loaded = await import(fileUrl);
        return loaded.default ?? null;
    } catch (error) {
        console.warn('Could not load blazion.config file, using env/default config only.', error);
        return null;
    }
}

function resolveDatabasePath(inputPath: string): string {
    if (path.isAbsolute(inputPath)) {
        return inputPath;
    }

    const workspaceRoot = findWorkspaceRoot(process.cwd());
    return path.resolve(workspaceRoot, inputPath);
}

function findWorkspaceRoot(start: string): string {
    let current = path.resolve(start);
    while (true) {
        if (
            fs.existsSync(path.join(current, 'pnpm-workspace.yaml')) ||
            fs.existsSync(path.join(current, '.git'))
        ) {
            return current;
        }
        const parent = path.dirname(current);
        if (parent === current) {
            return start;
        }
        current = parent;
    }
}

function readEnv(name: string, fileEnv: Record<string, string>): string {
    return process.env[name] ?? fileEnv[name] ?? '';
}

function readEnvFile(filePath: string): Record<string, string> {
    if (!fs.existsSync(filePath)) {
        return {};
    }

    const lines = fs.readFileSync(filePath, 'utf8').split(/\r?\n/);
    const result: Record<string, string> = {};
    for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith('#')) {
            continue;
        }
        const idx = trimmed.indexOf('=');
        if (idx <= 0) {
            continue;
        }
        const key = trimmed.slice(0, idx).trim();
        const value = trimmed.slice(idx + 1).trim();
        result[key] = value;
    }
    return result;
}

function readPackDatabaseIdsFromLocalDatabase(
    dbPath: string,
    packNames: string[],
): Record<string, string> {
    try {
        const db = new DatabaseService(dbPath);
        db.migrate();
        const results: Record<string, string> = {};
        for (const packName of packNames) {
            const notionDatabaseId = db.getPackDatabaseId(packName);
            if (notionDatabaseId) {
                results[packName] = notionDatabaseId;
            }
        }
        return results;
    } catch (error) {
        console.warn('Could not read pack binding from local database metadata.', error);
        return {};
    }
}
