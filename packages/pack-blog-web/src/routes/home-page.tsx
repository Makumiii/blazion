import { fetchSiteSettings } from '../lib/api';
import { buildHomeMetadata, buildWebsiteJsonLd, resolveSiteUrl } from '../lib/seo';
import { HomeFeed } from '../components/home-feed';

export const revalidate = 120;

export async function generateMetadata({ searchParams }) {
    const siteSettings = await fetchSiteSettings({ revalidate: 300 });
    const page = Math.max(1, Number(searchParams?.page ?? '1') || 1);

    return buildHomeMetadata({
        siteSettings,
        siteUrl: resolveSiteUrl(process.env.NEXT_PUBLIC_SITE_URL),
        searchState: {
            page,
            q: typeof searchParams?.q === 'string' ? searchParams.q : null,
            tab: typeof searchParams?.tab === 'string' ? searchParams.tab : null,
            segment: typeof searchParams?.segment === 'string' ? searchParams.segment : null,
        },
    });
}

export default async function HomePage() {
    const siteSettings = await fetchSiteSettings({ revalidate: 300 });
    const websiteJsonLd = buildWebsiteJsonLd({
        siteSettings,
        siteUrl: resolveSiteUrl(process.env.NEXT_PUBLIC_SITE_URL),
    });

    return (
        <>
            <script
                type="application/ld+json"
                dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteJsonLd) }}
            />
            <HomeFeed />
        </>
    );
}
