import type { BlogPost, PostStatus } from '@blog-engine/shared';
import { normalizeTags, slugify } from '@blog-engine/shared';
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
                const author = readRichTextProperty(result, 'Author');
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
                    author: author || null,
                    tags,
                    status,
                    publishedAt,
                    bannerImageUrl,
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
