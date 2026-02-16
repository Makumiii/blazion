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
        <main className="shell post-shell">
            <ReadingProgress />
            <BackButton />
            <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(articleJsonLd) }} />

            <article className="post-stage">
                <section className="spotlight post-spotlight" aria-label="Article header">
                    <div className="spotlight-media-wrap">
                        {post.bannerImageUrl ? (
                            <Image
                                src={post.bannerImageUrl}
                                alt=""
                                className="spotlight-media"
                                width={800}
                                height={1000}
                                sizes="(max-width: 980px) 100vw, 50vw"
                                placeholder="blur"
                                blurDataURL={DEFAULT_BLUR_DATA_URL}
                                priority
                            />
                        ) : (
                            <div className="spotlight-media spotlight-media-fallback" role="presentation" />
                        )}
                    </div>
                    <div className="spotlight-content">
                        <p className="section-kicker">Field Note</p>
                        <p className="meta-line">
                            {readableDate(post.publishedAt)}
                            {readTimeMinutes ? ` · ${readTimeMinutes} MIN READ` : ''}
                        </p>
                        <h1 className="spotlight-title">{post.title}</h1>
                        <p className="byline">{displayAuthor || 'Unknown author'}</p>
                        {post.summary ? <p className="lede">{post.summary}</p> : null}
                        {post.tags.length > 0 ? (
                            <nav className="topic-pills" aria-label="Article topics">
                                {post.tags.map((tag) => (
                                    <Link key={tag} href={`/tags/${encodeURIComponent(tag)}`}>
                                        {tag}
                                    </Link>
                                ))}
                            </nav>
                        ) : null}
                    </div>
                </section>

                {content?.renderMode === 'recordMap' ? (
                    <NotionContent recordMap={content.recordMap} />
                ) : content?.renderMode === 'blocks' ? (
                    <p className="content-panel" role="status">Private Notion page — public renderer not available.</p>
                ) : (
                    <p className="content-panel" role="status">Unable to load content. Please retry.</p>
                )}

                {recommendations.data.length > 0 ? (
                    <section className="continue-reading" aria-label="Continue reading">
                        <div className="continue-reading-head">
                            <p className="section-kicker">
                                {recommendations.strategy === 'latest' ? 'Latest' : 'Related'}
                            </p>
                            <h2>Continue Reading</h2>
                        </div>
                        <div className="continue-grid">
                            {recommendations.data.map((item) => (
                                <article key={item.id} className="continue-card">
                                    <Link href={`/posts/${item.slug}`} className="continue-link" aria-label={`Read ${item.title}`}>
                                        {item.bannerImageUrl ? (
                                            <Image
                                                src={item.bannerImageUrl}
                                                alt=""
                                                className="continue-media"
                                                width={600}
                                                height={400}
                                                sizes="(max-width: 980px) 100vw, 32vw"
                                                placeholder="blur"
                                                blurDataURL={DEFAULT_BLUR_DATA_URL}
                                            />
                                        ) : (
                                            <div className="continue-media continue-media-fallback" role="presentation" />
                                        )}
                                        <div className="continue-body">
                                            <p className="meta-line">
                                                {readableDate(item.publishedAt)}
                                                {item.readTimeMinutes ? ` · ${item.readTimeMinutes} MIN READ` : ''}
                                            </p>
                                            <h3 className="continue-title">{item.title}</h3>
                                            <p className="byline">
                                                {formatAuthorDisplayName(item.author) || 'Unknown author'}
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
