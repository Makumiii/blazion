import { Skeleton } from '@/components/ui/skeleton';

export default function LoadingPost() {
    return (
        <main className="shell article-shell" aria-busy="true" aria-live="polite">
            <Skeleton className="mb-6 h-4 w-20" />

            <article className="article">
                <section className="featured-story" style={{ animationDelay: '0ms' }}>
                    <div className="featured-left">
                        <Skeleton className="w-full aspect-[4/5]" />
                    </div>
                    <div className="featured-body" style={{ gap: '1rem' }}>
                        <Skeleton className="h-3 w-44" />
                        <Skeleton className="h-14 w-[92%]" />
                        <Skeleton className="h-14 w-[55%]" />
                        <Skeleton className="h-3 w-32" />
                        <div className="flex gap-2">
                            <Skeleton className="h-6 w-14" />
                            <Skeleton className="h-6 w-18" />
                            <Skeleton className="h-6 w-16" />
                        </div>
                    </div>
                </section>

                <section className="content-state mt-10">
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
                </section>
            </article>
        </main>
    );
}
