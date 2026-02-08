import Link from 'next/link';

import { fetchPosts } from '../lib/api';

export const dynamic = 'force-dynamic';

export default async function HomePage() {
    const response = await fetchPosts({ page: 1, limit: 6 }, { cache: 'no-store' });
    const featured = response.data.filter((post) => post.featured);
    const spotlight = featured.length > 0 ? featured : response.data.slice(0, 3);
    const recent = response.data.slice(0, 6);

    return (
        <main className="shell home-grid">
            <section className="hero">
                <p className="eyebrow">Notion-native publishing</p>
                <h1>Write in Notion. Publish like a magazine.</h1>
                <p className="hero-copy">
                    This blog syncs directly from your Notion database and serves fast, SEO-ready pages with rich
                    content rendering.
                </p>
                <div className="hero-actions">
                    <Link href="/posts" className="btn btn-primary">
                        Browse Posts
                    </Link>
                </div>
            </section>

            <section className="bento">
                {spotlight.map((post) => (
                    <article key={post.id} className="tile">
                        <p className="tile-meta">
                            {post.author ?? 'Unknown author'} · {post.publishedAt ?? 'Unscheduled'}
                        </p>
                        <h2>
                            <Link href={`/posts/${post.slug}`}>{post.title}</Link>
                        </h2>
                        {post.summary ? <p>{post.summary}</p> : null}
                        <div className="tags">
                            {post.tags.slice(0, 3).map((tag) => (
                                <Link key={tag} href={`/tags/${encodeURIComponent(tag)}`}>
                                    #{tag}
                                </Link>
                            ))}
                        </div>
                    </article>
                ))}
            </section>

            <section className="recent">
                <div className="section-head">
                    <h2>Recent Posts</h2>
                    <Link href="/posts">All posts</Link>
                </div>
                <div className="recent-list">
                    {recent.map((post) => (
                        <article key={post.id} className="recent-card">
                            <h3>
                                <Link href={`/posts/${post.slug}`}>{post.title}</Link>
                            </h3>
                            <p>{post.summary ?? 'No summary yet.'}</p>
                        </article>
                    ))}
                    {recent.length === 0 ? <p>No posts yet. Trigger sync from the API first.</p> : null}
                </div>
            </section>
        </main>
    );
}
