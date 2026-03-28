import type { Metadata, MetadataRoute } from 'next';
import type { BlogPost } from '@blazion/shared';
import { defaultBlogEngineConfig } from '@blazion/shared';

import type { SiteResponse } from './api/types';

export type SiteSettings = SiteResponse['data'];

export interface HomeSearchState {
    page?: number;
    q?: string | null;
    tab?: string | null;
    segment?: string | null;
}

interface SiteMetadataInput {
    siteSettings: SiteSettings;
    siteUrl: string;
}

interface PageMetadataInput extends SiteMetadataInput {
    title?: string;
    description: string;
    path: string;
    keywords?: string[];
    robots?: Metadata['robots'];
}

interface TagMetadataInput extends SiteMetadataInput {
    tag: string;
    postCount: number;
}

interface PostMetadataInput extends SiteMetadataInput {
    post: BlogPost;
    authorName?: string | null;
}

interface ArticleJsonLdInput extends SiteMetadataInput {
    post: BlogPost;
    authorName?: string | null;
}

function normalizeSiteSettings(siteSettings: SiteSettings): SiteSettings {
    const defaults = defaultBlogEngineConfig.site;

    return {
        socials: siteSettings.socials ?? {},
        share: siteSettings.share ?? { providers: ['x', 'whatsapp', 'facebook', 'linkedin'] },
        site: {
            name: siteSettings.site?.name?.trim() || defaults.name,
            homeHeader: siteSettings.site?.homeHeader?.trim() || defaults.homeHeader,
            seo: {
                description: siteSettings.site?.seo?.description?.trim() || defaults.seo.description,
                locale: siteSettings.site?.seo?.locale?.trim() || defaults.seo.locale,
                keywords:
                    siteSettings.site?.seo?.keywords?.filter(
                        (keyword) => typeof keyword === 'string' && keyword.trim().length > 0,
                    ) ?? defaults.seo.keywords,
                defaultOgImage: siteSettings.site?.seo?.defaultOgImage || defaults.seo.defaultOgImage,
                twitterHandle: siteSettings.site?.seo?.twitterHandle || defaults.seo.twitterHandle,
                robots: {
                    index: siteSettings.site?.seo?.robots?.index ?? defaults.seo.robots.index,
                    follow: siteSettings.site?.seo?.robots?.follow ?? defaults.seo.robots.follow,
                },
            },
        },
    };
}

function absolutePath(pathname: string): string {
    return pathname.startsWith('/') ? pathname : `/${pathname}`;
}

export function resolveSiteUrl(siteUrl: string | undefined): string {
    const trimmed = siteUrl?.trim();
    if (trimmed && trimmed.length > 0) {
        return trimmed;
    }
    return 'http://localhost:3001';
}

export function localeToLanguageTag(locale: string): string {
    return locale.replace('_', '-');
}

function absoluteUrl(siteUrl: string, pathname: string): string {
    return new URL(absolutePath(pathname), siteUrl).toString();
}

function uniqueKeywords(values: Array<string | null | undefined>): string[] {
    return Array.from(
        new Set(
            values
                .flatMap((value) => (value ? [value.trim()] : []))
                .filter((value) => value.length > 0),
        ),
    );
}

function resolveImages(siteSettings: SiteSettings, overrideImage?: string | null, altText?: string) {
    const imageUrl = overrideImage || siteSettings.site.seo.defaultOgImage;
    if (!imageUrl) {
        return undefined;
    }
    return [
        {
            url: imageUrl,
            alt: altText || siteSettings.site.name,
        },
    ];
}

function resolveTwitterCard(images: Array<{ url: string; alt: string }> | undefined): 'summary' | 'summary_large_image' {
    return images && images.length > 0 ? 'summary_large_image' : 'summary';
}

