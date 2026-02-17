export default function PostsLoading() {
    return (
        <section className="skeleton-page" aria-busy="true" aria-label="Loading posts">
            <div className="skeleton-line wide" />
            <div className="skeleton-grid">
                <div className="skeleton-media" />
                <div className="skeleton-media" />
                <div className="skeleton-media" />
            </div>
        </section>
    );
}
