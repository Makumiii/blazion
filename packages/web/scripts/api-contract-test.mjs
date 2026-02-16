const baseUrl =
    process.env.NEXT_PUBLIC_BLAZION_API_URL || process.env.BLAZION_API_URL || 'http://localhost:3000';

async function fetchJson(path) {
    const response = await fetch(`${baseUrl}${path}`);
    const body = await response.json().catch(() => ({}));

    if (!response.ok) {
        throw new Error(`${path} failed (${response.status}): ${JSON.stringify(body)}`);
    }

    return body;
}

function assert(condition, message) {
    if (!condition) {
        throw new Error(message);
    }
}

async function main() {
    const health = await fetchJson('/api/health');
    assert(typeof health.status === 'string', 'health.status missing');

    const posts = await fetchJson('/api/posts?limit=1&page=1');
    assert(posts.pagination, 'posts.pagination missing');
    assert(typeof posts.pagination.page === 'number', 'pagination.page missing');
    assert(typeof posts.pagination.totalPages === 'number', 'pagination.totalPages missing');
    assert(Array.isArray(posts.data), 'posts.data not array');

    if (posts.data.length === 0) {
        console.log('API contract checks passed (no posts available for slug/content checks).');
        return;
    }

    const first = posts.data[0];
    assert(typeof first.slug === 'string' && first.slug.length > 0, 'post.slug missing');

    const single = await fetchJson(`/api/posts/${encodeURIComponent(first.slug)}`);
    assert(single.data?.slug === first.slug, 'single-post slug mismatch');

    const content = await fetchJson(`/api/posts/${encodeURIComponent(first.slug)}/content`);
    assert(content.renderMode === 'recordMap' || content.renderMode === 'blocks', 'invalid renderMode');

    console.log('API contract checks passed.');
}

main().catch((error) => {
    console.error(error.message || error);
    process.exit(1);
});
