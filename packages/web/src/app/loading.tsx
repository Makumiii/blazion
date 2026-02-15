export default function Loading() {
    return (
        <main className="shell stories-shell" aria-busy="true" aria-live="polite">
            <section className="stories-head skeleton-stack">
                <div className="skeleton skeleton-line" style={{ width: 96 }} />
                <div className="skeleton skeleton-line-lg" style={{ width: 'min(560px, 72vw)' }} />
            </section>

            <article className="featured-story">
                <div className="featured-left">
                    <div className="skeleton skeleton-media" />
                    <div className="skeleton skeleton-line" style={{ width: '92%' }} />
                </div>
                <div className="featured-body skeleton-stack">
                    <div className="skeleton skeleton-line" style={{ width: 180 }} />
                    <div className="skeleton skeleton-line-lg" style={{ width: '88%' }} />
                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.55rem' }}>
                        <div className="skeleton skeleton-circle" />
                        <div className="skeleton skeleton-line" style={{ width: 180 }} />
                    </div>
                    <div style={{ display: 'flex', gap: '0.45rem', flexWrap: 'wrap' }}>
                        <div className="skeleton skeleton-line" style={{ width: 66 }} />
                        <div className="skeleton skeleton-line" style={{ width: 58 }} />
                        <div className="skeleton skeleton-line" style={{ width: 72 }} />
                    </div>
                </div>
            </article>

            <section className="story-divider" aria-hidden="true" />

            <section className="story-list home-story-list">
                {Array.from({ length: 3 }).map((_, idx) => (
                    <article key={idx} className="story-row home-story-row">
                        <div className="skeleton skeleton-media" />
                        <div className="story-body skeleton-stack">
                            <div className="skeleton skeleton-line" style={{ width: '56%' }} />
                            <div className="skeleton skeleton-line-lg" style={{ width: '82%' }} />
                            <div className="skeleton skeleton-line" style={{ width: '96%' }} />
                            <div style={{ display: 'flex', gap: '0.45rem' }}>
                                <div className="skeleton skeleton-line" style={{ width: 60 }} />
                                <div className="skeleton skeleton-line" style={{ width: 72 }} />
                            </div>
                        </div>
                    </article>
                ))}
            </section>
        </main>
    );
}
