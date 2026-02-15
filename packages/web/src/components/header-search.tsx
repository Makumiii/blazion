'use client';

import { useEffect, useMemo, useRef, useState, type KeyboardEvent } from 'react';
import { useRouter } from 'next/navigation';

interface SearchPost {
    id: string;
    slug: string;
    title: string;
    summary: string | null;
    author: string | null;
    tags: string[];
    segment: string | null;
    publishedAt: string | null;
    readTimeMinutes: number | null;
    featured: boolean;
}

function apiBaseUrl(): string {
    return (
        process.env.NEXT_PUBLIC_BLAZION_API_URL ??
        process.env.BLAZION_API_URL ??
        'http://localhost:3000'
    );
}

function normalize(input: string): string {
    return input.trim().toLowerCase();
}

function subsequenceScore(query: string, text: string): number {
    if (!query || !text) {
        return 0;
    }

    let score = 0;
    let qi = 0;
    let consecutive = 0;

    for (let ti = 0; ti < text.length && qi < query.length; ti += 1) {
        if (query[qi] === text[ti]) {
            qi += 1;
            consecutive += 1;
            score += 1 + consecutive * 0.25;
        } else {
            consecutive = 0;
        }
    }

    if (qi !== query.length) {
        return 0;
    }

    return score / Math.max(1, text.length);
}

function scoreField(query: string, value: string, weight: number): number {
    const normalized = normalize(value);
    if (!normalized) {
        return 0;
    }

    const directIndex = normalized.indexOf(query);
    if (directIndex >= 0) {
        return weight * (2.2 - Math.min(1, directIndex / Math.max(1, normalized.length)));
    }

    const fuzzy = subsequenceScore(query, normalized);
    return fuzzy > 0 ? fuzzy * weight : 0;
}

function scorePost(query: string, post: SearchPost): number {
    const tagText = post.tags.join(' ');
    let score = 0;
    score += scoreField(query, post.title, 8);
    score += scoreField(query, post.summary ?? '', 3.5);
    score += scoreField(query, tagText, 3);
    score += scoreField(query, post.author ?? '', 2.4);
    score += scoreField(query, post.segment ?? '', 2.2);

    if (post.featured) {
        score += 0.15;
    }

    return score;
}

function readableDate(value: string | null): string {
    if (!value) {
        return 'Unscheduled';
    }
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
        return value;
    }
    return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
    });
}

