import './globals.css';
import Link from 'next/link';
import type { Metadata } from 'next';
import localFont from 'next/font/local';

import { SocialDock } from '../components/social-dock';
import { SyncHintBeacon } from '../components/sync-hint-beacon';
import { ThemeToggle } from '../components/theme-toggle';
import { fetchSiteSettings } from '../lib/api';

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3001';

const monaSans = localFont({
    src: '../../../../node_modules/.pnpm/node_modules/@fontsource-variable/mona-sans/files/mona-sans-latin-wght-normal.woff2',
    weight: '200 900',
    style: 'normal',
    variable: '--font-sans',
    display: 'swap',
});

const sourceSerif = localFont({
    src: [
        {
            path: '../../../../node_modules/.pnpm/node_modules/@fontsource/source-serif-4/files/source-serif-4-latin-400-normal.woff2',
            weight: '400',
            style: 'normal',
        },
        {
            path: '../../../../node_modules/.pnpm/node_modules/@fontsource/source-serif-4/files/source-serif-4-latin-600-normal.woff2',
            weight: '600',
            style: 'normal',
        },
    ],
    variable: '--font-serif',
    display: 'swap',
});

export const metadata: Metadata = {
    metadataBase: new URL(siteUrl),
    title: 'Blazion',
    description: 'A minimalist publication powered by Notion',
    openGraph: {
        type: 'website',
        title: 'Blazion',
        description: 'A minimalist publication powered by Notion',
        url: siteUrl,
    },
    twitter: {
        card: 'summary_large_image',
        title: 'Blazion',
        description: 'A minimalist publication powered by Notion',
    },
};

const themeScript = `
(() => {
  try {
    const stored = localStorage.getItem('blog-theme');
    const dark = stored === 'dark';
    document.documentElement.classList.toggle('dark', dark);
  } catch {}
})();
`;

export default async function RootLayout({ children }) {
    const siteSettings = await fetchSiteSettings({ revalidate: 300 });

    return (
        <html lang="en" className={`${monaSans.variable} ${sourceSerif.variable}`}>
            <body>
                <script dangerouslySetInnerHTML={{ __html: themeScript }} />
                <header className="site-header">
                    <div className="shell nav-wrap">
                        <Link href="/" className="brand-mark">
                            Blazion
                        </Link>
                        <div />
                        <ThemeToggle />
                    </div>
                </header>
                {children}
                <SyncHintBeacon />
                <SocialDock socials={siteSettings.socials} />
            </body>
        </html>
    );
}
