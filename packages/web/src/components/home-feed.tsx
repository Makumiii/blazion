'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useMemo, useRef } from 'react';

import { HeaderSearch } from '@/components/header-search';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { usePostsQuery } from '@/hooks/use-posts-query';

function ledgerDate(value: string | null) {
    if (!value) return 'Unscheduled';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;
    const year = date.getFullYear();
    const month = date.getMonth() + 1;
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}.${month}.${day}`;
}

function parsePositiveInt(value: string | null, fallback: number) {
    const parsed = Number(value);
    if (!Number.isFinite(parsed) || parsed <= 0) {
        return fallback;
    }
    return Math.floor(parsed);
}

type TabValue = 'all' | 'featured' | `segment:${string}`;

function StorySkeletonList() {
    return (
            <section className="ledger-list" aria-label="Loading stories">
                <div className="ledger-head">
                    <span>/ Date</span>
                    <span>/ Name</span>
                    <span>/ Author</span>
                </div>
                {Array.from({ length: 4 }).map((_, index) => (
                    <article key={index} className="ledger-row">
                        <Skeleton className="h-4 w-20" />
                        <div className="skeleton-lines">
                        <Skeleton className="h-3 w-28" />
                            <Skeleton className="h-8 w-full" />
                            <Skeleton className="h-4 w-3/4" />
                        </div>
                        <Skeleton className="h-3 w-24 justify-self-end" />
                    </article>
                ))}
            </section>
        );
}

export function HomeFeed() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const filterRailRef = useRef<HTMLDivElement | null>(null);

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

    const streamLabel =
        activeTab === 'featured' ? 'Featured' : activeTab.startsWith('segment:') ? selectedSegment : 'All';

    const dynamicTabs = useMemo(
        () => facets.segments.map((item) => ({ value: `segment:${item.value}` as const, label: item.value })),
        [facets.segments],
    );

    const filterOptions: Array<{ value: TabValue | 'featured' | 'all'; label: string }> = [
        { value: 'all', label: 'All' },
        { value: 'featured', label: 'Featured' },
        ...dynamicTabs,
    ];

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

    function openPost(slug: string) {
        router.push(`/posts/${slug}`);
    }

    const total = response?.pagination.total ?? 0;
    const currentPage = response?.pagination.page ?? page;
    const totalPages = response?.pagination.totalPages ?? 0;

    return (
        <main className="shell home-shell">
            <section className="home-controls" aria-label="Search and filters">
                <div className="filter-carousel-shell">
                    <div
                        ref={filterRailRef}
                        className="filter-carousel"
                        role="tablist"
                        aria-label="Filter articles"
                        onWheel={(event) => {
                            const rail = filterRailRef.current;
                            if (!rail) return;
                            if (Math.abs(event.deltaY) > Math.abs(event.deltaX)) {
                                rail.scrollLeft += event.deltaY;
                            } else {
                                rail.scrollLeft += event.deltaX;
                            }
                        }}
                    >
                        <div className="filter-carousel-track">
                            {filterOptions.map((option, index) => {
                                const isActive = activeTab === option.value;
                                return (
                                    <div key={option.value} className="filter-piece">
                                        <button
                                            type="button"
                                            role="tab"
                                            aria-selected={isActive}
                                            className={`filter-option${isActive ? ' is-active' : ''}`}
                                            onClick={() => onTabChange(option.value)}
                                        >
                                            <span>{option.label}</span>
                                        </button>
                                        {index < filterOptions.length - 1 ? (
                                            <span className="filter-separator" aria-hidden="true">
                                                /
                                            </span>
                                        ) : null}
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>

                <div className="home-search-wrap">
                    <HeaderSearch />
                </div>
            </section>

            <p className="stream-meta-line" role="status">
                {streamLabel} · {total} {total === 1 ? 'article' : 'articles'}
            </p>

            {query.isLoading ? <StorySkeletonList /> : null}

            {!query.isLoading && posts.length > 0 ? (
                <section className="ledger-list" aria-label="Articles">
                    <div className="ledger-head">
                        <span>/ Date</span>
                        <span>/ Name</span>
                        <span>/ Author</span>
                    </div>
                    {posts.map((post) => (
                        <article
                            key={post.id}
                            className="ledger-row"
                            role="link"
                            tabIndex={0}
                            aria-label={`Open article: ${post.title}`}
                            onClick={() => openPost(post.slug)}
                            onKeyDown={(event) => {
                                if (event.key === 'Enter' || event.key === ' ') {
                                    event.preventDefault();
                                    openPost(post.slug);
                                }
                            }}
                        >
                            <p className="ledger-date">
                                <span className="ledger-dot" aria-hidden="true" />
                                <span>{ledgerDate(post.publishedAt)}</span>
                            </p>
                            <div className="ledger-main">
                                <h2 className="ledger-title">
                                    <Link href={`/posts/${post.slug}`} className="headline-link">
                                        <span>{post.title}</span>
                                    </Link>
                                </h2>
                                <p className="ledger-summary">{post.summary ?? 'No summary yet.'}</p>
                            </div>
                            <p className="ledger-author">BY {(post.author ?? 'Editorial Desk').toUpperCase()}</p>
                        </article>
                    ))}
                </section>
            ) : null}

            {!query.isLoading && posts.length === 0 ? (
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
