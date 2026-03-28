import type { Metadata } from 'next';

import { fetchSiteSettings } from '../lib/api';
import { buildPageMetadata, resolveSiteUrl } from '../lib/seo';

export async function generateMetadata(): Promise<Metadata> {
    const siteSettings = await fetchSiteSettings({ revalidate: 300 });

    return buildPageMetadata({
        siteSettings,
        siteUrl: resolveSiteUrl(process.env.NEXT_PUBLIC_SITE_URL),
        title: 'About',
        description: `Learn about ${siteSettings.site.name} and its editorial focus.`,
        path: '/about',
    });
}

export default function AboutPage() {
    return (
        <section className="prose-shell">
            <p className="eyebrow">About</p>
            <h1>About this publication</h1>
            <p>
                This publication is designed around the belief that editorial content deserves
                editorial presentation. The goal is a reading experience that feels calm,
                intentional, and easy to navigate without turning the archive into a noisy feed.
            </p>
            <p>
                Under the surface, the blog is built on structured content, resilient metadata,
                pagination, tagging, related posts, and rich content rendering. The result is a
                reusable publishing setup that can be tailored to a specific publication without
                tying the editorial voice to the underlying platform.
            </p>
        </section>
    );
}
