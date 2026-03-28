import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { expect, test } from 'bun:test';

const seoModulePath = pathToFileURL(
    path.join(import.meta.dir, '..', 'src', 'lib', 'seo.ts'),
).href;

const siteSettings = {
    socials: {},
    share: { providers: ['x'] },
    site: {
        name: 'Everything Technology',
        homeHeader: 'Everything Technology',
        seo: {
            description: 'Practical essays on engineering systems.',
            locale: 'en_US',
            keywords: ['engineering', 'systems'],
            twitterHandle: '@dev_maks',
            defaultOgImage: 'https://example.com/og.png',
            robots: {
                index: true,
                follow: true,
            },
        },
    },
};

test('seo helpers expose reusable site-level metadata builders', async () => {
    const seo = await import(seoModulePath);
    const metadata = seo.buildSiteMetadata({
        siteSettings,
        siteUrl: 'https://example.com',
    });

    expect(typeof seo.buildSiteMetadata).toBe('function');
    expect(metadata.title).toEqual({
        default: 'Everything Technology',
        template: '%s | Everything Technology',
    });
    expect(metadata.openGraph?.siteName).toBe('Everything Technology');
    expect(metadata.twitter?.site).toBe('@dev_maks');
});

test('home metadata noindexes filtered states and keeps root canonical', async () => {
    const seo = await import(seoModulePath);
    const metadata = seo.buildHomeMetadata({
        siteSettings,
        siteUrl: 'https://example.com',
        searchState: {
            q: 'notion',
            page: 1,
        },
    });

    expect(metadata.robots).toEqual({ index: false, follow: true });
    expect(metadata.alternates?.canonical).toBe('/');
});

test('tag metadata is blog-branded instead of product-branded', async () => {
    const seo = await import(seoModulePath);
    const metadata = seo.buildTagMetadata({
        siteSettings,
        siteUrl: 'https://example.com',
        tag: 'SEO',
        postCount: 3,
    });

    expect(metadata.title).toBe('SEO');
    expect(metadata.description).toContain('3');
    expect(metadata.description).toContain('Everything Technology');
    expect(metadata.alternates?.canonical).toBe('/tags/SEO');
});
