'use client';

import type { ReactElement } from 'react';
import { useState } from 'react';
import { Button } from './ui/button';

interface PostSharePanelProps {
    postUrl: string;
    socials?: Record<string, string | undefined>;
}

function normalizeUrl(value: string): string {
    if (value.startsWith('http://') || value.startsWith('https://') || value.startsWith('mailto:') || value.startsWith('tel:')) {
        return value;
    }
    return `https://${value}`;
}

function iconFor(key: string): ReactElement {
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
        case 'github':
            return (
                <svg viewBox="0 0 24 24" className="digest-share-icon" aria-hidden="true">
                    <path
                        fill="currentColor"
                        d="M12 2a10 10 0 0 0-3.2 19.5c.5.1.7-.2.7-.5v-1.8c-2.8.6-3.4-1.2-3.4-1.2-.4-1.1-1.1-1.4-1.1-1.4-.9-.6.1-.6.1-.6 1 .1 1.6 1 1.6 1 .9 1.5 2.4 1.1 2.9.9.1-.6.4-1.1.7-1.3-2.3-.3-4.8-1.2-4.8-5.2 0-1.1.4-2 1-2.8-.1-.3-.4-1.3.1-2.7 0 0 .9-.3 2.8 1a9.5 9.5 0 0 1 5.1 0c1.9-1.3 2.8-1 2.8-1 .5 1.4.2 2.4.1 2.7.7.8 1 1.7 1 2.8 0 4-2.5 4.9-4.9 5.2.4.3.8 1 .8 2v3c0 .3.2.6.7.5A10 10 0 0 0 12 2Z"
                    />
                </svg>
            );
        case 'linktree':
        case 'linkedtree':
            return (
                <svg viewBox="0 0 24 24" className="digest-share-icon" aria-hidden="true">
                    <path
                        fill="currentColor"
                        d="M11 2h2v4l2.6-2.6 1.4 1.4L14.4 7.4H18v2h-3.6l2.6 2.6-1.4 1.4L13 10.8V15h-2v-4.2l-2.6 2.6-1.4-1.4L9.6 9.4H6v-2h3.6L7 4.8l1.4-1.4L11 6V2Zm0 13h2v7h-2v-7Z"
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
        case 'phonenumber':
            return (
                <svg viewBox="0 0 24 24" className="digest-share-icon" aria-hidden="true">
                    <path
                        fill="currentColor"
                        d="M6.6 3h3.1c.5 0 .9.3 1 .7l.8 3.6c.1.4 0 .8-.3 1L9.5 10a12.5 12.5 0 0 0 4.5 4.5l1.7-1.7c.3-.3.7-.4 1-.3l3.6.8c.4.1.7.5.7 1v3.1c0 .6-.4 1-1 1C10 22 2 14 2 4c0-.6.4-1 1-1h3.6Z"
                    />
                </svg>
            );
        default:
            return (
                <svg viewBox="0 0 24 24" className="digest-share-icon" aria-hidden="true">
                    <path
                        fill="currentColor"
                        d="M10.6 13.4a1 1 0 0 1 0-1.4l3.8-3.8a3 3 0 1 1 4.2 4.2l-2.2 2.2a3 3 0 0 1-4.2 0 1 1 0 1 1 1.4-1.4 1 1 0 0 0 1.4 0l2.2-2.2a1 1 0 0 0-1.4-1.4l-3.8 3.8a1 1 0 0 1-1.4 0Zm2.8-2.8a1 1 0 0 1 0 1.4l-3.8 3.8a3 3 0 0 1-4.2-4.2l2.2-2.2a3 3 0 0 1 4.2 0 1 1 0 1 1-1.4 1.4 1 1 0 0 0-1.4 0l-2.2 2.2a1 1 0 0 0 1.4 1.4l3.8-3.8a1 1 0 0 1 1.4 0Z"
                    />
                </svg>
            );
    }
}

export function PostSharePanel({ postUrl, socials = {} }: PostSharePanelProps) {
    const [copied, setCopied] = useState(false);

    const socialLinks = Object.entries(socials)
        .filter(([, value]) => typeof value === 'string' && value.trim().length > 0)
        .map(([key, value]) => ({
            key,
            label: key === 'x' ? 'Twitter/X' : key === 'linkedin' ? 'LinkedIn' : key,
            href: normalizeUrl(value!.trim()),
        }));

    async function copyLink() {
        try {
            await navigator.clipboard.writeText(postUrl);
            setCopied(true);
            window.setTimeout(() => setCopied(false), 1800);
        } catch {
            setCopied(false);
        }
    }

    return (
        <section className="digest-share" aria-label="Share article">
            <p className="digest-kicker">/ Share</p>
            <div className="digest-share-links">
                <Button
                    type="button"
                    variant="unstyled"
                    onClick={copyLink}
                    aria-label={copied ? 'Link copied' : 'Copy link'}
                    data-tooltip={copied ? 'Copied' : 'Copy link'}
                >
                    {iconFor('copy')}
                </Button>
                {socialLinks.map((item) => (
                    <a
                        key={item.key}
                        href={item.href}
                        target={item.href.startsWith('mailto:') || item.href.startsWith('tel:') ? undefined : '_blank'}
                        rel={item.href.startsWith('mailto:') || item.href.startsWith('tel:') ? undefined : 'noreferrer noopener'}
                        aria-label={item.label}
                        data-tooltip={item.label}
                    >
                        {iconFor(item.key)}
                    </a>
                ))}
            </div>
        </section>
    );
}
