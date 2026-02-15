import { z } from 'zod';

export const postStatusSchema = z.enum(['draft', 'pending', 'ready']);
export type PostStatus = z.infer<typeof postStatusSchema>;

export const blogPostSchema = z.object({
    id: z.string().min(1),
    notionPageId: z.string().min(1),
    title: z.string().min(1),
    slug: z.string().min(1),
    summary: z.string().nullable(),
    author: z.string().nullable(),
    authorEmail: z.string().nullable().default(null),
    authorAvatarUrl: z.string().nullable().default(null),
    tags: z.array(z.string()).default([]),
    segment: z.string().nullable().default(null),
    status: postStatusSchema,
    publishedAt: z.string().datetime().nullable(),
    bannerImageUrl: z.string().url().nullable(),
    readTimeMinutes: z.number().int().positive().nullable().default(null),
    featured: z.boolean().default(false),
    relatedPostIds: z.array(z.string()).default([]),
    isPublic: z.boolean().default(false),
    createdAt: z.string().datetime(),
    updatedAt: z.string().datetime(),
});

export type BlogPost = z.infer<typeof blogPostSchema>;

export const paginationSchema = z.object({
    page: z.number().int().positive(),
    limit: z.number().int().positive(),
    total: z.number().int().nonnegative(),
    totalPages: z.number().int().nonnegative(),
});
export type Pagination = z.infer<typeof paginationSchema>;

export const postsQuerySchema = z.object({
    page: z.coerce.number().int().positive().default(1),
    limit: z.coerce.number().int().positive().max(100).default(10),
    q: z.string().optional(),
    dateFrom: z.string().optional(),
    dateTo: z.string().optional(),
    tags: z.string().optional(),
    author: z.string().optional(),
    authors: z.string().optional(),
    segment: z.string().optional(),
    segments: z.string().optional(),
    featured: z.string().optional(),
    sort: z.enum(['newest', 'oldest']).default('newest'),
});
export type PostsQuery = z.infer<typeof postsQuerySchema>;

export const paginatedPostsResponseSchema = z.object({
    data: z.array(blogPostSchema),
    pagination: paginationSchema,
});
export type PaginatedPostsResponse = z.infer<typeof paginatedPostsResponseSchema>;

export const postResponseSchema = z.object({
    data: blogPostSchema,
});
export type PostResponse = z.infer<typeof postResponseSchema>;

export const postContentResponseSchema = z.object({
    recordMap: z.record(z.unknown()),
    renderMode: z.enum(['recordMap', 'blocks']),
});
export type PostContentResponse = z.infer<typeof postContentResponseSchema>;

export const recommendationsResponseSchema = z.object({
    data: z.array(blogPostSchema),
    strategy: z.enum(['related_ids', 'tags', 'segment', 'featured', 'latest']),
});
export type RecommendationsResponse = z.infer<typeof recommendationsResponseSchema>;

export const apiErrorResponseSchema = z.object({
    error: z.string(),
    message: z.string(),
    details: z.unknown().optional(),
});
export type ApiErrorResponse = z.infer<typeof apiErrorResponseSchema>;

export function validatePost(input: unknown): BlogPost {
    return blogPostSchema.parse(input);
}
