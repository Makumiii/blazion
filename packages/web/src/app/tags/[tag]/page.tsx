import Link from 'next/link';

import { fetchPosts } from '../../../lib/api';

export const dynamic = 'force-dynamic';

export default async function TagPage({ params }) {
    const tag = decodeURIComponent(params.tag);
    const posts = await fetchPosts(
        {
            page: 1,
            limit: 20,
            tags: tag,
        },
        { cache: 'no-store' },
    );

    return (
        <main className="shell listing">
            <section className="section-head">
                <h1>#{tag}</h1>
                <p>{posts.pagination.total} post(s)</p>
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
                    </article>
                ))}
                {posts.data.length === 0 ? <p>No posts found for this tag.</p> : null}
            </div>
        </main>
    );
}
