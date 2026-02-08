'use client';

import dynamic from 'next/dynamic';

const NotionRenderer = dynamic(
    () => import('react-notion-x').then((module) => module.NotionRenderer),
    { ssr: false },
);

export function NotionContent({ recordMap }) {
    return (
        <div className="notion-wrap">
            <NotionRenderer recordMap={recordMap} fullPage={false} darkMode={false} />
        </div>
    );
}
