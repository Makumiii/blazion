import type { Hono } from 'hono';
import type { Client } from '@notionhq/client';
import type { BlogEngineConfig } from '@blazion/shared';
import {
    createBlogPackApi,
    type BlogPackNotionService,
    type BlogPackRouteOptions,
    setupBlogPackDatabase,
} from '@blazion/pack-blog-api';

import type { DatabaseService } from '../db';
import type { NotionService } from '../notion';
import { SyncService, type SyncResult } from '../sync';

export interface PackSyncContext {
    db: DatabaseService;
    notionService: NotionService | null;
    config: BlogEngineConfig;
    notionDatabaseId: string | null;
}

export interface PackApiContext {
    db: DatabaseService;
    notionService: BlogPackNotionService | null;
    syncService: SyncService | null;
    blogRouteOptions: BlogPackRouteOptions;
    runImageRefresh: (source: 'request' | 'manual' | 'cron', packName?: string) => Promise<SyncResult>;
}

export interface ApiPackRegistration {
    name: string;
    description: string;
    routePrefix: string;
    legacyAliasPrefix?: string;
    createSyncService: (context: PackSyncContext) => SyncService | null;
    registerApiRoutes: (app: Hono, context: PackApiContext) => void;
    setup?: {
        createDatabase: (input: { client: Client; pageId: string }) => Promise<string>;
    };
}

const blogPackRegistration: ApiPackRegistration = {
    name: 'blog',
    description: 'Blog schema, sync rules, and content endpoints.',
    routePrefix: '/api/blog',
    legacyAliasPrefix: '/api',
    createSyncService: (context) => {
        if (context.notionService === null || !context.notionDatabaseId) {
            return null;
        }
        return new SyncService({
            notion: context.notionService,
            db: context.db,
            config: context.config,
            notionDatabaseId: context.notionDatabaseId,
        });
    },
    registerApiRoutes: (app, context) => {
        const createApi = () =>
            createBlogPackApi({
                db: context.db,
                notionService: context.notionService,
                syncService: context.syncService,
                options: context.blogRouteOptions,
                runImageRefresh: (source) => context.runImageRefresh(source, 'blog'),
            });
        app.route('/api/blog', createApi());
    },
    setup: {
        createDatabase: ({ client, pageId }) =>
            setupBlogPackDatabase({
                client,
                pageId,
            }),
    },
};

export const availablePacks: ApiPackRegistration[] = [blogPackRegistration];

export function resolveUnknownPackNames(enabledPackNames: string[]): string[] {
    const known = new Set(availablePacks.map((pack) => pack.name));
    return enabledPackNames.filter((name) => !known.has(name));
}

export function resolveRegisteredPacks(enabledPackNames: string[]): ApiPackRegistration[] {
    const enabled = new Set(enabledPackNames);
    return availablePacks.filter((pack) => enabled.has(pack.name));
}

export function resolveSetupPackRegistration(packName: string): ApiPackRegistration | null {
    const pack = availablePacks.find((entry) => entry.name === packName) ?? null;
    if (!pack || !pack.setup) {
        return null;
    }
    return pack;
}

export function listSetupPackNames(): string[] {
    return availablePacks.filter((pack) => Boolean(pack.setup)).map((pack) => pack.name);
}
