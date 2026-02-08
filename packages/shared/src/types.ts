// Placeholder - will be implemented in Phase 2
export interface BlogPost {
    id: string;
    title: string;
    slug: string;
    summary: string;
    author: string;
    tags: string[];
    status: 'draft' | 'pending' | 'ready';
    publishedAt: Date | null;
    bannerImageUrl: string | null;
    createdAt: Date;
    updatedAt: Date;
}

export type PostStatus = BlogPost['status'];
