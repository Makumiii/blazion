import Link from 'next/link';

import type { SiteResponse } from '@/lib/api/types';

interface SiteFooterProps {
    site?: SiteResponse['data'];
}

export function SiteFooter({ site }: SiteFooterProps) {
    const socials = site?.socials ?? {};

    return (
        <footer className="site-footer">
            <div className="shell footer-wrap">
                <p className="muted">Thoughtful writing, synced from Notion and served by Blazion.</p>
                <div className="social-row">
                    {socials.github ? <a href={socials.github}>GitHub</a> : null}
                    {socials.x ? <a href={socials.x}>X</a> : null}
                    {socials.linkedin ? <a href={socials.linkedin}>LinkedIn</a> : null}
                    {socials.instagram ? <a href={socials.instagram}>Instagram</a> : null}
                    {socials.email ? <Link href={`mailto:${socials.email}`}>Email</Link> : null}
                </div>
            </div>
        </footer>
    );
}
