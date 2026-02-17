import type { BlogPost } from '@blazion/shared';

type PostFacet = { value: string; count: number };

export type PostsResponse = {
    data: BlogPost[];
    pagination: {
        page: number;
        limit: number;
        total: number;
        totalPages: number;
    };
    facets: {
        authors: PostFacet[];
        segments: PostFacet[];
    };
};

export type SearchIndexResponse = {
    data: BlogPost[];
};

export type PostsQueryInput = {
    page?: number;
    limit?: number;
    q?: string;
    dateFrom?: string;
    dateTo?: string;
    tags?: string;
    author?: string;
    authors?: string;
    segment?: string;
    segments?: string;
    featured?: string;
    sort?: 'newest' | 'oldest';
};

function apiBaseUrl(): string {
    const configured = process.env.NEXT_PUBLIC_BLAZION_API_URL ?? process.env.BLAZION_API_URL;
    if (configured && configured.trim().length > 0) {
        return configured.trim();
    }
    if (process.env.NODE_ENV === 'production') {
        throw new Error(
            'Missing API base URL in production. Set NEXT_PUBLIC_BLAZION_API_URL (or BLAZION_API_URL).',
        );
    }
    return 'http://localhost:3000';
}

async function getJson<T>(path: string): Promise<T> {
    const response = await fetch(`${apiBaseUrl()}${path}`, {
        cache: 'no-store',
    });
    if (!response.ok) {
        throw new Error(`Request failed: ${response.status}`);
    }
    return (await response.json()) as T;
}

export async function fetchPostsClient(input: PostsQueryInput): Promise<PostsResponse> {
    const params = new URLSearchParams();
    if (input.page) params.set('page', String(input.page));
    if (input.limit) params.set('limit', String(input.limit));
    if (input.q) params.set('q', input.q);
    if (input.dateFrom) params.set('dateFrom', input.dateFrom);
    if (input.dateTo) params.set('dateTo', input.dateTo);
    if (input.tags) params.set('tags', input.tags);
    if (input.author) params.set('author', input.author);
    if (input.authors) params.set('authors', input.authors);
    if (input.segment) params.set('segment', input.segment);
    if (input.segments) params.set('segments', input.segments);
    if (input.featured) params.set('featured', input.featured);
    if (input.sort) params.set('sort', input.sort);

    const query = params.toString();
    return getJson<PostsResponse>(`/api/blog/posts${query ? `?${query}` : ''}`);
}

export async function fetchSearchIndexClient(limit = 300): Promise<SearchIndexResponse> {
    return getJson<SearchIndexResponse>(`/api/search-index?limit=${limit}`);
}
