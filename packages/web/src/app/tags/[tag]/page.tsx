import Link from 'next/link';
import Image from 'next/image';

import { fetchPosts } from '../../../lib/api';
import { formatAuthorDisplayName } from '../../../lib/author';
import { DEFAULT_BLUR_DATA_URL } from '../../../lib/image-placeholder';

export const revalidate = 60;

function readableDate(value: string | null) {
    if (!value) return 'Unscheduled';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;
    return date
        .toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
        })
        .toUpperCase();
}

export default async function TagPage({ params }) {
    const tag = decodeURIComponent(params.tag);
    const posts = await fetchPosts(
        {
            page: 1,
            limit: 20,
            tags: tag,
        },
        { revalidate },
    );

    return (
        <main className="shell topic-shell">
            <section className="topic-head">
                <div>
                    <p className="section-kicker">Topic Lens</p>
                    <h1>{tag}</h1>
                </div>
                <p className="stream-meta-line" role="status">{posts.pagination.total} {posts.pagination.total === 1 ? 'article' : 'articles'}</p>
            </section>

            <section className="article-rail" aria-label={`Articles tagged ${tag}`}>
                {posts.data.map((post) => (
                    <article key={post.id} className="article-row">
                        <div className="article-row-grid">
                        <Link href={`/posts/${post.slug}`} className="article-cover-link" aria-label={`Read ${post.title}`}>
                            {post.bannerImageUrl ? (
                                <Image
                                    src={post.bannerImageUrl}
                                    alt=""
                                    className="article-cover"
                                    width={400}
                                    height={400}
                                    sizes="(max-width: 740px) 100vw, 200px"
                                    placeholder="blur"
                                    blurDataURL={DEFAULT_BLUR_DATA_URL}
                                />
                            ) : (
                                <div className="article-cover article-cover-fallback" role="presentation" />
                            )}
                        </Link>
                        <div className="article-copy">
                            <p className="meta-line">
                                {formatAuthorDisplayName(post.author) || 'Unknown'} · {readableDate(post.publishedAt)}
                            </p>
                            <h2 className="article-title">
                                <Link href={`/posts/${post.slug}`} className="headline-link">
                                    <span>{post.title}</span>
                                    <span className="headline-link-mark" aria-hidden="true">
                                        ↗
                                    </span>
                                </Link>
                            </h2>
                            <p className="lede">{post.summary ?? 'No summary yet.'}</p>
                        </div>
                        </div>
                    </article>
                ))}
                {posts.data.length === 0 ? <p className="empty-state" role="status">No articles found for this topic</p> : null}
            </section>
        </main>
    );
}
