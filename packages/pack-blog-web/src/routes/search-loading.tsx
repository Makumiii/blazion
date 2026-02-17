export default function SearchLoading() {
    return (
        <section className="skeleton-page" aria-busy="true" aria-label="Loading search">
            <div className="skeleton-line wide" />
            <div className="skeleton-line" />
            <div className="skeleton-grid">
                <div className="skeleton-media" />
                <div className="skeleton-media" />
                <div className="skeleton-media" />
            </div>
        </section>
    );
}
