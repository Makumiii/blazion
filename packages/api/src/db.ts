import fs from 'node:fs';
import path from 'node:path';

import type { BlogPost } from '@blog-engine/shared';
import { Database } from 'bun:sqlite';

export class DatabaseService {
    private readonly db: Database;

    public constructor(dbPath: string) {
        const resolvedPath = path.resolve(dbPath);
        const dir = path.dirname(resolvedPath);
        fs.mkdirSync(dir, { recursive: true });
        this.db = new Database(resolvedPath, { create: true });
        this.db.exec('PRAGMA journal_mode = WAL');
    }

    public migrate(): void {
        this.db.exec(`
            CREATE TABLE IF NOT EXISTS posts (
                id TEXT PRIMARY KEY,
                notion_page_id TEXT NOT NULL UNIQUE,
                title TEXT NOT NULL,
                slug TEXT NOT NULL UNIQUE,
                summary TEXT,
                author TEXT,
                tags_json TEXT NOT NULL,
                status TEXT NOT NULL,
                published_at TEXT,
                banner_image_url TEXT,
                featured INTEGER NOT NULL DEFAULT 0,
                related_post_ids_json TEXT NOT NULL DEFAULT '[]',
                is_public INTEGER NOT NULL DEFAULT 0,
                notion_url TEXT NOT NULL,
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL
            );

            CREATE INDEX IF NOT EXISTS idx_posts_slug ON posts(slug);
            CREATE INDEX IF NOT EXISTS idx_posts_status ON posts(status);

            CREATE TABLE IF NOT EXISTS sync_runs (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                synced INTEGER NOT NULL,
                skipped INTEGER NOT NULL,
                errors INTEGER NOT NULL,
                created_at TEXT NOT NULL
            );
        `);

        this.ensurePostColumn('featured', 'INTEGER NOT NULL DEFAULT 0');
        this.ensurePostColumn('related_post_ids_json', "TEXT NOT NULL DEFAULT '[]'");
    }

    public isConnected(): boolean {
        const row = this.db.query('SELECT 1 as ok').get() as { ok: number } | null;
        return row?.ok === 1;
    }

    public upsertPost(post: BlogPost & { notionUrl: string }): void {
        const statement = this.db.query(`
            INSERT INTO posts (
                id, notion_page_id, title, slug, summary, author, tags_json, status,
                published_at, banner_image_url, featured, related_post_ids_json, is_public,
                notion_url, created_at, updated_at
            ) VALUES (
                ?, ?, ?, ?, ?, ?, ?, ?,
                ?, ?, ?, ?, ?, ?, ?, ?
            )
            ON CONFLICT(notion_page_id) DO UPDATE SET
                id = excluded.id,
                title = excluded.title,
                slug = excluded.slug,
                summary = excluded.summary,
                author = excluded.author,
                tags_json = excluded.tags_json,
                status = excluded.status,
                published_at = excluded.published_at,
                banner_image_url = excluded.banner_image_url,
                featured = excluded.featured,
                related_post_ids_json = excluded.related_post_ids_json,
                is_public = excluded.is_public,
                notion_url = excluded.notion_url,
                updated_at = excluded.updated_at
        `);

        statement.run(
            post.id,
            post.notionPageId,
            post.title,
            post.slug,
            post.summary,
            post.author,
            JSON.stringify(post.tags),
            post.status,
            post.publishedAt,
            post.bannerImageUrl,
            post.featured ? 1 : 0,
            JSON.stringify(post.relatedPostIds),
            post.isPublic ? 1 : 0,
            post.notionUrl,
            post.createdAt,
            post.updatedAt,
        );
    }

    public recordSyncRun(input: { synced: number; skipped: number; errors: number }): void {
        this.db.query('INSERT INTO sync_runs (synced, skipped, errors, created_at) VALUES (?, ?, ?, ?)').run(
            input.synced,
            input.skipped,
            input.errors,
            new Date().toISOString(),
        );
    }

    private ensurePostColumn(columnName: string, definition: string): void {
        const columns = this.db.query('PRAGMA table_info(posts)').all() as Array<{ name: string }>;
        const hasColumn = columns.some((column) => column.name === columnName);
        if (!hasColumn) {
            this.db.exec(`ALTER TABLE posts ADD COLUMN ${columnName} ${definition}`);
        }
    }
}
