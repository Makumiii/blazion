import fs from 'node:fs';
import path from 'node:path';

import type { BlogPost } from '@blazion/shared';
import { Database } from 'bun:sqlite';

interface PostRow {
    id: string;
    notion_page_id: string;
    title: string;
    slug: string;
    summary: string | null;
    author: string | null;
    author_email: string | null;
    author_avatar_url: string | null;
    tags_json: string;
    status: BlogPost['status'];
    published_at: string | null;
    banner_image_url: string | null;
    read_time_minutes: number | null;
    featured: number;
    related_post_ids_json: string;
    is_public: number;
    notion_url: string;
    created_at: string;
    updated_at: string;
}

export interface StoredPost extends BlogPost {
    notionUrl: string;
}

export interface ListPostsOptions {
    page: number;
    limit: number;
    tags: string[];
    author?: string;
}

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
                author_email TEXT,
                author_avatar_url TEXT,
                tags_json TEXT NOT NULL,
                status TEXT NOT NULL,
                published_at TEXT,
                banner_image_url TEXT,
                read_time_minutes INTEGER,
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
        this.ensurePostColumn('read_time_minutes', 'INTEGER');
        this.ensurePostColumn('author_email', 'TEXT');
        this.ensurePostColumn('author_avatar_url', 'TEXT');
    }

    public isConnected(): boolean {
        const row = this.db.query('SELECT 1 as ok').get() as { ok: number } | null;
        return row?.ok === 1;
    }

    public upsertPost(post: BlogPost & { notionUrl: string }): void {
        const statement = this.db.query(`
            INSERT INTO posts (
                id, notion_page_id, title, slug, summary, author, tags_json, status,
                author_email, author_avatar_url,
                published_at, banner_image_url, read_time_minutes, featured, related_post_ids_json, is_public,
                notion_url, created_at, updated_at
            ) VALUES (
                ?, ?, ?, ?, ?, ?, ?, ?,
                ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?
            )
            ON CONFLICT(notion_page_id) DO UPDATE SET
                id = excluded.id,
                title = excluded.title,
                slug = excluded.slug,
                summary = excluded.summary,
                author = excluded.author,
                author_email = excluded.author_email,
                author_avatar_url = excluded.author_avatar_url,
                tags_json = excluded.tags_json,
                status = excluded.status,
                published_at = excluded.published_at,
                banner_image_url = excluded.banner_image_url,
                read_time_minutes = COALESCE(excluded.read_time_minutes, posts.read_time_minutes),
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
            post.authorEmail,
            post.authorAvatarUrl,
            post.publishedAt,
            post.bannerImageUrl,
            post.readTimeMinutes,
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

    public listReadyPosts(options: ListPostsOptions): { data: StoredPost[]; total: number } {
        const where: string[] = ['status = ?'];
        const params: Array<string | number> = ['ready'];

        if (options.author && options.author.trim()) {
            where.push('LOWER(COALESCE(author, \'\')) = ?');
            params.push(options.author.trim().toLowerCase());
        }

        if (options.tags.length > 0) {
            const placeholders = options.tags.map(() => '?').join(', ');
            where.push(
                `EXISTS (
                    SELECT 1
                    FROM json_each(posts.tags_json)
                    WHERE LOWER(json_each.value) IN (${placeholders})
                )`,
            );
            for (const tag of options.tags) {
                params.push(tag.toLowerCase());
            }
        }

        const whereClause = where.length > 0 ? `WHERE ${where.join(' AND ')}` : '';
        const totalRow = this.db
            .query(`SELECT COUNT(*) as count FROM posts ${whereClause}`)
            .get(...params) as { count: number } | null;
        const total = totalRow?.count ?? 0;

        const offset = (options.page - 1) * options.limit;
        const rows = this.db
            .query(
                `SELECT * FROM posts ${whereClause}
                 ORDER BY COALESCE(published_at, created_at) DESC, created_at DESC
                 LIMIT ? OFFSET ?`,
            )
            .all(...params, options.limit, offset) as PostRow[];

        return {
            data: rows.map(mapRowToPost),
            total,
        };
    }

    public getReadyPostBySlug(slug: string): StoredPost | null {
        const row = this.db
            .query('SELECT * FROM posts WHERE slug = ? AND status = ? LIMIT 1')
            .get(slug, 'ready') as PostRow | null;
        if (!row) {
            return null;
        }
        return mapRowToPost(row);
    }

    private ensurePostColumn(columnName: string, definition: string): void {
        const columns = this.db.query('PRAGMA table_info(posts)').all() as Array<{ name: string }>;
        const hasColumn = columns.some((column) => column.name === columnName);
        if (!hasColumn) {
            this.db.exec(`ALTER TABLE posts ADD COLUMN ${columnName} ${definition}`);
        }
    }
}

function mapRowToPost(row: PostRow): StoredPost {
    return {
        id: row.id,
        notionPageId: row.notion_page_id,
        title: row.title,
        slug: row.slug,
        summary: row.summary,
        author: row.author,
        authorEmail: row.author_email,
        authorAvatarUrl: row.author_avatar_url,
        tags: safeParseStringArray(row.tags_json),
        status: row.status,
        publishedAt: row.published_at,
        bannerImageUrl: row.banner_image_url,
        readTimeMinutes: row.read_time_minutes,
        featured: row.featured === 1,
        relatedPostIds: safeParseStringArray(row.related_post_ids_json),
        isPublic: row.is_public === 1,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
        notionUrl: row.notion_url,
    };
}

function safeParseStringArray(value: string): string[] {
    try {
        const parsed = JSON.parse(value);
        if (Array.isArray(parsed)) {
            return parsed.filter((entry): entry is string => typeof entry === 'string');
        }
    } catch {}
    return [];
}
