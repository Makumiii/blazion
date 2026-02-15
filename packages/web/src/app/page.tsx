import Link from 'next/link';
import Image from 'next/image';

import { AuthorAvatar } from '../components/author-avatar';
import { fetchPosts, fetchSiteSettings } from '../lib/api';
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
                <div className="story-meta-inline">
                    {post.featured ? <span className="featured-badge">Featured</span> : null}
                    <p className="story-date">{metadataLine(post)}</p>
                </div>
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

function readSearchParam(searchParams, key) {
    const value = searchParams?.[key];
    if (Array.isArray(value)) {
        return value[0] ?? '';
    }
    return value ?? '';
}

function parsePositiveInt(value, fallback) {
    const parsed = Number(value);
    if (!Number.isFinite(parsed) || parsed <= 0) {
        return fallback;
    }
    return Math.floor(parsed);
}

export default async function HomePage({ searchParams }) {
    const normalizedPage = parsePositiveInt(readSearchParam(searchParams, 'page'), 1);
    const normalizedLimit = parsePositiveInt(readSearchParam(searchParams, 'limit'), 10);
    const selectedQuery = readSearchParam(searchParams, 'q').trim();
    const selectedTabRaw = readSearchParam(searchParams, 'tab').trim().toLowerCase();
    const selectedSegment = readSearchParam(searchParams, 'segment').trim();
    const activeTab =
        selectedTabRaw === 'featured'
            ? 'featured'
            : selectedTabRaw === 'segment' && selectedSegment
              ? 'segment'
              : 'all';
    const useLiveFetch = selectedQuery.length > 0 || activeTab !== 'all';

    const response = await fetchPosts(
        {
            page: normalizedPage,
            limit: normalizedLimit,
            q: selectedQuery || undefined,
            sort: 'newest',
            segment: activeTab === 'segment' ? selectedSegment : undefined,
            featured: activeTab === 'featured' ? 'true' : undefined,
        },
        useLiveFetch ? { cache: 'no-store' } : { revalidate },
    );
    const siteSettings = await fetchSiteSettings({ revalidate: 300 });

    const facets = response.facets ?? { authors: [], segments: [] };
    const shouldUseHeroSplit = activeTab === 'all' && normalizedPage === 1 && selectedQuery.length === 0;
    const latest = shouldUseHeroSplit ? response.data[0] : null;
    const rest = shouldUseHeroSplit ? response.data.slice(1) : response.data;
    const hasResults = response.data.length > 0;

    function buildHref(overrides = {}) {
        const params = new URLSearchParams();
        const merged = {
            page: normalizedPage,
            limit: normalizedLimit,
            q: selectedQuery,
            tab: activeTab,
            segment: selectedSegment,
            ...overrides,
        };

        if (merged.page && Number(merged.page) > 1) params.set('page', String(merged.page));
        if (merged.limit && Number(merged.limit) !== 10) params.set('limit', String(merged.limit));
        if (merged.q) params.set('q', merged.q);
        if (merged.tab === 'featured') {
            params.set('tab', 'featured');
        } else if (merged.tab === 'segment' && merged.segment) {
            params.set('tab', 'segment');
            params.set('segment', merged.segment);
        }

        const query = params.toString();
        return query ? `/?${query}` : '/';
    }

    const streamLabel =
        activeTab === 'featured'
            ? 'Featured'
            : activeTab === 'segment' && selectedSegment
              ? selectedSegment
              : 'For you';

    return (
        <main className="shell stories-shell">
            <section className="stories-head">
                <h1>{siteSettings.site.homeHeader}</h1>
            </section>

            {latest ? <HeroStory post={latest} /> : null}

            <section className="home-tabs" aria-label="Post streams">
                <Link
                    href={buildHref({ page: 1, tab: 'all', segment: '' })}
                    scroll={false}
                    className={`home-tab${activeTab === 'all' ? ' is-active' : ''}`}
                >
                    For you
                </Link>
                <Link
                    href={buildHref({ page: 1, tab: 'featured', segment: '' })}
                    scroll={false}
                    className={`home-tab${activeTab === 'featured' ? ' is-active' : ''}`}
                >
                    Featured
                </Link>
                {facets.segments.map((item) => (
                    <Link
                        key={item.value}
                        href={buildHref({ page: 1, tab: 'segment', segment: item.value })}
                        scroll={false}
                        className={`home-tab${activeTab === 'segment' && selectedSegment === item.value ? ' is-active' : ''}`}
                    >
                        {item.value}
                    </Link>
                ))}
            </section>

            <p className="stream-meta">
                {streamLabel} · {response.pagination.total} post{response.pagination.total === 1 ? '' : 's'}
            </p>

            {rest.length > 0 ? (
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
                                    <div className="story-meta-inline">
                                        {post.featured ? <span className="featured-badge">Featured</span> : null}
                                        <p className="story-date">{metadataLine(post)}</p>
                                    </div>
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
            ) : null}

            {!hasResults ? (
                <p className="empty">
                    {selectedQuery
                        ? `No stories matched "${selectedQuery}".`
                        : activeTab === 'featured'
                          ? 'No featured stories yet.'
                          : activeTab === 'segment' && selectedSegment
                            ? `No stories in ${selectedSegment} yet.`
                            : 'No stories published yet.'}
                </p>
            ) : null}

            <nav className="pager" aria-label="Pagination">
                {response.pagination.page > 1 ? (
                    <Link href={buildHref({ page: response.pagination.page - 1 })}>Previous</Link>
                ) : (
                    <span />
                )}
                {response.pagination.page < response.pagination.totalPages ? (
                    <Link href={buildHref({ page: response.pagination.page + 1 })}>Next</Link>
                ) : (
                    <span />
                )}
            </nav>
        </main>
    );
}
