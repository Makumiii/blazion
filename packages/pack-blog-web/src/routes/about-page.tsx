import type { Metadata } from 'next';

export const metadata: Metadata = {
    title: 'About',
};

export default function AboutPage() {
    return (
        <section className="prose-shell">
            <p className="eyebrow">About</p>
            <h1>Editorial UI for API-first blogs</h1>
            <p>
                This frontend is built from the Blazion API contract, not guessed CMS assumptions. It handles
                pagination, filtering, related posts, content modes, and resilient media rendering.
            </p>
        </section>
    );
}
