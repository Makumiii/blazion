import type { BlogPost, PostStatus } from '@blog-engine/shared';
import { normalizeTags, slugify } from '@blog-engine/shared';
import { createHash } from 'node:crypto';
import { Client } from '@notionhq/client';
import type {
    PageObjectResponse,
    PartialPageObjectResponse,
    QueryDatabaseParameters,
    QueryDatabaseResponse,
} from '@notionhq/client/build/src/api-endpoints';
import { NotionAPI } from 'notion-client';

interface NotionPost extends BlogPost {
    notionUrl: string;
}

function readTitleProperty(result: QueryDatabaseResponse['results'][number], key: string): string {
    const page = result as Record<string, unknown>;
    const properties = page.properties as Record<string, any> | undefined;
    const prop = properties?.[key];
    if (!prop || prop.type !== 'title') {
        return '';
    }
    return prop.title.map((item: any) => item.plain_text).join('').trim();
}

function readRichTextProperty(
    result: QueryDatabaseResponse['results'][number],
    key: string,
): string {
    const page = result as Record<string, unknown>;
    const properties = page.properties as Record<string, any> | undefined;
    const prop = properties?.[key];
    if (!prop || prop.type !== 'rich_text') {
        return '';
    }
    return prop.rich_text.map((item: any) => item.plain_text).join('').trim();
}

function readAuthorProperty(
    result: QueryDatabaseResponse['results'][number],
    key: string,
): { name: string; email: string | null; avatarUrl: string | null } {
    const page = result as Record<string, unknown>;
    const properties = page.properties as Record<string, any> | undefined;
    const prop = properties?.[key];
    if (!prop) {
        return { name: '', email: null, avatarUrl: null };
    }

    if (prop.type === 'people' && Array.isArray(prop.people)) {
        const names = prop.people
            .map((person: any) => person?.name ?? person?.person?.email ?? '')
            .filter((name: string) => name.trim().length > 0)
            .join(', ')
            .trim();

        const firstPerson = prop.people.find((person: any) => person && typeof person === 'object');
        const email =
            typeof firstPerson?.person?.email === 'string' ? firstPerson.person.email.trim() : null;
        const avatarUrl =
            typeof firstPerson?.avatar_url === 'string' ? firstPerson.avatar_url.trim() : null;

        return {
            name: names,
            email: email && email.length > 0 ? email : null,
            avatarUrl: avatarUrl && avatarUrl.length > 0 ? avatarUrl : null,
        };
    }

    // Backward compatibility for existing databases that still use rich_text.
    if (prop.type === 'rich_text') {
        return {
            name: prop.rich_text.map((item: any) => item.plain_text).join('').trim(),
            email: null,
            avatarUrl: null,
        };
    }

    return { name: '', email: null, avatarUrl: null };
}

function readStatusProperty(
    result: QueryDatabaseResponse['results'][number],
    key: string,
): PostStatus {
    const page = result as Record<string, unknown>;
    const properties = page.properties as Record<string, any> | undefined;
    const value = properties?.[key];
    const status = value?.type === 'select' ? value.select?.name : undefined;
    if (status === 'draft' || status === 'pending' || status === 'ready') {
        return status;
    }
    return 'draft';
}

function readTagsProperty(result: QueryDatabaseResponse['results'][number], key: string): string[] {
    const page = result as Record<string, unknown>;
    const properties = page.properties as Record<string, any> | undefined;
    const value = properties?.[key];
    if (!value || value.type !== 'multi_select') {
        return [];
    }
    return normalizeTags(
        value.multi_select
            .map((tag: { name: string }) => tag.name)
            .filter((tag: string | undefined): tag is string => Boolean(tag)),
    );
}

function readDateProperty(
    result: QueryDatabaseResponse['results'][number],
    key: string,
): string | null {
    const page = result as Record<string, unknown>;
    const properties = page.properties as Record<string, any> | undefined;
    const value = properties?.[key];
    if (!value || value.type !== 'date') {
        return null;
    }
    return value.date?.start ?? null;
}

