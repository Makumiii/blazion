import { Skeleton } from '../components/ui/skeleton';

export default function LoadingTag() {
    return (
        <main className="shell stories-shell" aria-busy="true" aria-live="polite">
            <section className="section-head">
                <Skeleton className="h-9 w-[220px]" />
                <Skeleton className="h-4 w-[90px]" />
            </section>

            <section className="story-list">
                {Array.from({ length: 4 }).map((_, idx) => (
                    <article key={idx} className="story-row">
                        <Skeleton className="skeleton-media" />
                        <div className="story-body grid gap-3">
                            <Skeleton className="h-4 w-[52%]" />
                            <Skeleton className="h-8 w-[78%]" />
                            <Skeleton className="h-4 w-[94%]" />
                        </div>
                    </article>
                ))}
            </section>
        </main>
    );
}
