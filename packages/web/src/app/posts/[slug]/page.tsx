import Link from 'next/link';
import { notFound } from 'next/navigation';

import { NotionContent } from '../../../components/notion-content';
import { ReadingProgress } from '../../../components/reading-progress';
import { fetchPost, fetchPostContent } from '../../../lib/api';

export const revalidate = 60;

export default async function PostDetailPage({ params }) {
    const post = await fetchPost(params.slug, { revalidate });
    if (!post) {
        notFound();
    }

    const content = await fetchPostContent(params.slug, { revalidate });

    return (
        <main className="shell article-shell">
            <ReadingProgress />
            <article className="article">
                <p className="tile-meta">
                    {post.author ?? 'Unknown'} · {post.publishedAt ?? 'Unscheduled'}
                </p>
                <h1>{post.title}</h1>
                {post.summary ? <p className="lead">{post.summary}</p> : null}

                <div className="tags">
                    {post.tags.map((tag) => (
                        <Link key={tag} href={`/tags/${encodeURIComponent(tag)}`}>
                            #{tag}
                        </Link>
                    ))}
                </div>

                {content?.renderMode === 'recordMap' ? (
                    <NotionContent recordMap={content.recordMap} />
                ) : (
                    <p>Private Notion page. Public renderer not available.</p>
                )}
            </article>
        </main>
    );
}
