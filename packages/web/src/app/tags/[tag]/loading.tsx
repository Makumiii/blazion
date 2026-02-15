export default function LoadingTag() {
    return (
        <main className="shell stories-shell" aria-busy="true" aria-live="polite">
            <section className="section-head">
                <div className="skeleton skeleton-line-lg" style={{ width: 220 }} />
                <div className="skeleton skeleton-line" style={{ width: 90 }} />
            </section>

            <section className="story-list">
                {Array.from({ length: 4 }).map((_, idx) => (
                    <article key={idx} className="story-row">
                        <div className="skeleton skeleton-media" />
                        <div className="story-body skeleton-stack">
                            <div className="skeleton skeleton-line" style={{ width: '52%' }} />
                            <div className="skeleton skeleton-line-lg" style={{ width: '78%' }} />
                            <div className="skeleton skeleton-line" style={{ width: '94%' }} />
                        </div>
                    </article>
                ))}
            </section>
        </main>
    );
}
