'use client';

import dynamic from 'next/dynamic';

import type { PostContentResponse } from '@/lib/api/types';

const NotionRenderer = dynamic(
    async () => (await import('react-notion-x')).NotionRenderer,
    { ssr: false },
);

interface PostContentProps {
    content: PostContentResponse;
}

function extractPlainText(block: unknown): string {
    if (!block || typeof block !== 'object') {
        return '';
    }

    const typed = block as Record<string, any>;
    const type = typed.type;
    if (typeof type !== 'string') {
        return '';
    }

    const payload = typed[type];
    if (!payload || typeof payload !== 'object') {
        return '';
    }

    if (Array.isArray(payload.rich_text)) {
        return payload.rich_text
            .map((item: any) => (typeof item?.plain_text === 'string' ? item.plain_text : ''))
            .filter(Boolean)
            .join(' ');
    }

    return '';
}

export function PostContent({ content }: PostContentProps) {
    if (content.renderMode === 'recordMap') {
        return (
            <div className="content-wrap">
                <NotionRenderer recordMap={content.recordMap as any} fullPage={false} darkMode={false} />
            </div>
        );
    }

    const blocks = content.blocks ?? [];
    return (
        <div className="content-wrap">
            {blocks.length === 0 ? <p>No content yet.</p> : null}
            {blocks.map((block, index) => {
                const text = extractPlainText(block);
                if (!text) {
                    return null;
                }

                return <p key={index}>{text}</p>;
            })}
        </div>
    );
}
