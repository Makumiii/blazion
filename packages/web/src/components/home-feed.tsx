'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useMemo } from 'react';

import { AuthorAvatar } from '@/components/author-avatar';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { usePostsQuery } from '@/hooks/use-posts-query';
import { DEFAULT_BLUR_DATA_URL } from '@/lib/image-placeholder';

/* ─── Utility ─── */

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

function metadataLine(post: {
    publishedAt: string | null;
    readTimeMinutes: number | null;
}) {
    const date = readableDate(post.publishedAt);
    const readTime = post.readTimeMinutes ? `${post.readTimeMinutes} MIN READ` : null;
    return [date, readTime].filter(Boolean).join(' · ');
}

function parsePositiveInt(value: string | null, fallback: number) {
    const parsed = Number(value);
    if (!Number.isFinite(parsed) || parsed <= 0) {
        return fallback;
    }
    return Math.floor(parsed);
}

type TabValue = 'all' | 'featured' | `segment:${string}`;

/* ─── Skeleton ─── */

function StorySkeletonList() {
    return (
        <section className="article-rail" aria-label="Loading stories">
            {Array.from({ length: 4 }).map((_, index) => (
                <article key={index} className="article-row">
                    <div className="article-row-grid">
                        <Skeleton className="skeleton-cover" />
                        <div className="skeleton-lines">
                            <Skeleton className="h-3 w-32" />
                            <Skeleton className="h-7 w-full" />
                            <Skeleton className="h-4 w-4/5" />
                            <Skeleton className="h-3 w-24" />
                        </div>
                    </div>
                </article>
            ))}
        </section>
    );
}

/* ─── Hero ─── */

function HeroStory({
    post,
}: {
    post: {
        slug: string;
        title: string;
        bannerImageUrl: string | null;
        summary: string | null;
        featured: boolean;
        publishedAt: string | null;
        readTimeMinutes: number | null;
        author: string | null;
        authorAvatarUrl: string | null;
        tags: string[];
    };
}) {
    return (
        <article className="spotlight" aria-label="Featured article">
            <div className="spotlight-media-wrap">
                <Link href={`/posts/${post.slug}`} className="spotlight-media-link" aria-label={`Read ${post.title}`}>
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
                </Link>
            </div>
            <div className="spotlight-content">
                <div className="kicker-row">
                    {post.featured ? <span className="section-kicker">Featured</span> : null}
                    <p className="meta-line">{metadataLine(post)}</p>
                </div>
                <h2 className="spotlight-title">
                    <Link href={`/posts/${post.slug}`} className="headline-link">
                        <span>{post.title}</span>
                        <span className="headline-link-mark" aria-hidden="true">↗</span>
                    </Link>
                </h2>
                <AuthorAvatar name={post.author} avatarUrl={post.authorAvatarUrl} />
                {post.summary ? <p className="lede">{post.summary}</p> : null}
                {post.tags.length > 0 ? (
                    <nav className="topic-pills" aria-label="Article topics">
                        {post.tags.slice(0, 3).map((tag) => (
                            <Link key={tag} href={`/tags/${encodeURIComponent(tag)}`}>
                                {tag}
                            </Link>
                        ))}
                    </nav>
                ) : null}
            </div>
        </article>
    );
}

/* ─── Feed ─── */