export function buildSiteMetadata(input: SiteMetadataInput): Metadata {
    const siteUrl = resolveSiteUrl(input.siteUrl);
    const siteSettings = normalizeSiteSettings(input.siteSettings);
    const images = resolveImages(siteSettings);

    return {
        metadataBase: new URL(siteUrl),
        title: {
            default: siteSettings.site.name,
            template: `%s | ${siteSettings.site.name}`,
        },
        description: siteSettings.site.seo.description,
        keywords: siteSettings.site.seo.keywords.length > 0 ? siteSettings.site.seo.keywords : undefined,
        alternates: {
            canonical: '/',
        },
        robots: {
            index: siteSettings.site.seo.robots.index,
            follow: siteSettings.site.seo.robots.follow,
        },
        openGraph: {
            type: 'website',
            siteName: siteSettings.site.name,
            title: siteSettings.site.name,
            description: siteSettings.site.seo.description,
            url: siteUrl,
            locale: siteSettings.site.seo.locale,
            images,
        },
        twitter: {
            card: resolveTwitterCard(images),
            site: siteSettings.site.seo.twitterHandle,
            creator: siteSettings.site.seo.twitterHandle,
            title: siteSettings.site.name,
            description: siteSettings.site.seo.description,
            images: images?.map((image) => image.url),
        },
    };
}

export function buildPageMetadata(input: PageMetadataInput): Metadata {
    const siteUrl = resolveSiteUrl(input.siteUrl);
    const siteSettings = normalizeSiteSettings(input.siteSettings);
    const images = resolveImages(siteSettings);
    const path = absolutePath(input.path);

    return {
        title: input.title,
        description: input.description,
        keywords: input.keywords && input.keywords.length > 0 ? uniqueKeywords(input.keywords) : undefined,
        alternates: {
            canonical: path,
        },
        robots: input.robots,
        openGraph: {
            type: 'website',
            siteName: siteSettings.site.name,
            title: input.title ?? siteSettings.site.name,
            description: input.description,
            url: absoluteUrl(siteUrl, path),
            locale: siteSettings.site.seo.locale,
            images,
        },
        twitter: {
            card: resolveTwitterCard(images),
            site: siteSettings.site.seo.twitterHandle,
            creator: siteSettings.site.seo.twitterHandle,
            title: input.title ?? siteSettings.site.name,
            description: input.description,
            images: images?.map((image) => image.url),
        },
    };
}

export function buildHomeMetadata(input: SiteMetadataInput & { searchState?: HomeSearchState }): Metadata {
    const siteSettings = normalizeSiteSettings(input.siteSettings);
    const page = Math.max(1, Number(input.searchState?.page ?? 1) || 1);
    const query = input.searchState?.q?.trim() ?? '';
    const tab = input.searchState?.tab?.trim().toLowerCase() ?? '';
    const segment = input.searchState?.segment?.trim() ?? '';
    const hasFilters = query.length > 0 || tab === 'featured' || (tab === 'segment' && segment.length > 0);

    let title: string | undefined;
    let description = siteSettings.site.seo.description;
    let canonical = '/';

    if (query.length > 0) {
        title = `Search: ${query}`;
        description = `Search results for "${query}" on ${siteSettings.site.name}.`;
    } else if (tab === 'featured') {
        title = 'Featured';
        description = `Featured articles from ${siteSettings.site.name}.`;
    } else if (tab === 'segment' && segment.length > 0) {
        title = segment;
        description = `Browse ${segment} articles from ${siteSettings.site.name}.`;
    } else if (page > 1) {
        title = `Page ${page}`;
        canonical = `/?page=${page}`;
    }

    return buildPageMetadata({
        siteSettings,
        siteUrl: input.siteUrl,
        title,
        description,
        path: canonical,
        robots: hasFilters
            ? {
                  index: false,
                  follow: true,
              }
            : undefined,
        keywords: uniqueKeywords([
            ...siteSettings.site.seo.keywords,
            query || undefined,
            segment || undefined,
            tab === 'featured' ? 'featured' : undefined,
        ]),
    });
}

export function buildTagMetadata(input: TagMetadataInput): Metadata {
    const siteSettings = normalizeSiteSettings(input.siteSettings);
    const postLabel = input.postCount === 1 ? 'article' : 'articles';

    return buildPageMetadata({
        siteSettings,
        siteUrl: input.siteUrl,
        title: input.tag,
        description: `Browse ${input.postCount} ${postLabel} tagged ${input.tag} on ${siteSettings.site.name}.`,
        path: `/tags/${encodeURIComponent(input.tag)}`,
        keywords: uniqueKeywords([input.tag, ...siteSettings.site.seo.keywords]),
    });
}

