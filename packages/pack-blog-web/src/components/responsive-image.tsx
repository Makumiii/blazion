import { ProgressiveImage } from './progressive-image';

interface ResponsiveImageProps {
    src: string | null;
    alt: string;
    ratio?: 'feed' | 'hero' | 'square' | 'portrait' | 'inline';
    priority?: boolean;
}

const ratioClass: Record<NonNullable<ResponsiveImageProps['ratio']>, string> = {
    feed: 'ratio-3-2',
    hero: 'ratio-16-9',
    square: 'ratio-1-1',
    portrait: 'ratio-9-16',
    inline: 'ratio-4-3',
};

export function ResponsiveImage({
    src,
    alt,
    ratio = 'feed',
    priority = false,
}: ResponsiveImageProps) {
    const ratioName = ratioClass[ratio];

    if (!src) {
        return (
            <div className={`media-wrap ${ratioName}`}>
                <div className="image-fallback" aria-hidden="true">
                    <span>Blazion</span>
                </div>
            </div>
        );
    }

    return (
        <div className={`media-wrap ${ratioName}`}>
            <ProgressiveImage
                src={src}
                alt={alt}
                fill
                sizes="(max-width: 768px) 100vw, (max-width: 1024px) 66vw, 50vw"
                className="media-image"
                priority={priority}
            />
        </div>
    );
}
