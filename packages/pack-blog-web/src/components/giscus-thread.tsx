'use client';

import { useEffect, useMemo } from 'react';

interface GiscusThreadProps {
    title: string;
}

const GISCUS_REPO = process.env.NEXT_PUBLIC_GISCUS_REPO;
const GISCUS_REPO_ID = process.env.NEXT_PUBLIC_GISCUS_REPO_ID;
const GISCUS_CATEGORY = process.env.NEXT_PUBLIC_GISCUS_CATEGORY;
const GISCUS_CATEGORY_ID = process.env.NEXT_PUBLIC_GISCUS_CATEGORY_ID;
const GISCUS_MAPPING = process.env.NEXT_PUBLIC_GISCUS_MAPPING ?? 'pathname';

function hasGiscusConfig() {
    return Boolean(GISCUS_REPO && GISCUS_REPO_ID && GISCUS_CATEGORY && GISCUS_CATEGORY_ID);
}

function currentGiscusTheme(): 'light' | 'dark_dimmed' {
    if (typeof document === 'undefined') {
        return 'light';
    }
    return document.documentElement.classList.contains('dark') ? 'dark_dimmed' : 'light';
}

export function GiscusThread({ title }: GiscusThreadProps) {
    const ready = useMemo(hasGiscusConfig, []);

    useEffect(() => {
        if (!ready) {
            return;
        }

        const host = document.getElementById('giscus_thread');
        if (!host) {
            return;
        }

        host.replaceChildren();

        const script = document.createElement('script');
        script.src = 'https://giscus.app/client.js';
        script.async = true;
        script.crossOrigin = 'anonymous';

        script.setAttribute('data-repo', GISCUS_REPO!);
        script.setAttribute('data-repo-id', GISCUS_REPO_ID!);
        script.setAttribute('data-category', GISCUS_CATEGORY!);
        script.setAttribute('data-category-id', GISCUS_CATEGORY_ID!);
        script.setAttribute('data-mapping', GISCUS_MAPPING);
        script.setAttribute('data-strict', '0');
        script.setAttribute('data-reactions-enabled', '1');
        script.setAttribute('data-emit-metadata', '0');
        script.setAttribute('data-input-position', 'top');
        script.setAttribute('data-theme', currentGiscusTheme());
        script.setAttribute('data-lang', 'en');
        script.setAttribute('data-loading', 'lazy');

        host.appendChild(script);

        const updateTheme = () => {
            const iframe = document.querySelector<HTMLIFrameElement>('iframe.giscus-frame');
            if (!iframe?.contentWindow) {
                return;
            }
            iframe.contentWindow.postMessage(
                { giscus: { setConfig: { theme: currentGiscusTheme() } } },
                'https://giscus.app',
            );
        };

        const observer = new MutationObserver(updateTheme);
        observer.observe(document.documentElement, {
            attributes: true,
            attributeFilter: ['class'],
        });

        return () => {
            observer.disconnect();
        };
    }, [ready]);

    return (
        <section className="post-discussion" aria-label="Comments and reactions">
            <header className="post-discussion-head">
                <p className="digest-kicker">/ Discussion</p>
            </header>
            <div className="post-discussion-panel">
                {!ready ? (
                    <p className="post-discussion-note">
                        Configure Giscus env vars to enable comments and reactions for this post.
                    </p>
                ) : null}
                <div id="giscus_thread" aria-label={`Discussion thread for ${title}`} />
            </div>
        </section>
    );
}
