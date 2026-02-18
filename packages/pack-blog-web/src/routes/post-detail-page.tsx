import Link from 'next/link';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import { BackButton } from '../components/back-button';
import { GiscusThread } from '../components/giscus-thread';
import { NotionContent } from '../components/notion-content';
import { PostSharePanel } from '../components/post-share-panel';
import { ProgressiveImage } from '../components/progressive-image';
import { ReadingProgress } from '../components/reading-progress';
import { fetchPost, fetchPostContent, fetchPostRecommendations, fetchSiteSettings } from '../lib/api';
import { formatAuthorDisplayName } from '../lib/author';
import { DEFAULT_BLUR_DATA_URL } from '../lib/image-placeholder';
import { estimateReadTime } from '../lib/reading-time';

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

export async function generateMetadata({ params }): Promise<Metadata> {
    const post = await fetchPost(params.slug, { revalidate });
    if (!post) {
        return {
            title: 'Post Not Found | Blazion',
            description: 'The requested post could not be found.',
        };
    }
    const displayAuthor = formatAuthorDisplayName(post.author);

    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3001';
    const postUrl = `${siteUrl}/posts/${encodeURIComponent(post.slug)}`;
    const description = post.summary ?? 'Read this post on Blazion.';
    const images = post.bannerImageUrl ? [{ url: post.bannerImageUrl, alt: post.title }] : undefined;
    const keywords = [post.title, ...(post.tags ?? []), ...(displayAuthor ? [displayAuthor] : [])];
    const publishedTime = post.publishedAt ?? undefined;
    const modifiedTime = post.updatedAt ?? undefined;
    const authors = displayAuthor ? [displayAuthor] : undefined;

    return {
        title: `${post.title} | Blazion`,
        description,
        keywords,
        authors: displayAuthor ? [{ name: displayAuthor }] : undefined,
        category: post.tags?.[0] ?? undefined,
        alternates: {
            canonical: `/posts/${post.slug}`,
        },
        openGraph: {
            type: 'article',
            url: postUrl,
            title: post.title,
            description,
            images,
            publishedTime,
            modifiedTime,
            authors,
            tags: post.tags,
        },
        twitter: {
            card: post.bannerImageUrl ? 'summary_large_image' : 'summary',
            title: post.title,
            description,
            images: post.bannerImageUrl ? [post.bannerImageUrl] : undefined,
        },
    };
}

