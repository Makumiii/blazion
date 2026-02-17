'use client';

import type { ReactElement } from 'react';
import { useState } from 'react';
import { Button } from './ui/button';

interface PostSharePanelProps {
    postUrl: string;
    providers?: string[];
}

type ShareProvider = 'x' | 'whatsapp' | 'facebook' | 'linkedin' | 'instagram' | 'telegram' | 'reddit' | 'email';

const SUPPORTED_PROVIDERS: ShareProvider[] = [
    'x',
    'whatsapp',
    'facebook',
    'linkedin',
    'instagram',
    'telegram',
    'reddit',
    'email',
];

function iconFor(key: ShareProvider | 'copy'): ReactElement {
    switch (key) {
        case 'linkedin':
            return (
                <svg viewBox="0 0 24 24" className="digest-share-icon" aria-hidden="true">
                    <path
                        fill="currentColor"
                        d="M19 3A2 2 0 0 1 21 5v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h14Zm-9 7H7v7h3v-7Zm5.9-.2c-1.4 0-2.2.8-2.6 1.4V10h-3v7h3v-3.8c0-1 .2-2 1.4-2s1.2 1.2 1.2 2V17h3v-4.6c0-2.3-.8-3.6-3-3.6ZM8.5 6A1.5 1.5 0 0 0 7 7.5 1.5 1.5 0 0 0 8.5 9 1.5 1.5 0 0 0 10 7.5 1.5 1.5 0 0 0 8.5 6Z"
                    />
                </svg>
            );
        case 'x':
            return (
                <svg viewBox="0 0 24 24" className="digest-share-icon" aria-hidden="true">
                    <path
                        fill="currentColor"
                        d="M18.9 3h2.9l-6.4 7.3L23 21h-6l-4.7-6.2L7 21H4l6.8-7.8L2 3h6.2l4.2 5.7L18.9 3Zm-1 16h1.7L7.3 4.8H5.5L17.9 19Z"
                    />
                </svg>
            );
        case 'whatsapp':
            return (
                <svg viewBox="0 0 24 24" className="digest-share-icon" aria-hidden="true">
                    <path
                        fill="currentColor"
                        d="M12 3a9 9 0 0 0-7.8 13.5L3 21l4.7-1.2A9 9 0 1 0 12 3Zm5.3 12.7c-.2.6-1.2 1.1-1.7 1.2-.5 0-1 .2-3.2-.7-2.7-1.2-4.4-4-4.5-4.2-.1-.2-1.1-1.4-1.1-2.7 0-1.3.7-1.9 1-2.2.2-.2.5-.3.7-.3h.5c.2 0 .4 0 .6.5.2.6.8 1.9.8 2.1.1.2.1.4 0 .6-.1.2-.2.3-.4.5-.2.2-.3.4-.5.5-.2.2-.3.4-.1.8.2.3 1 1.7 2.2 2.7 1.5 1.3 2.7 1.7 3.1 1.9.4.2.6.1.8-.1.3-.3 1-1.1 1.2-1.4.2-.3.5-.3.8-.2.3.1 2 .9 2.3 1.1.3.1.5.2.6.4.1.3.1.8-.1 1.4Z"
                    />
                </svg>
            );
        case 'instagram':
            return (
                <svg viewBox="0 0 24 24" className="digest-share-icon" aria-hidden="true">
                    <path
                        fill="currentColor"
                        d="M7.8 3h8.4A4.8 4.8 0 0 1 21 7.8v8.4a4.8 4.8 0 0 1-4.8 4.8H7.8A4.8 4.8 0 0 1 3 16.2V7.8A4.8 4.8 0 0 1 7.8 3Zm0 1.8A3 3 0 0 0 4.8 7.8v8.4a3 3 0 0 0 3 3h8.4a3 3 0 0 0 3-3V7.8a3 3 0 0 0-3-3H7.8Zm9 1.5a1.2 1.2 0 1 1 0 2.4 1.2 1.2 0 0 1 0-2.4ZM12 7a5 5 0 1 1 0 10 5 5 0 0 1 0-10Zm0 1.8a3.2 3.2 0 1 0 0 6.4 3.2 3.2 0 0 0 0-6.4Z"
                    />
                </svg>
            );
        case 'facebook':
            return (
                <svg viewBox="0 0 24 24" className="digest-share-icon" aria-hidden="true">
                    <path
                        fill="currentColor"
                        d="M13.5 21v-7h2.3l.4-3h-2.7V9.2c0-.9.3-1.5 1.6-1.5h1.2V5c-.2 0-.9-.1-1.8-.1-2.7 0-4.1 1.4-4.1 4.1V11H8v3h2.4v7h3.1Z"
                    />
                </svg>
            );
        case 'email':
            return (
                <svg viewBox="0 0 24 24" className="digest-share-icon" aria-hidden="true">
                    <path
                        fill="currentColor"
                        d="M4 5h16a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2Zm0 2v.4l8 5.2 8-5.2V7H4Zm16 10V9.7l-7.5 4.9a1 1 0 0 1-1 0L4 9.7V17h16Z"
                    />
                </svg>
            );
        default:
            return (
                <svg viewBox="0 0 24 24" className="digest-share-icon" aria-hidden="true">
                    <path
                        fill="currentColor"
                        d="M9 8V6a2 2 0 0 1 2-2h7a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2h-2v-2h2V6h-7v2H9Zm-5 3a2 2 0 0 1 2-2h7a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2v-9Zm2 0v9h7v-9H6Z"
                    />
                </svg>
            );
    }
}

