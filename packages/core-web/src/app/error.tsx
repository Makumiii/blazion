'use client';

export default function GlobalError({
    error,
    reset,
}: {
    error: Error;
    reset: () => void;
}) {
    return (
        <section className="state-block">
            <h2>Something went wrong</h2>
            <p>{error.message || 'Unexpected rendering error.'}</p>
            <button type="button" onClick={reset}>
                Retry
            </button>
        </section>
    );
}
