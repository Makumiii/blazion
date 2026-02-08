import type { BlogEngineConfig } from '@blog-engine/shared';

import { DatabaseService } from './db';
import { NotionService } from './notion';

export interface SyncResult {
    synced: number;
    skipped: number;
    errors: number;
}

export class SyncService {
    private readonly notion: NotionService;
    private readonly db: DatabaseService;
    private readonly config: BlogEngineConfig;

    public constructor(input: {
        notion: NotionService;
        db: DatabaseService;
        config: BlogEngineConfig;
    }) {
        this.notion = input.notion;
        this.db = input.db;
        this.config = input.config;
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
        };

        const posts = await this.notion.getDatabasePosts(this.config.notion.databaseId);

        for (const post of posts) {
            try {
                if (this.config.sync.publicOnly && !post.isPublic) {
                    result.skipped += 1;
                    continue;
                }

                if (input.refreshOnly && !post.bannerImageUrl) {
                    result.skipped += 1;
                    continue;
                }

                this.db.upsertPost(post);
                result.synced += 1;
            } catch (error) {
                console.error('Failed to sync post', post.slug, error);
                result.errors += 1;
            }
        }

        this.db.recordSyncRun(result);
        return result;
    }
}