export function HeaderSearch() {
    const router = useRouter();
    const rootRef = useRef<HTMLFormElement | null>(null);
    const [open, setOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const [query, setQuery] = useState('');
    const [debouncedQuery, setDebouncedQuery] = useState('');
    const [posts, setPosts] = useState<SearchPost[]>([]);
    const [activeIndex, setActiveIndex] = useState(-1);
    const [loaded, setLoaded] = useState(false);

    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedQuery(query);
        }, 120);
        return () => clearTimeout(timer);
    }, [query]);

    useEffect(() => {
        if (!open || loaded) {
            return;
        }

        let cancelled = false;
        setLoading(true);
        fetch(`${apiBaseUrl()}/api/search-index?limit=300`)
            .then(async (response) => {
                if (!response.ok) {
                    return { data: [] };
                }
                return response.json();
            })
            .then((payload) => {
                if (cancelled) {
                    return;
                }
                setPosts(Array.isArray(payload?.data) ? payload.data : []);
                setLoaded(true);
            })
            .catch(() => {
                if (!cancelled) {
                    setPosts([]);
                    setLoaded(true);
                }
            })
            .finally(() => {
                if (!cancelled) {
                    setLoading(false);
                }
            });

        return () => {
            cancelled = true;
        };
    }, [open, loaded]);

    useEffect(() => {
        if (!open) {
            return;
        }

        const onPointerDown = (event: MouseEvent) => {
            const target = event.target as Node | null;
            if (!target) {
                return;
            }
            if (rootRef.current?.contains(target)) {
                return;
            }
            setOpen(false);
        };

        document.addEventListener('mousedown', onPointerDown);
        return () => document.removeEventListener('mousedown', onPointerDown);
    }, [open]);

    const normalizedQuery = normalize(debouncedQuery);
    const results = useMemo(() => {
        if (normalizedQuery.length < 2) {
            return [];
        }

        return posts
            .map((post) => ({
                post,
                score: scorePost(normalizedQuery, post),
            }))
            .filter((entry) => entry.score > 0)
            .sort((a, b) => b.score - a.score)
            .slice(0, 8)
            .map((entry) => entry.post);
    }, [posts, normalizedQuery]);

    useEffect(() => {
        setActiveIndex(results.length > 0 ? 0 : -1);
    }, [normalizedQuery, results.length]);

    function navigateToSlug(slug: string): void {
        setOpen(false);
        setQuery('');
        setDebouncedQuery('');
        router.push(`/posts/${slug}`);
    }

    function submitSearch(): void {
        const trimmed = query.trim();
        if (!trimmed) {
            return;
        }

        if (results.length > 0 && activeIndex >= 0) {
            navigateToSlug(results[activeIndex].slug);
            return;
        }

        setOpen(false);
        router.push(`/?q=${encodeURIComponent(trimmed)}`);
    }

    function onKeyDown(event: KeyboardEvent<HTMLInputElement>): void {
        if (event.key === 'ArrowDown') {
            event.preventDefault();
            if (results.length === 0) {
                return;
            }
            setActiveIndex((prev) => (prev + 1) % results.length);
            return;
        }
        if (event.key === 'ArrowUp') {
            event.preventDefault();
            if (results.length === 0) {
                return;
            }
            setActiveIndex((prev) => (prev <= 0 ? results.length - 1 : prev - 1));
            return;
        }
        if (event.key === 'Escape') {
            setOpen(false);
            return;
        }
        if (event.key === 'Enter') {
            event.preventDefault();
            submitSearch();
        }
    }

    return (
        <form
            ref={rootRef}
            method="get"
            action="/"
            className="header-search"
            role="search"
            onSubmit={(event) => {
                event.preventDefault();
                submitSearch();
            }}
        >
            <div className="header-search-shell">
                <span className="header-search-icon" aria-hidden="true">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9">
                        <circle cx="11" cy="11" r="7" />
                        <path d="M20 20L16.5 16.5" />
                    </svg>
                </span>
                <input
                    type="search"
                    name="q"
                    className="header-search-input"
                    placeholder="What post are you looking for"
                    aria-label="Search articles"
                    value={query}
                    autoComplete="off"
                    onFocus={() => setOpen(true)}
                    onChange={(event) => {
                        setOpen(true);
                        setQuery(event.target.value);
                    }}
                    onKeyDown={onKeyDown}
                />
            </div>

            {open ? (
                <div className="header-search-panel" role="listbox" aria-label="Search results">
                    {loading ? <p className="header-search-state">Loading posts...</p> : null}
                    {!loading && normalizedQuery.length < 2 ? (
                        <p className="header-search-state">Type at least 2 characters</p>
                    ) : null}
                    {!loading && normalizedQuery.length >= 2 && results.length === 0 ? (
                        <p className="header-search-state">No matching posts</p>
                    ) : null}
                    {!loading && results.length > 0 ? (
                        <ul className="header-search-list">
                            {results.map((post, index) => (
                                <li key={post.id}>
                                    <button
                                        type="button"
                                        className={`header-search-item${index === activeIndex ? ' is-active' : ''}`}
                                        onMouseEnter={() => setActiveIndex(index)}
                                        onClick={() => navigateToSlug(post.slug)}
                                    >
                                        <span className="header-search-item-title">{post.title}</span>
                                        <span className="header-search-item-meta">
                                            {readableDate(post.publishedAt)}
                                            {post.readTimeMinutes ? ` · ${post.readTimeMinutes} min read` : ''}
                                            {post.segment ? ` · ${post.segment}` : ''}
                                        </span>
                                    </button>
                                </li>
                            ))}
                        </ul>
                    ) : null}
                </div>
            ) : null}
        </form>
    );
}