export default async function PostDetailPage({ params }) {
    const post = await fetchPost(params.slug, { revalidate });
    if (!post) {
        notFound();
    }

    const content = await fetchPostContent(params.slug, { revalidate });
    const recommendationsResponse = await fetchPostRecommendations(params.slug, { limit: 8 }, { revalidate });
    const recommendations = recommendationsResponse?.data ?? [];
    const hasRecommendationCarousel = recommendations.length > 2;
    const siteSettings = await fetchSiteSettings({ revalidate: 300 });
    const readTimeMinutes = estimateReadTime(content);
    const displayAuthor = formatAuthorDisplayName(post.author);
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3001';
    const postUrl = `${siteUrl}/posts/${encodeURIComponent(post.slug)}`;
    const articleJsonLd = {
        '@context': 'https://schema.org',
        '@type': 'Article',
        headline: post.title,
        description: post.summary ?? undefined,
        image: post.bannerImageUrl ? [post.bannerImageUrl] : undefined,
        author: displayAuthor ? [{ '@type': 'Person', name: displayAuthor }] : undefined,
        datePublished: post.publishedAt ?? undefined,
        dateModified: post.updatedAt ?? undefined,
        keywords: post.tags,
        mainEntityOfPage: {
            '@type': 'WebPage',
            '@id': postUrl,
        },
    };

    return (
        <main className="shell post-shell">
            <ReadingProgress />
            <BackButton />
            <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(articleJsonLd) }} />

            <article className="post-stage digest-stage">
                <header className="digest-hero" aria-label="Article heading">
                    <h1 className="digest-title">{post.title}</h1>
                    {post.summary ? <p className="digest-summary">{post.summary}</p> : null}
                </header>

                <div className="digest-layout">
                    <aside className="digest-sidebar" aria-label="Article metadata">
                        <p className="digest-kicker">/ Metadata</p>
                        <dl className="digest-meta-list">
                            <div>
                                <dt>Date</dt>
                                <dd>{readableDate(post.publishedAt)}</dd>
                            </div>
                            <div>
                                <dt>Author</dt>
                                <dd>{displayAuthor || 'Unknown author'}</dd>
                            </div>
                            <div>
                                <dt>Reading time</dt>
                                <dd>{readTimeMinutes ? `${readTimeMinutes} MINUTES` : 'UNSCHEDULED'}</dd>
                            </div>
                            {post.tags.length > 0 ? (
                                <div>
                                    <dt>Categories</dt>
                                    <dd className="digest-tag-wrap">
                                        {post.tags.map((tag) => (
                                            <Link key={tag} href={`/tags/${encodeURIComponent(tag)}`}>
                                                {tag}
                                            </Link>
                                        ))}
                                    </dd>
                                </div>
                            ) : null}
                        </dl>

                        <PostSharePanel postUrl={postUrl} providers={siteSettings.share?.providers} />
                    </aside>

                    <section className="digest-article" aria-label="Article body">
                        <p className="digest-kicker">/ Article</p>
                        {post.bannerImageUrl ? (
                            <div className="digest-banner-wrap">
                                <ProgressiveImage
                                    src={post.bannerImageUrl}
                                    alt=""
                                    className="digest-banner-media"
                                    width={1600}
                                    height={900}
                                    sizes="(max-width: 1024px) 100vw, 70vw"
                                    placeholder="blur"
                                    blurDataURL={DEFAULT_BLUR_DATA_URL}
                                    priority
                                />
                            </div>
                        ) : (
                            <div className="digest-banner-wrap digest-banner-fallback" role="presentation" />
                        )}
                        {content?.renderMode === 'recordMap' ? (
                            <NotionContent recordMap={content.recordMap} />
                        ) : content?.renderMode === 'blocks' ? (
                            <p className="content-panel" role="status">Private Notion page — public renderer not available.</p>
                        ) : (
                            <p className="content-panel" role="status">Unable to load content. Please retry.</p>
                        )}
                    </section>
                </div>

                {recommendations.length > 0 ? (
                    <section className="post-recommendations" aria-label="Related articles">
                        <header className="post-recommendations-head">
                            <p className="digest-kicker">/ Related Articles</p>
                            {hasRecommendationCarousel ? (
                                <p className="post-recommendations-hint">Swipe to see more</p>
                            ) : null}
                        </header>

                        <div
                            className={`post-recommendations-carousel${hasRecommendationCarousel ? ' is-carousel' : ''}`}
                        >
                            <div className="post-recommendations-track">
                                {recommendations.map((item) => (
                                    <article key={item.id} className="post-recommendation-card">
                                        <Link
                                            href={`/posts/${encodeURIComponent(item.slug)}`}
                                            className="post-recommendation-link"
                                        >
                                            {item.bannerImageUrl ? (
                                                <div className="post-recommendation-media-pane">
                                                    <ProgressiveImage
                                                        src={item.bannerImageUrl}
                                                        alt=""
                                                        className="post-recommendation-media"
                                                        width={1200}
                                                        height={800}
                                                        sizes="(max-width: 760px) 86vw, (max-width: 1024px) 74vw, 34vw"
                                                        placeholder="blur"
                                                        blurDataURL={DEFAULT_BLUR_DATA_URL}
                                                    />
                                                </div>
                                            ) : (
                                                <div
                                                    className="post-recommendation-media-pane post-recommendation-media-fallback"
                                                    role="presentation"
                                                />
                                            )}

                                            <div className="post-recommendation-body">
                                                <h3 className="post-recommendation-title">
                                                    {item.title}
                                                    <span className="post-recommendation-title-mark">↗</span>
                                                </h3>
                                                {item.summary ? (
                                                    <p className="post-recommendation-summary">{item.summary}</p>
                                                ) : null}
                                                <div className="post-recommendation-meta">
                                                    {item.segment || item.tags.length > 0 ? (
                                                        <div className="post-recommendation-tags" aria-label="Article tags">
                                                            {item.segment ? (
                                                                <span className="post-recommendation-tag">{item.segment}</span>
                                                            ) : null}
                                                            {item.tags.slice(0, 2).map((tag) => (
                                                                <span key={`${item.id}:${tag}`} className="post-recommendation-tag">
                                                                    {tag}
                                                                </span>
                                                            ))}
                                                        </div>
                                                    ) : null}
                                                    <p className="post-recommendation-author">
                                                        BY {formatAuthorDisplayName(item.author) || 'EDITORIAL DESK'}
                                                    </p>
                                                </div>
                                            </div>
                                        </Link>
                                    </article>
                                ))}
                            </div>
                        </div>
                    </section>
                ) : null}

                <GiscusThread title={post.title} />
            </article>
        </main>
    );
}
