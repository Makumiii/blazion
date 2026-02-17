import type { Metadata } from 'next';

export const metadata: Metadata = {
    title: 'About',
    description: 'The design philosophy and technical foundation behind Blazion Journal.',
};

export default function AboutPage() {
    return (
        <section className="prose-shell">
            <p className="eyebrow">About</p>
            <h1>Editorial UI for API-first blogs</h1>
            <p>
                Blazion Journal is designed around the belief that editorial content deserves
                editorial presentation. Every typographic decision, every spacing value, every
                interaction is deliberate — informed by Scandinavian design principles of
                restraint, material honesty, and precision.
            </p>
            <p>
                This frontend is built from the Blazion API contract, not guessed CMS assumptions.
                It handles pagination, filtering, related posts, content modes, and resilient
                media rendering. Content is synced from Notion and rendered through a custom
                design system that prioritises readability and quiet confidence over visual noise.
            </p>
        </section>
    );
}
