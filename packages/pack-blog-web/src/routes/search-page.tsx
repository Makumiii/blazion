import type { Metadata } from 'next';

import { PaginationNav } from '../components/pagination-nav';
import { PostCard } from '../components/post-card';
import { StateBlock } from '../components/state-block';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { listPosts } from '../lib/api/client';

interface SearchPageProps {
    searchParams?: {
        q?: string;
        page?: string;
    };
}

export const metadata: Metadata = {
    title: 'Search',
};

export default async function SearchPage({ searchParams }: SearchPageProps) {
    const q = searchParams?.q?.trim() ?? '';
    const page = Math.max(1, Number(searchParams?.page ?? '1') || 1);

    if (q.length === 0) {
        return (
            <section className="search-shell">
                <h1>Search posts</h1>
                <form action="/search" method="get" className="search-form">
                    <label htmlFor="q">Keyword</label>
                    <Input id="q" name="q" placeholder="Design systems, API, Notion..." />
                    <Button type="submit" variant="unstyled">Search</Button>
                </form>
            </section>
        );
    }

    try {
        const posts = await listPosts({
            q,
            page,
            limit: 10,
        });

        return (
            <>
                <section className="search-shell">
                    <h1>Search posts</h1>
                    <form action="/search" method="get" className="search-form">
                        <label htmlFor="q">Keyword</label>
                        <Input id="q" name="q" defaultValue={q} />
                        <Button type="submit" variant="unstyled">Search</Button>
                    </form>
                </section>

                {posts.data.length === 0 ? (
                    <StateBlock
                        title="No matches"
                        message={`No posts found for "${q}". Try a shorter term.`}
                        actionHref="/search"
                        actionLabel="Reset search"
                    />
                ) : (
                    <>
                        <section className="post-grid" aria-label="Search results">
                            {posts.data.map((post) => (
                                <PostCard key={post.id} post={post} />
                            ))}
                        </section>
                        <PaginationNav
                            page={posts.pagination.page}
                            totalPages={posts.pagination.totalPages}
                            basePath="/search"
                            searchParams={{ q }}
                        />
                    </>
                )}
            </>
        );
    } catch {
        return (
            <StateBlock
                title="Search unavailable"
                message="Could not run search against the API."
                actionHref="/search"
                actionLabel="Retry"
            />
        );
    }
}