export function buildPostMetadata(input: PostMetadataInput): Metadata {
    const siteSettings = normalizeSiteSettings(input.siteSettings);
    const siteUrl = resolveSiteUrl(input.siteUrl);
    const description = input.post.summary?.trim() || siteSettings.site.seo.description;
    const images = resolveImages(siteSettings, input.post.bannerImageUrl, input.post.title);
    const authorName = input.authorName?.trim() || undefined;
    const keywords = uniqueKeywords([
        input.post.title,
        authorName,
        ...(input.post.tags ?? []),
        ...siteSettings.site.seo.keywords,
    ]);

    return {
        title: input.post.title,
        description,
        keywords: keywords.length > 0 ? keywords : undefined,
        authors: authorName ? [{ name: authorName }] : undefined,
        category: input.post.tags?.[0] ?? undefined,
        alternates: {
            canonical: `/posts/${input.post.slug}`,
        },
        openGraph: {
            type: 'article',
            siteName: siteSettings.site.name,
            url: absoluteUrl(siteUrl, `/posts/${input.post.slug}`),
            title: input.post.title,
            description,
            images,
            locale: siteSettings.site.seo.locale,
            publishedTime: input.post.publishedAt ?? undefined,
            modifiedTime: input.post.updatedAt ?? undefined,
            authors: authorName ? [authorName] : undefined,
            tags: input.post.tags,
        },
        twitter: {
            card: resolveTwitterCard(images),
            site: siteSettings.site.seo.twitterHandle,
            creator: siteSettings.site.seo.twitterHandle,
            title: input.post.title,
            description,
            images: images?.map((image) => image.url),
        },
    };
}

export function buildWebsiteJsonLd(input: SiteMetadataInput) {
    const siteSettings = normalizeSiteSettings(input.siteSettings);
    const siteUrl = resolveSiteUrl(input.siteUrl);

    return {
        '@context': 'https://schema.org',
        '@type': 'Blog',
        name: siteSettings.site.name,
        description: siteSettings.site.seo.description,
        url: siteUrl,
        inLanguage: localeToLanguageTag(siteSettings.site.seo.locale),
        potentialAction: {
            '@type': 'SearchAction',
            target: `${siteUrl}/?q={search_term_string}`,
            'query-input': 'required name=search_term_string',
        },
    };
}

export function buildArticleJsonLd(input: ArticleJsonLdInput) {
    const siteSettings = normalizeSiteSettings(input.siteSettings);
    const siteUrl = resolveSiteUrl(input.siteUrl);
    const authorName = input.authorName?.trim() || undefined;
    const imageUrl = input.post.bannerImageUrl || siteSettings.site.seo.defaultOgImage || undefined;

    return {
        '@context': 'https://schema.org',
        '@type': 'Article',
        headline: input.post.title,
        description: input.post.summary ?? siteSettings.site.seo.description,
        image: imageUrl ? [imageUrl] : undefined,
        author: authorName ? [{ '@type': 'Person', name: authorName }] : undefined,
        publisher: {
            '@type': 'Organization',
            name: siteSettings.site.name,
        },
        datePublished: input.post.publishedAt ?? undefined,
        dateModified: input.post.updatedAt ?? undefined,
        keywords: uniqueKeywords([...(input.post.tags ?? []), ...siteSettings.site.seo.keywords]),
        mainEntityOfPage: {
            '@type': 'WebPage',
            '@id': absoluteUrl(siteUrl, `/posts/${input.post.slug}`),
        },
    };
}

export function buildRobotsMetadata(input: SiteMetadataInput): MetadataRoute.Robots {
    const siteUrl = resolveSiteUrl(input.siteUrl);
    const siteSettings = normalizeSiteSettings(input.siteSettings);

    return {
        rules: siteSettings.site.seo.robots.index
            ? {
                  userAgent: '*',
                  allow: '/',
              }
            : {
                  userAgent: '*',
                  disallow: '/',
              },
        sitemap: `${siteUrl}/sitemap.xml`,
    };
}
