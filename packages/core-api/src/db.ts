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
    segment: string | null;
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
    q: string;
    dateFrom: string;
    dateTo: string;
    tags: string[];
    authors: string[];
    segments: string[];
    featuredOnly: boolean;
    sort: 'newest' | 'oldest';
}

export interface PostFacets {
    authors: Array<{ value: string; count: number }>;
    segments: Array<{ value: string; count: number }>;
}

export class DatabaseService {
    private readonly db: Database;

    public constructor(dbPath: string) {
        const resolvedPath = path.resolve(dbPath);
        const dir = path.dirname(resolvedPath);
        fs.mkdirSync(dir, { recursive: true, mode: 0o700 });
        this.trySetPermissions(dir, 0o700);
        this.warnIfPathLooksPublic(resolvedPath);

        this.db = new Database(resolvedPath, { create: true });
        this.db.exec('PRAGMA journal_mode = WAL');
        this.trySetPermissions(resolvedPath, 0o600);
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
                segment TEXT,
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
                removed INTEGER NOT NULL DEFAULT 0,
                created_at TEXT NOT NULL
            );

            CREATE TABLE IF NOT EXISTS pack_bindings (
                pack_name TEXT PRIMARY KEY,
                notion_database_id TEXT NOT NULL,
                updated_at TEXT NOT NULL
            );
        `);

        this.ensurePostColumn('featured', 'INTEGER NOT NULL DEFAULT 0');
        this.ensurePostColumn('related_post_ids_json', "TEXT NOT NULL DEFAULT '[]'");
        this.ensurePostColumn('read_time_minutes', 'INTEGER');
        this.ensurePostColumn('author_email', 'TEXT');
        this.ensurePostColumn('author_avatar_url', 'TEXT');
        this.ensurePostColumn('segment', 'TEXT');
        this.ensureSyncRunColumn('removed', 'INTEGER NOT NULL DEFAULT 0');
    }

    public isConnected(): boolean {
        const row = this.db.query('SELECT 1 as ok').get() as { ok: number } | null;
        return row?.ok === 1;
    }

    public upsertPost(post: BlogPost & { notionUrl: string }): void {
        const statement = this.db.query(`
            INSERT INTO posts (
                id, notion_page_id, title, slug, summary, author, tags_json, status,
                author_email, author_avatar_url, segment,
                published_at, banner_image_url, read_time_minutes, featured, related_post_ids_json, is_public,
                notion_url, created_at, updated_at
            ) VALUES (
                ?, ?, ?, ?, ?, ?, ?, ?,
                ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?
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
                segment = excluded.segment,
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
            post.segment,
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

    public recordSyncRun(input: { synced: number; skipped: number; errors: number; removed?: number }): void {
        this.db
            .query('INSERT INTO sync_runs (synced, skipped, errors, removed, created_at) VALUES (?, ?, ?, ?, ?)')
            .run(
            input.synced,
            input.skipped,
            input.errors,
            input.removed ?? 0,
            new Date().toISOString(),
            );
    }

    public setPackDatabaseId(packName: string, notionDatabaseId: string): void {
        this.db
            .query(
                `
                INSERT INTO pack_bindings (pack_name, notion_database_id, updated_at)
                VALUES (?, ?, ?)
                ON CONFLICT(pack_name) DO UPDATE SET
                    notion_database_id = excluded.notion_database_id,
                    updated_at = excluded.updated_at
                `,
            )
            .run(packName, notionDatabaseId, new Date().toISOString());
    }

    public getPackDatabaseId(packName: string): string | null {
        const row = this.db
            .query('SELECT notion_database_id FROM pack_bindings WHERE pack_name = ? LIMIT 1')
            .get(packName) as { notion_database_id: string } | null;

        return row?.notion_database_id ?? null;
    }

    public listReadyPosts(options: ListPostsOptions): { data: StoredPost[]; total: number; facets: PostFacets } {
        const where: string[] = ['status = ?'];
        const params: Array<string | number> = ['ready'];

        if (options.q.length > 0) {
            where.push('(LOWER(title) LIKE ? OR LOWER(COALESCE(summary, \'\')) LIKE ?)');
            const pattern = `%${options.q.toLowerCase()}%`;
            params.push(pattern, pattern);
        }

        if (options.dateFrom.length > 0) {
            where.push('COALESCE(published_at, created_at) >= ?');
            params.push(options.dateFrom);
        }

        if (options.dateTo.length > 0) {
            where.push('COALESCE(published_at, created_at) <= ?');
            params.push(options.dateTo);
        }

        if (options.authors.length > 0) {
            const placeholders = options.authors.map(() => '?').join(', ');
            where.push(`LOWER(COALESCE(author, '')) IN (${placeholders})`);
            for (const author of options.authors) {
                params.push(author.toLowerCase());
            }
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

        if (options.segments.length > 0) {
            const placeholders = options.segments.map(() => '?').join(', ');
            where.push(`LOWER(COALESCE(segment, '')) IN (${placeholders})`);
            for (const segment of options.segments) {
                params.push(segment.toLowerCase());
            }
        }

        if (options.featuredOnly) {
            where.push('featured = 1');
        }

        const whereClause = where.length > 0 ? `WHERE ${where.join(' AND ')}` : '';
        const totalRow = this.db
            .query(`SELECT COUNT(*) as count FROM posts ${whereClause}`)
            .get(...params) as { count: number } | null;
        const total = totalRow?.count ?? 0;

        const offset = (options.page - 1) * options.limit;
        const sortDirection = options.sort === 'oldest' ? 'ASC' : 'DESC';
        const rows = this.db
            .query(
                `SELECT * FROM posts ${whereClause}
                 ORDER BY COALESCE(published_at, created_at) ${sortDirection}, created_at ${sortDirection}
                 LIMIT ? OFFSET ?`,
            )
            .all(...params, options.limit, offset) as PostRow[];

        return {
            data: rows.map(mapRowToPost),
            total,
            facets: this.getReadyPostFacets(),
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

    public listAllReadyPosts(): StoredPost[] {
        const rows = this.db
            .query(
                `SELECT * FROM posts
                 WHERE status = ?
                 ORDER BY COALESCE(published_at, created_at) DESC, created_at DESC`,
            )
            .all('ready') as PostRow[];

        return rows.map(mapRowToPost);
    }

    public deletePostsNotInNotionIds(notionPageIds: string[]): number {
        if (notionPageIds.length === 0) {
            const result = this.db.query('DELETE FROM posts').run() as { changes?: number };
            return result.changes ?? 0;
        }

        const placeholders = notionPageIds.map(() => '?').join(', ');
        const query = `DELETE FROM posts WHERE notion_page_id NOT IN (${placeholders})`;
        const result = this.db.query(query).run(...notionPageIds) as { changes?: number };
        return result.changes ?? 0;
    }

    private getReadyPostFacets(): PostFacets {
        const rows = this.db
            .query(
                `SELECT author, segment
                 FROM posts
                 WHERE status = ?`,
            )
            .all('ready') as Array<{ author: string | null; segment: string | null }>;

        const authors = buildFacetOptions(rows.map((row) => row.author));
        const segments = buildFacetOptions(rows.map((row) => row.segment));
        return { authors, segments };
    }

    private ensurePostColumn(columnName: string, definition: string): void {
        const columns = this.db.query('PRAGMA table_info(posts)').all() as Array<{ name: string }>;
        const hasColumn = columns.some((column) => column.name === columnName);
        if (!hasColumn) {
            this.db.exec(`ALTER TABLE posts ADD COLUMN ${columnName} ${definition}`);
        }
    }

    private ensureSyncRunColumn(columnName: string, definition: string): void {
        const columns = this.db.query('PRAGMA table_info(sync_runs)').all() as Array<{ name: string }>;
        const hasColumn = columns.some((column) => column.name === columnName);
        if (!hasColumn) {
            this.db.exec(`ALTER TABLE sync_runs ADD COLUMN ${columnName} ${definition}`);
        }
    }

    private trySetPermissions(targetPath: string, mode: number): void {
        try {
            fs.chmodSync(targetPath, mode);
        } catch (error) {
            console.warn(`Could not enforce secure permissions on ${targetPath}`, error);
        }
    }

    private warnIfPathLooksPublic(resolvedPath: string): void {
        const normalized = resolvedPath.toLowerCase();
        const flaggedSegments = ['/public/', '/.next/', '/dist/', '/coverage/'];
        if (flaggedSegments.some((segment) => normalized.includes(segment))) {
            console.warn(
                `Database path appears to be inside a public/build-like directory: ${resolvedPath}. ` +
                    'Use a private path (for example ./data/blog.db).',
            );
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
        segment: row.segment,
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

function buildFacetOptions(values: Array<string | null>): Array<{ value: string; count: number }> {
    const map = new Map<string, { value: string; count: number }>();

    for (const raw of values) {
        const value = raw?.trim();
        if (!value) {
            continue;
        }

        const key = value.toLowerCase();
        const existing = map.get(key);
        if (existing) {
            existing.count += 1;
            continue;
        }

        map.set(key, { value, count: 1 });
    }

    return Array.from(map.values()).sort((a, b) => {
        if (b.count !== a.count) {
            return b.count - a.count;
        }
        return a.value.localeCompare(b.value);
    });
}
