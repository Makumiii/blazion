import { Skeleton } from '../components/ui/skeleton';

export default function Loading() {
    return (
        <main className="shell stories-shell" aria-busy="true" aria-live="polite">
            <section className="stories-head">
                <Skeleton className="h-16 w-[min(480px,60vw)]" />
            </section>

            {/* Hero — asymmetric 50/50 grid */}
            <article className="featured-story" style={{ animationDelay: '0ms' }}>
                <div className="featured-left">
                    <Skeleton className="w-full aspect-[4/5]" />
                </div>
                <div className="featured-body" style={{ gap: '1rem' }}>
                    <Skeleton className="h-3 w-36" />
                    <Skeleton className="h-12 w-[90%]" />
                    <Skeleton className="h-12 w-[60%]" />
                    <div className="inline-flex items-center gap-2">
                        <Skeleton className="h-7 w-7" />
                        <Skeleton className="h-3 w-28" />
                    </div>
                    <Skeleton className="h-4 w-[80%]" />
                    <div className="flex gap-2">
                        <Skeleton className="h-6 w-16" />
                        <Skeleton className="h-6 w-20" />
                    </div>
                </div>
            </article>

            {/* Story list */}
            <section className="home-story-list">
                {Array.from({ length: 3 }).map((_, idx) => (
                    <article key={idx} className="home-story-row">
                        <div className="home-story-card-content">
                            <Skeleton className="w-full aspect-square" />
                            <div className="story-body" style={{ gap: '0.5rem' }}>
                                <Skeleton className="h-3 w-32" />
                                <Skeleton className="h-7 w-[85%]" />
                                <Skeleton className="h-4 w-[95%]" />
                                <div className="flex gap-2">
                                    <Skeleton className="h-5 w-14" />
                                    <Skeleton className="h-5 w-18" />
                                </div>
                            </div>
                        </div>
                    </article>
                ))}
            </section>
        </main>
    );
}
