import { defaultBlogEngineConfig } from '@blazion/shared';

function apiBaseUrl() {
    const configured =
        process.env.BLAZION_API_URL ??
        process.env.NEXT_PUBLIC_BLAZION_API_URL;
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

async function safeJson(url, options) {
    const controller = new AbortController();
    const timeoutMs = options?.timeoutMs ?? 2500;
    const timeout = setTimeout(() => controller.abort(), timeoutMs);
    const fetchOptions = {
        next: options?.revalidate ? { revalidate: options.revalidate } : undefined,
        signal: controller.signal,
    };

    if (!options?.revalidate) {
        fetchOptions.cache = options?.cache ?? 'no-store';
    } else if (options?.cache) {
        fetchOptions.cache = options.cache;
    }

    try {
        const response = await fetch(url, fetchOptions);
        clearTimeout(timeout);
        if (!response.ok) {
            return null;
        }
        return await response.json();
    } catch {
        clearTimeout(timeout);
        return null;
    }
}

export async function fetchPosts(input, options) {
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
    if (input.featured) params.set('featured', String(input.featured));
    if (input.sort) params.set('sort', input.sort);

    const url = `${apiBaseUrl()}/api/blog/posts?${params.toString()}`;
    const data = await safeJson(url, options);
    if (data) return data;

    return {
        data: [],
        pagination: {
            page: input.page ?? 1,
            limit: input.limit ?? 10,
            total: 0,
            totalPages: 0,
        },
        facets: {
            authors: [],
            segments: [],
        },
        appliedFilters: {
            q: input.q ?? '',
            dateFrom: input.dateFrom ?? '',
            dateTo: input.dateTo ?? '',
            tags: [],
            authors: [],
            segments: [],
            featuredOnly: false,
            sort: input.sort ?? 'newest',
        },
    };
}

export async function fetchPost(slug, options) {
    const url = `${apiBaseUrl()}/api/blog/posts/${encodeURIComponent(slug)}`;
    const data = await safeJson(url, options);
    return data?.data ?? null;
}

export async function fetchPostContent(slug, options) {
    const url = `${apiBaseUrl()}/api/blog/posts/${encodeURIComponent(slug)}/content`;
    return safeJson(url, { ...options, timeoutMs: 10000 });
}

export async function fetchPostRecommendations(slug, input, options) {
    const params = new URLSearchParams();
    if (input?.limit) {
        params.set('limit', String(input.limit));
    }

    const query = params.toString();
    const url = `${apiBaseUrl()}/api/blog/posts/${encodeURIComponent(slug)}/recommendations${query ? `?${query}` : ''}`;
    const data = await safeJson(url, options);
    if (data) {
        return data;
    }

    return {
        data: [],
        strategy: 'latest',
    };
}

export async function fetchSiteSettings(options) {
    const url = `${apiBaseUrl()}/api/site`;
    const data = await safeJson(url, options);
    const defaultSite = defaultBlogEngineConfig.site;
    return {
        socials: data?.data?.socials ?? {},
        share: {
            providers: Array.isArray(data?.data?.share?.providers)
                ? data.data.share.providers
                : ['x', 'whatsapp', 'facebook', 'linkedin'],
        },
        site: {
            name:
                typeof data?.data?.site?.name === 'string' && data.data.site.name.trim().length > 0
                    ? data.data.site.name
                    : defaultSite.name,
            homeHeader:
                typeof data?.data?.site?.homeHeader === 'string' && data.data.site.homeHeader.trim().length > 0
                    ? data.data.site.homeHeader
                    : defaultSite.homeHeader,
            seo: {
                description:
                    typeof data?.data?.site?.seo?.description === 'string' &&
                    data.data.site.seo.description.trim().length > 0
                        ? data.data.site.seo.description
                        : defaultSite.seo.description,
                locale:
                    typeof data?.data?.site?.seo?.locale === 'string' &&
                    data.data.site.seo.locale.trim().length > 0
                        ? data.data.site.seo.locale
                        : defaultSite.seo.locale,
                keywords: Array.isArray(data?.data?.site?.seo?.keywords)
                    ? data.data.site.seo.keywords.filter(
                          (keyword) => typeof keyword === 'string' && keyword.trim().length > 0,
                      )
                    : defaultSite.seo.keywords,
                defaultOgImage:
                    typeof data?.data?.site?.seo?.defaultOgImage === 'string' &&
                    data.data.site.seo.defaultOgImage.trim().length > 0
                        ? data.data.site.seo.defaultOgImage
                        : defaultSite.seo.defaultOgImage,
                twitterHandle:
                    typeof data?.data?.site?.seo?.twitterHandle === 'string' &&
                    data.data.site.seo.twitterHandle.trim().length > 0
                        ? data.data.site.seo.twitterHandle
                        : defaultSite.seo.twitterHandle,
                robots: {
                    index:
                        typeof data?.data?.site?.seo?.robots?.index === 'boolean'
                            ? data.data.site.seo.robots.index
                            : defaultSite.seo.robots.index,
                    follow:
                        typeof data?.data?.site?.seo?.robots?.follow === 'boolean'
                            ? data.data.site.seo.robots.follow
                            : defaultSite.seo.robots.follow,
                },
            },
        },
    };
}
