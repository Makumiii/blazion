export default function LoadingPost() {
    return (
        <main className="shell article-shell" aria-busy="true" aria-live="polite">
            <div className="skeleton skeleton-line" style={{ width: 112, marginBottom: '1rem' }} />

            <article className="article">
                <section className="featured-story article-hero-match">
                    <div className="featured-left">
                        <div className="skeleton skeleton-media" />
                    </div>
                    <div className="featured-body skeleton-stack">
                        <div className="skeleton skeleton-line" style={{ width: 240 }} />
                        <div className="skeleton skeleton-line-lg" style={{ width: '94%' }} />
                        <div className="skeleton skeleton-line" style={{ width: 180 }} />
                        <div style={{ display: 'flex', gap: '0.45rem', flexWrap: 'wrap' }}>
                            <div className="skeleton skeleton-line" style={{ width: 66 }} />
                            <div className="skeleton skeleton-line" style={{ width: 74 }} />
                            <div className="skeleton skeleton-line" style={{ width: 62 }} />
                        </div>
                    </div>
                </section>

                <section className="content-state" style={{ marginTop: '1.6rem' }}>
                    <div className="skeleton-stack">
                        {Array.from({ length: 9 }).map((_, idx) => (
                            <div
                                key={idx}
                                className="skeleton skeleton-line"
                                style={{
                                    width: idx % 4 === 0 ? '72%' : idx % 3 === 0 ? '88%' : '96%',
                                }}
                            />
                        ))}
                    </div>
                </section>
            </article>
        </main>
    );
}
