import { Skeleton } from '@/components/ui/skeleton';

export default function LoadingPost() {
    return (
        <main className="shell post-shell" aria-busy="true" aria-live="polite">
            <Skeleton className="mb-4 h-8 w-8 rounded-full" />

            <article className="post-stage digest-stage">
                <header className="digest-hero" aria-label="Article heading loading">
                    <Skeleton className="h-14 w-[88%]" />
                    <Skeleton className="mt-2 h-14 w-[70%]" />
                    <Skeleton className="mt-4 h-4 w-[72%]" />
                </header>

                <div className="digest-layout">
                    <aside className="digest-sidebar" aria-label="Article metadata loading">
                        <Skeleton className="h-3 w-28" />
                        <Skeleton className="h-11 w-full" />
                        <Skeleton className="h-11 w-full" />
                        <Skeleton className="h-11 w-full" />
                        <Skeleton className="h-20 w-full" />
                    </aside>

                    <section className="digest-article" aria-label="Article body loading">
                        <Skeleton className="h-3 w-24" />
                        <Skeleton className="w-full aspect-[16/9]" />
                        <div className="content-state">
                            <div className="grid gap-4">
                                {Array.from({ length: 8 }).map((_, idx) => (
                                    <Skeleton
                                        key={idx}
                                        className={
                                            idx % 4 === 0
                                                ? 'h-4 w-[65%]'
                                                : idx % 3 === 0
                                                  ? 'h-4 w-[82%]'
                                                  : 'h-4 w-[95%]'
                                        }
                                    />
                                ))}
                            </div>
                        </div>
                    </section>
                </div>

                <section className="post-recommendations" aria-label="Related articles loading">
                    <header className="post-recommendations-head">
                        <Skeleton className="h-3 w-40" />
                    </header>
                    <div className="post-recommendations-track">
                        {Array.from({ length: 2 }).map((_, idx) => (
                            <article key={idx} className="post-recommendation-card">
                                <Skeleton className="w-full aspect-[16/10]" />
                                <div className="post-recommendation-body">
                                    <Skeleton className="h-7 w-[86%]" />
                                    <Skeleton className="h-4 w-[96%]" />
                                    <Skeleton className="h-4 w-[72%]" />
                                </div>
                            </article>
                        ))}
                    </div>
                </section>
            </article>
        </main>
    );
}
