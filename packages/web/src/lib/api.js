function apiBaseUrl() {
    return (
        process.env.BLAZION_API_URL ??
        process.env.NEXT_PUBLIC_BLAZION_API_URL ??
        'http://localhost:3000'
    );
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

    const url = `${apiBaseUrl()}/api/posts?${params.toString()}`;
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
    const url = `${apiBaseUrl()}/api/posts/${encodeURIComponent(slug)}`;
    const data = await safeJson(url, options);
    return data?.data ?? null;
}

export async function fetchPostContent(slug, options) {
    const url = `${apiBaseUrl()}/api/posts/${encodeURIComponent(slug)}/content`;
    return safeJson(url, { ...options, timeoutMs: 10000 });
}

export async function fetchPostRecommendations(slug, input, options) {
    const params = new URLSearchParams();
    if (input?.limit) {
        params.set('limit', String(input.limit));
    }

    const query = params.toString();
    const url = `${apiBaseUrl()}/api/posts/${encodeURIComponent(slug)}/recommendations${query ? `?${query}` : ''}`;
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
    return {
        socials: data?.data?.socials ?? {},
        site: {
            homeHeader:
                data?.data?.site?.homeHeader ??
                'Stories from your Notion publication',
        },
    };
}