export function HomeFeed({ homeHeader }: { homeHeader: string }) {
    const router = useRouter();
    const searchParams = useSearchParams();
    const page = parsePositiveInt(searchParams.get('page'), 1);
    const limit = parsePositiveInt(searchParams.get('limit'), 10);
    const selectedQuery = (searchParams.get('q') ?? '').trim();
    const selectedTab = (searchParams.get('tab') ?? 'all').trim().toLowerCase();
    const selectedSegment = (searchParams.get('segment') ?? '').trim();

    const activeTab: TabValue =
        selectedTab === 'featured'
            ? 'featured'
            : selectedTab === 'segment' && selectedSegment
                ? `segment:${selectedSegment}`
                : 'all';

    const query = usePostsQuery({
        page,
        limit,
        q: selectedQuery || undefined,
        sort: 'newest',
        segment: activeTab.startsWith('segment:') ? selectedSegment : undefined,
        featured: activeTab === 'featured' ? 'true' : undefined,
    });

    const response = query.data;
    const posts = response?.data ?? [];
    const facets = response?.facets ?? { authors: [], segments: [] };

    const shouldUseHeroSplit = activeTab === 'all' && page === 1 && selectedQuery.length === 0;
    const latest = shouldUseHeroSplit ? posts[0] : null;
    const rest = shouldUseHeroSplit ? posts.slice(1) : posts;

    const streamLabel = activeTab === 'featured' ? 'Featured' : activeTab.startsWith('segment:') ? selectedSegment : 'For you';

    const dynamicTabs = useMemo(
        () => facets.segments.map((item) => ({ value: `segment:${item.value}` as const, label: item.value })),
        [facets.segments],
    );

    function setParams(next: Record<string, string | number | null>) {
        const params = new URLSearchParams(searchParams.toString());
        for (const [key, value] of Object.entries(next)) {
            if (value === null || value === '') {
                params.delete(key);
            } else {
                params.set(key, String(value));
            }
        }
        const queryString = params.toString();
        router.replace(queryString ? `/?${queryString}` : '/', { scroll: false });
    }

    function onTabChange(value: string) {
        if (value === 'all') {
            setParams({ tab: null, segment: null, page: 1 });
            return;
        }
        if (value === 'featured') {
            setParams({ tab: 'featured', segment: null, page: 1 });
            return;
        }
        if (value.startsWith('segment:')) {
            const segment = value.slice('segment:'.length);
            setParams({ tab: 'segment', segment, page: 1 });
        }
    }

    const total = response?.pagination.total ?? 0;
    const currentPage = response?.pagination.page ?? page;
    const totalPages = response?.pagination.totalPages ?? 0;

    return (
        <main className="shell home-shell">
            <section className="home-hero">
                <p className="section-kicker">Dispatch</p>
                <h1>{homeHeader}</h1>
                <p className="hero-deck">
                    Analytical writing for product teams that value signal over noise.
                </p>
            </section>

            {latest ? <HeroStory post={latest} /> : null}

            <Tabs value={activeTab} onValueChange={onTabChange} className="filter-tabs">
                <TabsList className="filter-tabs-list">
                    <TabsTrigger value="all" className="filter-tab">
                        For you
                    </TabsTrigger>
                    <TabsTrigger value="featured" className="filter-tab">
                        Featured
                    </TabsTrigger>
                    {dynamicTabs.map((tab) => (
                        <TabsTrigger key={tab.value} value={tab.value} className="filter-tab">
                            {tab.label}
                        </TabsTrigger>
                    ))}
                </TabsList>
            </Tabs>

            <p className="stream-meta-line" role="status">
                {streamLabel} · {total} {total === 1 ? 'article' : 'articles'}
            </p>

            {query.isLoading ? <StorySkeletonList /> : null}

            {!query.isLoading && rest.length > 0 ? (
                <section className="article-rail" aria-label="Articles">
                    {rest.map((post) => (
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
                                            sizes="(max-width: 740px) 100vw, 180px"
                                            placeholder="blur"
                                            blurDataURL={DEFAULT_BLUR_DATA_URL}
                                        />
                                    ) : (
                                        <div className="article-cover article-cover-fallback" role="presentation" />
                                    )}
                                </Link>
                                <div className="article-copy">
                                    <div className="article-topline">
                                        <AuthorAvatar name={post.author} avatarUrl={post.authorAvatarUrl} />
                                        <div className="kicker-row">
                                            {post.featured ? <span className="section-kicker">Featured</span> : null}
                                            <p className="meta-line">{metadataLine(post)}</p>
                                        </div>
                                    </div>
                                    <h2 className="article-title">
                                        <Link href={`/posts/${post.slug}`} className="headline-link">
                                            <span>{post.title}</span>
                                            <span className="headline-link-mark" aria-hidden="true">↗</span>
                                        </Link>
                                    </h2>
                                    <p className="lede">{post.summary ?? 'No summary yet.'}</p>
                                    {post.tags.length > 0 ? (
                                        <nav className="topic-pills" aria-label={`Topics for ${post.title}`}>
                                            {post.tags.map((tag) => (
                                                <Link key={tag} href={`/tags/${encodeURIComponent(tag)}`}>
                                                    {tag}
                                                </Link>
                                            ))}
                                        </nav>
                                    ) : null}
                                </div>
                            </div>
                        </article>
                    ))}
                </section>
            ) : null}

            {!query.isLoading && rest.length === 0 ? (
                <p className="empty-state" role="status">
                    {selectedQuery
                        ? `No results for "${selectedQuery}"`
                        : activeTab === 'featured'
                            ? 'No featured articles yet'
                            : activeTab.startsWith('segment:')
                                ? `No articles in ${selectedSegment} yet`
                                : 'No articles published yet'}
                </p>
            ) : null}

            <nav className="pager-bar" aria-label="Pagination">
                <Button
                    type="button"
                    variant="outline"
                    disabled={currentPage <= 1}
                    onClick={() => setParams({ page: Math.max(1, currentPage - 1) })}
                >
                    Previous
                </Button>
                <span className="pager-status">
                    Page {currentPage} of {Math.max(totalPages, 1)}
                </span>
                <Button
                    type="button"
                    variant="outline"
                    disabled={totalPages === 0 || currentPage >= totalPages}
                    onClick={() => setParams({ page: currentPage + 1 })}
                >
                    Next
                </Button>
            </nav>
        </main>
    );
}