function normalizedProviders(input: string[] | undefined): ShareProvider[] {
    const raw = Array.isArray(input) && input.length > 0 ? input : ['x', 'whatsapp', 'facebook', 'linkedin'];
    const result: ShareProvider[] = [];
    for (const item of raw) {
        if (!SUPPORTED_PROVIDERS.includes(item as ShareProvider)) {
            continue;
        }
        const provider = item as ShareProvider;
        if (!result.includes(provider)) {
            result.push(provider);
        }
    }
    return result;
}

function buildShareHref(provider: ShareProvider, postUrl: string): string | null {
    const encodedUrl = encodeURIComponent(postUrl);
    const encodedText = encodeURIComponent(`Check this out: ${postUrl}`);
    switch (provider) {
        case 'x':
            return `https://x.com/intent/tweet?url=${encodedUrl}&text=${encodedText}`;
        case 'whatsapp':
            return `https://wa.me/?text=${encodedText}`;
        case 'facebook':
            return `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`;
        case 'linkedin':
            return `https://www.linkedin.com/sharing/share-offsite/?url=${encodedUrl}`;
        case 'telegram':
            return `https://t.me/share/url?url=${encodedUrl}&text=${encodedText}`;
        case 'reddit':
            return `https://www.reddit.com/submit?url=${encodedUrl}`;
        case 'email':
            return `mailto:?subject=${encodeURIComponent('Interesting post')}&body=${encodedText}`;
        case 'instagram':
            return null;
        default:
            return null;
    }
}

export function PostSharePanel({ postUrl, providers }: PostSharePanelProps) {
    const [copiedKey, setCopiedKey] = useState<string | null>(null);
    const enabledProviders = normalizedProviders(providers);

    async function copyLink(key: string) {
        try {
            await navigator.clipboard.writeText(postUrl);
            setCopiedKey(key);
            window.setTimeout(() => setCopiedKey((current) => (current === key ? null : current)), 1800);
        } catch {
            setCopiedKey(null);
        }
    }

    return (
        <section className="digest-share" aria-label="Share article">
            <p className="digest-kicker">/ Share</p>
            <div className="digest-share-links">
                <Button
                    type="button"
                    variant="unstyled"
                    onClick={() => copyLink('copy')}
                    aria-label={copiedKey === 'copy' ? 'Link copied' : 'Copy link'}
                    data-tooltip={copiedKey === 'copy' ? 'Copied' : 'Copy link'}
                >
                    {iconFor('copy')}
                </Button>
                {enabledProviders.map((provider) => {
                    const href = buildShareHref(provider, postUrl);
                    if (provider === 'instagram') {
                        const copied = copiedKey === provider;
                        return (
                            <Button
                                key={provider}
                                type="button"
                                variant="unstyled"
                                onClick={() => copyLink(provider)}
                                aria-label={copied ? 'Copied for Instagram' : 'Share to Instagram (copy link)'}
                                data-tooltip={copied ? 'Copied for Instagram' : 'Instagram'}
                            >
                                {iconFor(provider)}
                            </Button>
                        );
                    }
                    if (!href) {
                        return null;
                    }
                    return (
                        <a
                            key={provider}
                            href={href}
                            target={href.startsWith('mailto:') ? undefined : '_blank'}
                            rel={href.startsWith('mailto:') ? undefined : 'noreferrer noopener'}
                            aria-label={provider === 'x' ? 'Twitter/X' : provider === 'linkedin' ? 'LinkedIn' : provider}
                            data-tooltip={provider === 'x' ? 'Twitter/X' : provider === 'linkedin' ? 'LinkedIn' : provider}
                        >
                            {iconFor(provider)}
                        </a>
                    );
                })}
            </div>
        </section>
    );
}
