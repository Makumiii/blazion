import Link from 'next/link';

import { fetchPosts } from '../../lib/api';

export const dynamic = 'force-dynamic';

export default async function PostsPage({ searchParams }) {
    const page = Number(searchParams?.page ?? 1);
    const limit = Number(searchParams?.limit ?? 10);
    const tagsParam = typeof searchParams?.tags === 'string' ? searchParams.tags : undefined;
    const authorParam = typeof searchParams?.author === 'string' ? searchParams.author : undefined;

    const posts = await fetchPosts(
        {
            page: Number.isFinite(page) ? page : 1,
            limit: Number.isFinite(limit) ? limit : 10,
            tags: tagsParam,
            author: authorParam,
        },
        { cache: 'no-store' },
    );

    return (
        <main className="shell listing">
            <section className="section-head">
                <h1>All Posts</h1>
                <p>
                    {posts.pagination.total} total · page {posts.pagination.page} of{' '}
                    {Math.max(posts.pagination.totalPages, 1)}
                </p>
            </section>

            <div className="list-grid">
                {posts.data.map((post) => (
                    <article key={post.id} className="post-card">
                        <p className="tile-meta">
                            {post.author ?? 'Unknown'} · {post.publishedAt ?? 'Unscheduled'}
                        </p>
                        <h2>
                            <Link href={`/posts/${post.slug}`}>{post.title}</Link>
                        </h2>
                        <p>{post.summary ?? 'No summary yet.'}</p>
                        <div className="tags">
                            {post.tags.map((tag) => (
                                <Link key={tag} href={`/tags/${encodeURIComponent(tag)}`}>
                                    #{tag}
                                </Link>
                            ))}
                        </div>
                    </article>
                ))}
                {posts.data.length === 0 ? <p>No posts match this filter.</p> : null}
            </div>

            <nav className="pager" aria-label="Pagination">
                {posts.pagination.page > 1 ? (
                    <Link href={`/posts?page=${posts.pagination.page - 1}&limit=${posts.pagination.limit}`}>Previous</Link>
                ) : (
                    <span />
                )}
                {posts.pagination.page < posts.pagination.totalPages ? (
                    <Link href={`/posts?page=${posts.pagination.page + 1}&limit=${posts.pagination.limit}`}>Next</Link>
                ) : (
                    <span />
                )}
            </nav>
        </main>
    );
}
