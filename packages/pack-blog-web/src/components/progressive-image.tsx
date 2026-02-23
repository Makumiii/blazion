'use client';

import Image, { type ImageProps } from 'next/image';
import { useState } from 'react';

import { usesAwsSignedQueryParams } from '../lib/image';
import { DEFAULT_BLUR_DATA_URL } from '../lib/image-placeholder';

interface ProgressiveImageProps extends Omit<ImageProps, 'src'> {
    src: string;
}

export function ProgressiveImage({
    src,
    className,
    placeholder,
    blurDataURL,
    loading,
    fetchPriority,
    onLoad,
    priority,
    ...props
}: ProgressiveImageProps) {
    const [isLoaded, setIsLoaded] = useState(false);
    const imageClassName = ['progressive-image', isLoaded ? 'is-loaded' : '', className ?? '']
        .filter(Boolean)
        .join(' ');

    return (
        <Image
            {...props}
            src={src}
            className={imageClassName}
            placeholder={placeholder ?? 'blur'}
            blurDataURL={blurDataURL ?? DEFAULT_BLUR_DATA_URL}
            unoptimized={usesAwsSignedQueryParams(src)}
            loading={loading ?? (priority ? 'eager' : 'lazy')}
            fetchPriority={fetchPriority ?? (priority ? 'high' : 'auto')}
            decoding="async"
            priority={priority}
            onLoad={(event) => {
                setIsLoaded(true);
                onLoad?.(event);
            }}
        />
    );
}
