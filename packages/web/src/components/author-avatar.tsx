'use client';

import { useMemo, useState } from 'react';

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
    const initials = useMemo(() => initialsFromName(name), [name]);
    const showImage = Boolean(avatarUrl) && !failed;

    return (
        <span className="author-chip">
            <span className="author-avatar" aria-hidden="true">
                {showImage ? (
                    <img src={avatarUrl} alt="" onError={() => setFailed(true)} className="author-avatar-image" />
                ) : (
                    <span className="author-avatar-fallback">{initials}</span>
                )}
            </span>
            <span className="author-name">{name || 'Unknown author'}</span>
        </span>
    );
}
