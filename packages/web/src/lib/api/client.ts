import { unstable_noStore as noStore } from 'next/cache';

import type {
    ApiErrorPayload,
    ListPostsParams,
    PostContentResponse,
    PostResponse,
    PostsResponse,
    RecommendationsResponse,
    SiteResponse,
} from './types';

export class ApiError extends Error {
    public readonly status: number;
    public readonly payload?: ApiErrorPayload;

    public constructor(message: string, status: number, payload?: ApiErrorPayload) {
        super(message);
        this.status = status;
        this.payload = payload;
    }
}

function apiBaseUrl(): string {
    return (
        process.env.NEXT_PUBLIC_BLAZION_API_URL ||
        process.env.BLAZION_API_URL ||
        'http://localhost:3000'
    );
}

function buildQuery(params: ListPostsParams = {}): string {
    const query = new URLSearchParams();

    for (const [key, value] of Object.entries(params)) {
        if (value === undefined || value === null || value === '') {
            continue;
        }
        query.set(key, String(value));
    }

    const value = query.toString();
    return value.length > 0 ? `?${value}` : '';
}

async function requestJson<T>(path: string, revalidateSeconds: number): Promise<T> {
    const response = await fetch(`${apiBaseUrl()}${path}`, {
        next: {
            revalidate: revalidateSeconds,
        },
    });

    if (!response.ok) {
        let payload: ApiErrorPayload | undefined;
        try {
            payload = (await response.json()) as ApiErrorPayload;
        } catch {
            payload = undefined;
        }

        throw new ApiError(
            payload?.message || payload?.error || `Request failed with status ${response.status}`,
            response.status,
            payload,
        );
    }

    return (await response.json()) as T;
}

export async function getSite(): Promise<SiteResponse> {
    return requestJson<SiteResponse>('/api/site', 300);
}

export async function listPosts(params: ListPostsParams = {}): Promise<PostsResponse> {
    return requestJson<PostsResponse>(`/api/posts${buildQuery(params)}`, 60);
}

export async function getPostBySlug(slug: string): Promise<PostResponse> {
    return requestJson<PostResponse>(`/api/posts/${encodeURIComponent(slug)}`, 120);
}

export async function getPostContent(slug: string): Promise<PostContentResponse> {
    noStore();
    return requestJson<PostContentResponse>(`/api/posts/${encodeURIComponent(slug)}/content`, 0);
}

export async function getRecommendations(slug: string, limit = 3): Promise<RecommendationsResponse> {
    return requestJson<RecommendationsResponse>(
        `/api/posts/${encodeURIComponent(slug)}/recommendations?limit=${limit}`,
        60,
    );
}
