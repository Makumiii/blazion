import Link from 'next/link';
import Image from 'next/image';

import { fetchPosts } from '../../../lib/api';
import { DEFAULT_BLUR_DATA_URL } from '../../../lib/image-placeholder';

export const revalidate = 60;

function readableDate(value) {
    if (!value) return 'Unscheduled';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;
    return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
    });
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
        <main className="shell stories-shell">
            <section className="section-head">
                <h1>{tag}</h1>
                <p>{posts.pagination.total} post(s)</p>
            </section>

            <section className="story-list">
                {posts.data.map((post) => (
                    <article key={post.id} className="story-row">
                        <Link href={`/posts/${post.slug}`} className="story-media-wrap" aria-label={post.title}>
                            {post.bannerImageUrl ? (
                                <Image
                                    src={post.bannerImageUrl}
                                    alt={post.title}
                                    className="story-media"
                                    width={1200}
                                    height={675}
                                    sizes="(max-width: 740px) 100vw, 230px"
                                    placeholder="blur"
                                    blurDataURL={DEFAULT_BLUR_DATA_URL}
                                />
                            ) : (
                                <div className="story-media story-media-fallback" />
                            )}
                        </Link>
                        <div className="story-body">
                            <p className="story-date">
                                {post.author ?? 'Unknown'} · {readableDate(post.publishedAt)}
                            </p>
                            <h2 className="story-title">
                                <Link href={`/posts/${post.slug}`} className="title-link">
                                    <span className="title-link-text">{post.title}</span>
                                    <span className="title-link-icon" aria-hidden="true">
                                        ↗
                                    </span>
                                </Link>
                            </h2>
                            <p className="story-summary">{post.summary ?? 'No summary yet.'}</p>
                        </div>
                    </article>
                ))}
                {posts.data.length === 0 ? <p className="empty">No posts found for this tag.</p> : null}
            </section>
        </main>
    );
}
