import type { BlogPost } from '@blazion/shared';

export interface FacetOption {
    value: string;
    count: number;
}

export interface PostFacets {
    authors: FacetOption[];
    segments: FacetOption[];
}

export interface AppliedFilters {
    q: string;
    dateFrom: string;
    dateTo: string;
    tags: string[];
    authors: string[];
    segments: string[];
    featuredOnly: boolean;
    sort: 'newest' | 'oldest';
}

export interface PostsResponse {
    data: BlogPost[];
    pagination: {
        page: number;
        limit: number;
        total: number;
        totalPages: number;
    };
    facets: PostFacets;
    appliedFilters: AppliedFilters;
}

export interface PostResponse {
    data: BlogPost;
}

export interface RecommendationsResponse {
    data: BlogPost[];
    strategy: 'related_ids' | 'tags' | 'segment' | 'featured' | 'latest';
}

export interface SiteResponse {
    data: {
        socials: {
            linkedin?: string;
            x?: string;
            instagram?: string;
            linktree?: string;
            linkedtree?: string;
            email?: string;
            phonenumber?: string;
            facebook?: string;
            github?: string;
        };
        share: {
            providers: Array<'x' | 'whatsapp' | 'facebook' | 'linkedin' | 'instagram' | 'telegram' | 'reddit' | 'email'>;
        };
        site: {
            homeHeader: string;
        };
    };
}

export interface PostContentResponse {
    recordMap: Record<string, unknown>;
    blocks?: unknown[];
    renderMode: 'recordMap' | 'blocks';
}

export interface ApiErrorPayload {
    error: string;
    message: string;
    details?: unknown;
}

export type PostSort = 'newest' | 'oldest';

export interface ListPostsParams {
    page?: number;
    limit?: number;
    q?: string;
    tags?: string;
    author?: string;
    authors?: string;
    segment?: string;
    segments?: string;
    featured?: string;
    dateFrom?: string;
    dateTo?: string;
    sort?: PostSort;
}
