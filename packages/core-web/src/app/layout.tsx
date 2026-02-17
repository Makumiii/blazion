import './globals.css';
import type { Metadata } from 'next';

import { ThemeToggle } from '@blazion/pack-blog-web/components/theme-toggle';
import { SyncHintBeacon } from '../components/sync-hint-beacon';
import { QueryProvider } from '../components/providers/query-provider';
import { ThemeProvider } from '../components/providers/theme-provider';
import { fetchSiteSettings } from '../lib/api';

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3001';

export const metadata: Metadata = {
    metadataBase: new URL(siteUrl),
    title: 'Blazion',
    description: 'Operational intelligence and strategic writing for product organizations.',
    openGraph: {
        type: 'website',
        title: 'Blazion',
        description: 'Operational intelligence and strategic writing for product organizations.',
        url: siteUrl,
    },
    twitter: {
        card: 'summary_large_image',
        title: 'Blazion',
        description: 'Operational intelligence and strategic writing for product organizations.',
    },
};

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
        <html lang="en" suppressHydrationWarning>
            <body>
                <ThemeProvider>
                    <QueryProvider>
                        <header className="utility-header" aria-label="Utility controls">
                            <div className="shell utility-header-inner">
                                <div className="utility-header-slot" />
                                <div className="utility-header-slot utility-header-controls">
                                    <ThemeToggle />
                                </div>
                            </div>
                        </header>
                        {children}
                        {followLinks.length > 0 ? (
                            <footer className="global-footer">
                                <div className="shell footer-inner">
                                    <div className="footer-links">
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
                    </QueryProvider>
                </ThemeProvider>
            </body>
        </html>
    );
}
