import Link from 'next/link';
import Image from 'next/image';

import { AuthorAvatar } from '../components/author-avatar';
import { fetchPosts } from '../lib/api';
import { DEFAULT_BLUR_DATA_URL } from '../lib/image-placeholder';

export const revalidate = 120;

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

function metadataLine(post) {
    const date = readableDate(post.publishedAt);
    const readTime = post.readTimeMinutes ? `${post.readTimeMinutes} min read` : null;
    return [date, readTime].filter(Boolean).join(' · ');
}

function HeroStory({ post }) {
    if (!post) return null;

    return (
        <article className="featured-story">
            <div className="featured-left">
                <Link href={`/posts/${post.slug}`} className="featured-media-wrap" aria-label={post.title}>
                    {post.bannerImageUrl ? (
                        <Image
                            src={post.bannerImageUrl}
                            alt={post.title}
                            className="featured-media"
                            width={1600}
                            height={900}
                            sizes="(max-width: 980px) 100vw, 62vw"
                            placeholder="blur"
                            blurDataURL={DEFAULT_BLUR_DATA_URL}
                            priority
                        />
                    ) : (
                        <div className="featured-media featured-media-fallback" />
                    )}
                </Link>
                {post.summary ? <p className="featured-media-summary">{post.summary}</p> : null}
            </div>
            <div className="featured-body">
                <p className="story-date">{metadataLine(post)}</p>
                <h2 className="featured-title">
                    <Link href={`/posts/${post.slug}`} className="title-link">
                        <span className="title-link-text">{post.title}</span>
                        <span className="title-link-icon" aria-hidden="true">
                            ↗
                        </span>
                    </Link>
                </h2>
                <AuthorAvatar name={post.author} avatarUrl={post.authorAvatarUrl} />
                <div className="tags">
                    {post.tags.slice(0, 3).map((tag) => (
                        <Link key={tag} href={`/tags/${encodeURIComponent(tag)}`}>
                            {tag}
                        </Link>
                    ))}
                </div>
            </div>
        </article>
    );
}

export default async function HomePage({ searchParams }) {
    const page = Number(searchParams?.page ?? 1);
    const limit = Number(searchParams?.limit ?? 10);
    const normalizedPage = Number.isFinite(page) && page > 0 ? page : 1;
    const normalizedLimit = Number.isFinite(limit) && limit > 0 ? limit : 10;

    const response = await fetchPosts(
        { page: normalizedPage, limit: normalizedLimit },
        { revalidate },
    );

    const latest = normalizedPage === 1 ? response.data[0] : null;
    const rest = normalizedPage === 1 ? response.data.slice(1) : response.data;

    return (
        <main className="shell stories-shell">
            <section className="stories-head">
                <p className="eyebrow">The Blog</p>
                <h1>Stories from your Notion publication</h1>
            </section>

            {latest ? <HeroStory post={latest} /> : <p className="empty">No posts yet. Trigger sync from the API first.</p>}

            <section className="story-divider" aria-label="More stories" />

            <section className="story-list home-story-list">
                {rest.map((post) => (
                    <article key={post.id} className="story-row home-story-row">
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
                            <div className="story-meta-row">
                                <AuthorAvatar name={post.author} avatarUrl={post.authorAvatarUrl} />
                                <p className="story-date">{metadataLine(post)}</p>
                            </div>
                            <h2 className="story-title">
                                <Link href={`/posts/${post.slug}`} className="title-link">
                                    <span className="title-link-text">{post.title}</span>
                                    <span className="title-link-icon" aria-hidden="true">
                                        ↗
                                    </span>
                                </Link>
                            </h2>
                            <p className="story-summary">{post.summary ?? 'No summary yet.'}</p>
                            <div className="tags">
                                {post.tags.map((tag) => (
                                    <Link key={tag} href={`/tags/${encodeURIComponent(tag)}`}>
                                        {tag}
                                    </Link>
                                ))}
                            </div>
                        </div>
                    </article>
                ))}
            </section>

            <nav className="pager" aria-label="Pagination">
                {response.pagination.page > 1 ? (
                    <Link href={`/?page=${response.pagination.page - 1}&limit=${response.pagination.limit}`}>Previous</Link>
                ) : (
                    <span />
                )}
                {response.pagination.page < response.pagination.totalPages ? (
                    <Link href={`/?page=${response.pagination.page + 1}&limit=${response.pagination.limit}`}>Next</Link>
                ) : (
                    <span />
                )}
            </nav>
        </main>
    );
}