function readFileUrlProperty(
    result: QueryDatabaseResponse['results'][number],
    key: string,
): string | null {
    const page = result as Record<string, unknown>;
    const properties = page.properties as Record<string, any> | undefined;
    const value = properties?.[key];
    if (!value || value.type !== 'files' || !Array.isArray(value.files) || value.files.length === 0) {
        return null;
    }

    const first = value.files[0];
    if (first.type === 'external') {
        return first.external?.url ?? null;
    }
    if (first.type === 'file') {
        return first.file?.url ?? null;
    }
    return null;
}

function readCheckboxProperty(
    result: QueryDatabaseResponse['results'][number],
    key: string,
): boolean {
    const page = result as Record<string, unknown>;
    const properties = page.properties as Record<string, any> | undefined;
    const value = properties?.[key];
    if (!value || value.type !== 'checkbox') {
        return false;
    }
    return Boolean(value.checkbox);
}

function readRelationPropertyIds(
    result: QueryDatabaseResponse['results'][number],
    key: string,
): string[] {
    const page = result as Record<string, unknown>;
    const properties = page.properties as Record<string, any> | undefined;
    const value = properties?.[key];
    if (!value || value.type !== 'relation' || !Array.isArray(value.relation)) {
        return [];
    }
    return value.relation
        .map((relation: { id?: string }) => relation.id)
        .filter((id: string | undefined): id is string => Boolean(id));
}

export class NotionService {
    private readonly client: Client;
    private readonly notionApi: NotionAPI;

    public constructor(integrationKey: string) {
        this.client = new Client({ auth: integrationKey });
        this.notionApi = new NotionAPI();
    }

    public async getDatabasePosts(databaseId: string): Promise<NotionPost[]> {
        const posts: NotionPost[] = [];
        let cursor: string | undefined;
        let hasMore = true;

        while (hasMore) {
            const query: QueryDatabaseParameters = {
                database_id: databaseId,
                start_cursor: cursor,
                page_size: 100,
            };
            const response = await this.withRetry(() => this.client.databases.query(query));

            for (const result of response.results) {
                if (!isPageObjectResponse(result)) {
                    continue;
                }

                const title = readTitleProperty(result, 'Title');
                const slugInput = readRichTextProperty(result, 'Slug');
                const slug = slugify(slugInput || title);
                if (!title || !slug) {
                    continue;
                }

                const summary = readRichTextProperty(result, 'Summary');
                const authorInfo = readAuthorProperty(result, 'Author');
                const tags = readTagsProperty(result, 'Tags');
                const status = readStatusProperty(result, 'Status');
                const publishedAt = readDateProperty(result, 'Published');
                const bannerImageUrl = readFileUrlProperty(result, 'Banner');
                const featured = readCheckboxProperty(result, 'Featured');
                const relatedPostIds = readRelationPropertyIds(result, 'Related Posts');

                posts.push({
                    id: result.id,
                    notionPageId: result.id,
                    title,
                    slug,
                    summary: summary || null,
                    author: authorInfo.name || null,
                    authorEmail: authorInfo.email,
                    authorAvatarUrl:
                        authorInfo.avatarUrl ?? (authorInfo.email ? toGravatarUrl(authorInfo.email) : null),
                    tags,
                    status,
                    publishedAt,
                    bannerImageUrl,
                    readTimeMinutes: null,
                    featured,
                    relatedPostIds,
                    isPublic: Boolean(result.public_url),
                    notionUrl: result.url,
                    createdAt: result.created_time,
                    updatedAt: result.last_edited_time,
                });
            }

            hasMore = response.has_more;
            cursor = response.next_cursor ?? undefined;
        }

        return posts;
    }

    public getRecordMap(pageId: string): Promise<unknown> {
        return this.withRetry(() => this.notionApi.getPage(pageId));
    }

    public async getBlockContent(pageId: string): Promise<unknown[]> {
        const blocks: unknown[] = [];
        let cursor: string | undefined;
        let hasMore = true;

        while (hasMore) {
            const response = await this.withRetry(() =>
                this.client.blocks.children.list({
                    block_id: pageId,
                    start_cursor: cursor,
                    page_size: 100,
                }),
            );

            blocks.push(...response.results);
            hasMore = response.has_more;
            cursor = response.next_cursor ?? undefined;
        }

        return blocks;
    }

