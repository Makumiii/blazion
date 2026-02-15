import './globals.css';
import Link from 'next/link';
import type { Metadata } from 'next';
import localFont from 'next/font/local';

import { SocialDock } from '../components/social-dock';
import { SyncHintBeacon } from '../components/sync-hint-beacon';
import { HeaderSearch } from '../components/header-search';
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

const FOLLOW_ORDER = [
    'linkedin',
    'x',
    'instagram',
    'linktree',
    'linkedtree',
    'facebook',
    'github',
    'email',
    'phonenumber',
] as const;

type FollowKey = (typeof FOLLOW_ORDER)[number];
type FollowLinks = Partial<Record<FollowKey, string>>;

function ensureUrl(value: string): string {
    if (value.startsWith('http://') || value.startsWith('https://')) {
        return value;
    }
    return `https://${value}`;
}

function followHref(key: FollowKey, raw: string): string {
    if (key === 'email') {
        return raw.startsWith('mailto:') ? raw : `mailto:${raw}`;
    }
    if (key === 'phonenumber') {
        return raw.startsWith('tel:') ? raw : `tel:${raw}`;
    }
    return ensureUrl(raw);
}

function followLabel(key: FollowKey): string {
    if (key === 'x') {
        return 'X';
    }
    if (key === 'linktree' || key === 'linkedtree') {
        return 'Linktree';
    }
    if (key === 'phonenumber') {
        return 'Phone';
    }
    return key.charAt(0).toUpperCase() + key.slice(1);
}

export default async function RootLayout({ children }) {
    const siteSettings = await fetchSiteSettings({ revalidate: 300 });
    const socials = (siteSettings.socials ?? {}) as FollowLinks;
    const followLinks = FOLLOW_ORDER.flatMap((key) => {
        const raw = typeof socials[key] === 'string' ? socials[key]!.trim() : '';
        if (!raw) {
            return [];
        }
        return [
            {
                key,
                label: followLabel(key),
                href: followHref(key, raw),
                external: key !== 'email' && key !== 'phonenumber',
            },
        ];
    });

    return (
        <html lang="en" className={`${monaSans.variable} ${sourceSerif.variable}`}>
            <body>
                <script dangerouslySetInnerHTML={{ __html: themeScript }} />
                <header className="site-header">
                    <div className="shell nav-wrap">
                        <Link href="/" className="brand-mark">
                            Blazion
                        </Link>
                        <HeaderSearch />
                        <ThemeToggle />
                    </div>
                </header>
                {children}
                {followLinks.length > 0 ? (
                    <footer className="site-footer">
                        <div className="shell follow-wrap">
                            <p>Follow the author</p>
                            <div className="follow-links">
                                {followLinks.map((item) => (
                                    <a
                                        key={item.key}
                                        href={item.href}
                                        target={item.external ? '_blank' : undefined}
                                        rel={item.external ? 'noreferrer noopener' : undefined}
                                    >
                                        {item.label}
                                    </a>
                                ))}
                            </div>
                        </div>
                    </footer>
                ) : null}
                <SyncHintBeacon />
                <SocialDock socials={siteSettings.socials} />
            </body>
        </html>
    );
}
