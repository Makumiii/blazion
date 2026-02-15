'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { formatAuthorDisplayName } from '../lib/author';

function initialsFromName(name) {
    if (!name) {
        return 'U';
    }
    const parts = name
        .trim()
        .split(/\s+/)
        .filter(Boolean)
        .slice(0, 2);

    if (parts.length === 0) {
        return 'U';
    }

    return parts.map((part) => part[0].toUpperCase()).join('');
}

export function AuthorAvatar({ name, avatarUrl }) {
    const [failed, setFailed] = useState(false);
    const imgRef = useRef<HTMLImageElement | null>(null);
    const displayName = useMemo(() => formatAuthorDisplayName(name), [name]);
    const initials = useMemo(() => initialsFromName(displayName), [displayName]);
    const showImage = Boolean(avatarUrl) && !failed;

    useEffect(() => {
        setFailed(false);
    }, [avatarUrl]);

    useEffect(() => {
        const img = imgRef.current;
        if (!img) {
            return;
        }

        // If the image failed before hydration, the onError event is already gone.
        // Inspect DOM image state so we still fall back to initials.
        if (img.complete && img.naturalWidth === 0) {
            setFailed(true);
        }
    }, [avatarUrl]);

    return (
        <span className="author-chip">
            <span className="author-avatar" aria-hidden="true">
                {showImage ? (
                    <img
                        ref={imgRef}
                        src={avatarUrl}
                        alt=""
                        onError={() => setFailed(true)}
                        onLoad={() => setFailed(false)}
                        className="author-avatar-image"
                    />
                ) : (
                    <span className="author-avatar-fallback">{initials}</span>
                )}
            </span>
            <span className="author-name">{displayName || 'Unknown author'}</span>
        </span>
    );
}
