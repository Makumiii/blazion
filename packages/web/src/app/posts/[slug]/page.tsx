import Link from 'next/link';
import type { Metadata } from 'next';
import Image from 'next/image';
import { notFound } from 'next/navigation';

import { BackButton } from '../../../components/back-button';
import { NotionContent } from '../../../components/notion-content';
import { ReadingProgress } from '../../../components/reading-progress';
import { fetchPost, fetchPostContent, fetchPostRecommendations } from '../../../lib/api';
import { formatAuthorDisplayName } from '../../../lib/author';
import { DEFAULT_BLUR_DATA_URL } from '../../../lib/image-placeholder';
import { estimateReadTime } from '../../../lib/reading-time';

export const revalidate = 60;

function readableDate(value) {
    if (!value) return 'Unscheduled';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;
    return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
    });
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
    const recommendations = await fetchPostRecommendations(
        params.slug,
        { limit: 3 },
        { revalidate },
    );
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
        <main className="shell article-shell">
            <ReadingProgress />
            <BackButton />
            <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(articleJsonLd) }} />

            <article className="article">
                <section className="featured-story article-hero-match">
                    <div className="featured-left">
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
                    </div>
                    <div className="featured-body">
                        <p className="story-date">
                            {readableDate(post.publishedAt)}
                            {readTimeMinutes ? ` · ${readTimeMinutes} min read` : ''}
                        </p>
                        <h1 className="featured-title">{post.title}</h1>
                        <p className="story-author">{displayAuthor || 'Unknown author'}</p>
                        <div className="tags">
                            {post.tags.map((tag) => (
                                <Link key={tag} href={`/tags/${encodeURIComponent(tag)}`}>
                                    {tag}
                                </Link>
                            ))}
                        </div>
                    </div>
                </section>

                {content?.renderMode === 'recordMap' ? (
                    <NotionContent recordMap={content.recordMap} />
                ) : content?.renderMode === 'blocks' ? (
                    <p className="content-state">Private Notion page. Public renderer not available.</p>
                ) : (
                    <p className="content-state">Unable to load post content from API right now. Please retry.</p>
                )}

                {recommendations.data.length > 0 ? (
                    <section className="post-recommendations" aria-label="Related Reads">
                        <div className="post-recommendations-head">
                            <p className="eyebrow">
                                {recommendations.strategy === 'latest' ? 'Latest Reads' : 'Related Reads'}
                            </p>
                            <h2>Keep Reading</h2>
                        </div>
                        <div className="post-recommendations-grid">
                            {recommendations.data.map((item) => (
                                <article key={item.id} className="post-recommendation-card">
                                    <Link href={`/posts/${item.slug}`} className="post-recommendation-link">
                                        {item.bannerImageUrl ? (
                                            <Image
                                                src={item.bannerImageUrl}
                                                alt={item.title}
                                                className="post-recommendation-media"
                                                width={1200}
                                                height={675}
                                                sizes="(max-width: 980px) 100vw, 32vw"
                                                placeholder="blur"
                                                blurDataURL={DEFAULT_BLUR_DATA_URL}
                                            />
                                        ) : (
                                            <div className="post-recommendation-media post-recommendation-media-fallback" />
                                        )}
                                        <div className="post-recommendation-body">
                                            <p className="story-date">
                                                {readableDate(item.publishedAt)}
                                                {item.readTimeMinutes ? ` · ${item.readTimeMinutes} min read` : ''}
                                            </p>
                                            <h3 className="post-recommendation-title">{item.title}</h3>
                                            <p className="story-author">
                                                {formatAuthorDisplayName(item.author) || 'Unknown author'}
                                            </p>
                                            <p className="post-recommendation-summary">
                                                {item.summary ?? 'Continue exploring related ideas from this publication.'}
                                            </p>
                                        </div>
                                    </Link>
                                </article>
                            ))}
                        </div>
                    </section>
                ) : null}
            </article>
        </main>
    );
}
