'use client';

import dynamic from 'next/dynamic';
import { useEffect, useState } from 'react';

const NotionRenderer = dynamic(
    () => import('react-notion-x').then((module) => module.NotionRenderer),
    { ssr: false },
);

export function NotionContent({ recordMap }) {
    const [darkMode, setDarkMode] = useState(false);

    useEffect(() => {
        const root = document.documentElement;
        setDarkMode(root.classList.contains('dark'));

        const observer = new MutationObserver(() => {
            setDarkMode(root.classList.contains('dark'));
        });

        observer.observe(root, {
            attributes: true,
            attributeFilter: ['class'],
        });

        return () => observer.disconnect();
    }, []);

    return (
        <div className="notion-wrap">
            <NotionRenderer recordMap={recordMap} fullPage={false} darkMode={darkMode} />
        </div>
    );
}