    public async estimateReadTime(pageId: string, isPublic: boolean): Promise<number | null> {
        try {
            if (isPublic) {
                const recordMap = await this.getRecordMap(pageId);
                return wordsToMinutes(wordsFromRecordMap(recordMap));
            }
        } catch {
            // Fall back to block API if recordMap is unavailable.
        }

        try {
            const blocks = await this.getBlockContent(pageId);
            return wordsToMinutes(wordsFromBlocks(blocks));
        } catch {
            return null;
        }
    }

    private async withRetry<T>(fn: () => Promise<T>, maxAttempts = 4): Promise<T> {
        let lastError: unknown;
        for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
            try {
                return await fn();
            } catch (error) {
                lastError = error;
                const retryable = isRetryableNotionError(error);
                if (!retryable || attempt === maxAttempts) {
                    throw error;
                }
                const backoffMs = Math.min(4000, 300 * 2 ** (attempt - 1));
                await Bun.sleep(backoffMs);
            }
        }

        throw lastError;
    }
}

function isPageObjectResponse(
    result: QueryDatabaseResponse['results'][number],
): result is PageObjectResponse {
    return (
        result.object === 'page' &&
        'url' in result &&
        'created_time' in result &&
        'last_edited_time' in result &&
        !isPartialPageObjectResponse(result)
    );
}

function isPartialPageObjectResponse(result: unknown): result is PartialPageObjectResponse {
    if (typeof result !== 'object' || result === null) {
        return false;
    }
    return !('properties' in result);
}

function isRetryableNotionError(error: unknown): boolean {
    if (typeof error !== 'object' || error === null) {
        return false;
    }

    const candidate = error as { code?: string; status?: number };
    return (
        candidate.code === 'rate_limited' ||
        candidate.code === 'service_unavailable' ||
        candidate.code === 'internal_server_error' ||
        candidate.status === 408 ||
        candidate.status === 429 ||
        candidate.status === 500 ||
        candidate.status === 502 ||
        candidate.status === 503 ||
        candidate.status === 504
    );
}

function wordsToMinutes(words: number): number | null {
    if (words <= 0) {
        return null;
    }
    return Math.max(1, Math.ceil(words / 220));
}

function countWords(text: string): number {
    if (!text) {
        return 0;
    }
    return text
        .trim()
        .split(/\s+/)
        .filter(Boolean).length;
}

function wordsFromRichTextArray(entries: unknown): number {
    if (!Array.isArray(entries)) {
        return 0;
    }

    let total = 0;
    for (const entry of entries) {
        if (typeof entry === 'string') {
            total += countWords(entry);
            continue;
        }
        if (Array.isArray(entry) && typeof entry[0] === 'string') {
            total += countWords(entry[0]);
        }
    }
    return total;
}

function wordsFromRecordMap(recordMap: unknown): number {
    const blockMap = (recordMap as { block?: Record<string, unknown> } | null)?.block;
    if (!blockMap || typeof blockMap !== 'object') {
        return 0;
    }

    let total = 0;
    for (const blockEntry of Object.values(blockMap)) {
        const properties = (blockEntry as { value?: { properties?: Record<string, unknown> } } | null)?.value
            ?.properties;
        if (!properties || typeof properties !== 'object') {
            continue;
        }

        for (const value of Object.values(properties)) {
            total += wordsFromRichTextArray(value);
        }
    }

    return total;
}

function wordsFromBlocks(blocks: unknown[]): number {
    let total = 0;

    for (const block of blocks) {
        if (!block || typeof block !== 'object') {
            continue;
        }
        const typedBlock = block as Record<string, any>;
        const blockType = typedBlock.type;
        if (typeof blockType !== 'string') {
            continue;
        }
        const payload = typedBlock[blockType];
        if (!payload || typeof payload !== 'object') {
            continue;
        }

        if (Array.isArray(payload.rich_text)) {
            for (const rich of payload.rich_text) {
                if (typeof rich?.plain_text === 'string') {
                    total += countWords(rich.plain_text);
                }
            }
        }

        if (Array.isArray(payload.caption)) {
            for (const rich of payload.caption) {
                if (typeof rich?.plain_text === 'string') {
                    total += countWords(rich.plain_text);
                }
            }
        }
    }

    return total;
}

function toGravatarUrl(email: string): string {
    const hash = createHash('md5').update(email.trim().toLowerCase()).digest('hex');
    return `https://www.gravatar.com/avatar/${hash}?d=404&s=128`;
}
