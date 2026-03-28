import type { MetadataRoute } from 'next';
import { resolveSiteUrl } from '@blazion/pack-blog-web/seo';

import { fetchPosts, fetchSiteSettings } from '../lib/api';

type SitemapPost = {
    slug: string;
    updatedAt: string | null;
    publishedAt: string | null;
    tags?: string[] | null;
};

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
    const siteSettings = await fetchSiteSettings({ revalidate: 300 });
    if (!siteSettings.site.seo.robots.index) {
        return [];
    }

    const siteUrl = resolveSiteUrl(process.env.NEXT_PUBLIC_SITE_URL);
    const entries: MetadataRoute.Sitemap = [
        {
            url: new URL('/', siteUrl).toString(),
            changeFrequency: 'daily',
            priority: 1,
        },
        {
            url: new URL('/about', siteUrl).toString(),
            changeFrequency: 'monthly',
            priority: 0.5,
        },
    ];

    const posts: SitemapPost[] = [];
    let page = 1;
    let totalPages = 1;

    while (page <= totalPages) {
        const response = await fetchPosts(
            {
                page,
                limit: 100,
                sort: 'newest',
            },
            { revalidate: 3600 },
        );

        posts.push(...response.data);
        totalPages = response.pagination.totalPages;
        if (totalPages === 0 || page >= totalPages) {
            break;
        }
        page += 1;
    }

    const tagSet = new Set<string>();
    for (const post of posts) {
        entries.push({
            url: new URL(`/posts/${encodeURIComponent(post.slug)}`, siteUrl).toString(),
            lastModified: post.updatedAt || post.publishedAt || undefined,
            changeFrequency: 'weekly',
            priority: 0.8,
        });

        for (const tag of post.tags ?? []) {
            if (tag.trim().length > 0) {
                tagSet.add(tag);
            }
        }
    }

    for (const tag of tagSet) {
        entries.push({
            url: new URL(`/tags/${encodeURIComponent(tag)}`, siteUrl).toString(),
            changeFrequency: 'weekly',
            priority: 0.6,
        });
    }

    return entries;
}
