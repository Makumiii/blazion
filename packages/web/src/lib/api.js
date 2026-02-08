function apiBaseUrl() {
    return process.env.BLOG_ENGINE_API_URL ?? 'http://localhost:3000';
}

async function safeJson(url, options) {
    const controller = new AbortController();
    const timeoutMs = 2500;
    const timeout = setTimeout(() => controller.abort(), timeoutMs);
    try {
        const response = await fetch(url, {
            cache: options?.cache ?? 'no-store',
            next: options?.revalidate ? { revalidate: options.revalidate } : undefined,
            signal: controller.signal,
        });
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
    if (input.tags) params.set('tags', input.tags);
    if (input.author) params.set('author', input.author);

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
    };
}

export async function fetchPost(slug, options) {
    const url = `${apiBaseUrl()}/api/posts/${encodeURIComponent(slug)}`;
    const data = await safeJson(url, options);
    return data?.data ?? null;
}

export async function fetchPostContent(slug, options) {
    const url = `${apiBaseUrl()}/api/posts/${encodeURIComponent(slug)}/content`;
    return safeJson(url, options);
}
