import { HomeFeed } from '@/components/home-feed';
import { fetchSiteSettings } from '@/lib/api';

export const revalidate = 120;

export default async function HomePage() {
    const siteSettings = await fetchSiteSettings({ revalidate: 300 });
    return <HomeFeed homeHeader={siteSettings.site.homeHeader} />;
}
