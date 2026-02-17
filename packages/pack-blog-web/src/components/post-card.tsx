import Link from 'next/link';

import type { BlogPost } from '@blazion/shared';

import { formatDate } from '../lib/format';
import { ResponsiveImage } from './responsive-image';

interface PostCardProps {
    post: BlogPost;
}

export function PostCard({ post }: PostCardProps) {
    return (
        <article className="post-card">
            <Link href={`/posts/${post.slug}`} className="post-card-link" aria-label={post.title}>
                <ResponsiveImage src={post.bannerImageUrl} alt={post.title} ratio="feed" />
                <div className="post-card-body">
                    <div className="chip-row">
                        {post.segment ? <span className="chip">{post.segment}</span> : null}
                        {post.featured ? <span className="chip chip-featured">Featured</span> : null}
                    </div>
                    <h3>{post.title}</h3>
                    <p>{post.summary ?? 'No summary available yet.'}</p>
                    <div className="meta-row">
                        <span>{post.author ?? 'Editorial Desk'}</span>
                        <span>{formatDate(post.publishedAt ?? post.createdAt)}</span>
                        <span>{post.readTimeMinutes ? `${post.readTimeMinutes} min read` : 'Quick read'}</span>
                    </div>
                </div>
            </Link>
        </article>
    );
}
