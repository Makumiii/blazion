'use client';

import Fuse from 'fuse.js';
import { Search } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useRef, useState, type KeyboardEvent } from 'react';

import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { fetchSearchIndexClient } from '@/lib/client-api';

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
    const [query, setQuery] = useState('');
    const [debouncedQuery, setDebouncedQuery] = useState('');
    const [activeIndex, setActiveIndex] = useState(-1);

    const searchIndexQuery = useQuery({
        queryKey: ['search-index'],
        queryFn: () => fetchSearchIndexClient(400),
        staleTime: 120_000,
        enabled: open,
    });

    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedQuery(query);
        }, 120);
        return () => clearTimeout(timer);
    }, [query]);

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

    const normalizedQuery = debouncedQuery.trim();
    const posts = (searchIndexQuery.data?.data ?? []) as SearchPost[];

    const fuse = useMemo(() => {
        return new Fuse(posts, {
            includeScore: true,
            shouldSort: true,
            threshold: 0.38,
            ignoreLocation: true,
            minMatchCharLength: 2,
            keys: [
                { name: 'title', weight: 0.55 },
                { name: 'summary', weight: 0.15 },
                { name: 'tags', weight: 0.15 },
                { name: 'segment', weight: 0.1 },
                { name: 'author', weight: 0.05 },
            ],
        });
    }, [posts]);

    const results = useMemo(() => {
        if (normalizedQuery.length < 2) {
            return [];
        }
        return fuse.search(normalizedQuery, { limit: 8 }).map((item) => item.item);
    }, [fuse, normalizedQuery]);

    useEffect(() => {
        setActiveIndex(results.length > 0 ? 0 : -1);
    }, [results.length, normalizedQuery]);

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
            if (results.length === 0) return;
            setActiveIndex((prev) => (prev + 1) % results.length);
            return;
        }
        if (event.key === 'ArrowUp') {
            event.preventDefault();
            if (results.length === 0) return;
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
                <Search className="header-search-icon" strokeWidth={1.8} aria-hidden="true" />
                <Input
                    type="search"
                    name="q"
                    className="header-search-input"
                    placeholder="Search articles…"
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
                <Card className="header-search-panel" role="listbox" aria-label="Search results">
                    {searchIndexQuery.isLoading ? (
                        <div className="header-search-state search-loading">
                            <Skeleton className="h-4 w-40" />
                            <Skeleton className="h-9 w-full" />
                            <Skeleton className="h-9 w-full" />
                        </div>
                    ) : null}
                    {!searchIndexQuery.isLoading && normalizedQuery.length < 2 ? (
                        <p className="header-search-state">Type at least 2 characters</p>
                    ) : null}
                    {!searchIndexQuery.isLoading && normalizedQuery.length >= 2 && results.length === 0 ? (
                        <p className="header-search-state">No matching posts</p>
                    ) : null}
                    {!searchIndexQuery.isLoading && results.length > 0 ? (
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
                </Card>
            ) : null}
        </form>
    );
}
