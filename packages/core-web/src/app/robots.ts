import type { MetadataRoute } from 'next';
import { buildRobotsMetadata, resolveSiteUrl } from '@blazion/pack-blog-web/seo';

import { fetchSiteSettings } from '../lib/api';

export default async function robots(): Promise<MetadataRoute.Robots> {
    const siteSettings = await fetchSiteSettings({ revalidate: 300 });

    return buildRobotsMetadata({
        siteSettings,
        siteUrl: resolveSiteUrl(process.env.NEXT_PUBLIC_SITE_URL),
    });
}
