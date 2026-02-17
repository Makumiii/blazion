import type { BlogEngineConfig } from '@blazion/shared';

import { DatabaseService } from './db';
import { NotionService } from './notion';

export interface SyncResult {
    synced: number;
    skipped: number;
    errors: number;
    removed: number;
}

export class SyncService {
    private readonly notion: NotionService;
    private readonly db: DatabaseService;
    private readonly config: BlogEngineConfig;
    private readonly notionDatabaseId: string;

    public constructor(input: {
        notion: NotionService;
        db: DatabaseService;
        config: BlogEngineConfig;
        notionDatabaseId: string;
    }) {
        this.notion = input.notion;
        this.db = input.db;
        this.config = input.config;
        this.notionDatabaseId = input.notionDatabaseId;
    }

    public async syncNow(): Promise<SyncResult> {
        return this.performSync({ refreshOnly: false });
    }

    public async refreshImageUrls(): Promise<SyncResult> {
        return this.performSync({ refreshOnly: true });
    }

    private async performSync(input: { refreshOnly: boolean }): Promise<SyncResult> {
        const result: SyncResult = {
            synced: 0,
            skipped: 0,
            errors: 0,
            removed: 0,
        };

        await this.notion.assertMinimumDatabaseSchema(this.notionDatabaseId);
        const posts = await this.notion.getDatabasePosts(this.notionDatabaseId);
        const desiredNotionPageIds: string[] = [];

        for (const post of posts) {
            try {
                if (post.status !== 'ready') {
                    result.skipped += 1;
                    continue;
                }

                if (this.config.sync.publicOnly && !post.isPublic) {
                    result.skipped += 1;
                    continue;
                }

                desiredNotionPageIds.push(post.notionPageId);

                if (input.refreshOnly && !post.bannerImageUrl) {
                    result.skipped += 1;
                    continue;
                }

                const readTimeMinutes = input.refreshOnly
                    ? post.readTimeMinutes
                    : await this.notion.estimateReadTime(post.notionPageId, post.isPublic);

                this.db.upsertPost({
                    ...post,
                    readTimeMinutes,
                });
                result.synced += 1;
            } catch (error) {
                console.error('Failed to sync post', post.slug, error);
                result.errors += 1;
            }
        }

        result.removed = this.db.deletePostsNotInNotionIds(desiredNotionPageIds);
        this.db.recordSyncRun(result);
        return result;
    }
}
