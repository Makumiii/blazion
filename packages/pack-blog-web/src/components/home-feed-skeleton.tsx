import { Skeleton } from './ui/skeleton';

interface HomeFeedSkeletonProps {
    rows?: number;
    showControls?: boolean;
}

export function HomeFeedSkeleton({ rows = 4, showControls = true }: HomeFeedSkeletonProps) {
    return (
        <>
            {showControls ? (
                <section className="home-controls" aria-label="Loading filters">
                    <div className="filter-carousel-shell">
                        <div className="filter-carousel">
                            <div className="filter-carousel-track">
                                {Array.from({ length: 4 }).map((_, index) => (
                                    <div key={index} className="filter-piece">
                                        <Skeleton className="h-12 w-24 rounded-full" />
                                        {index < 3 ? <span className="filter-separator" aria-hidden="true">/</span> : null}
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                    <div className="home-search-wrap">
                        <Skeleton className="h-12 w-full rounded-full" />
                    </div>
                </section>
            ) : null}

            <div className="stream-meta-line" role="status">
                <Skeleton className="h-4 w-40" />
            </div>

            <section className="ledger-list" aria-label="Loading stories">
                <div className="ledger-head">
                    <span>/ Date</span>
                    <span>/ Name</span>
                    <span>/ Author</span>
                </div>
                {Array.from({ length: rows }).map((_, index) => (
                    <article key={index} className="ledger-row">
                        <div className="ledger-date">
                            <span className="ledger-dot" aria-hidden="true" />
                            <Skeleton className="h-4 w-20" />
                        </div>
                        <div className="ledger-main">
                            <h2 className="ledger-title">
                                <Skeleton className="h-8 w-[min(90%,36rem)]" />
                            </h2>
                            <div className="ledger-summary">
                                <Skeleton className="h-4 w-[95%]" />
                            </div>
                        </div>
                        <div className="ledger-author">
                            <Skeleton className="h-4 w-24 justify-self-end" />
                        </div>
                    </article>
                ))}
            </section>
        </>
    );
}
