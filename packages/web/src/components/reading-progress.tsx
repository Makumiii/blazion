'use client';

import { useEffect, useState } from 'react';

export function ReadingProgress() {
    const [progress, setProgress] = useState(0);

    useEffect(() => {
        const onScroll = () => {
            const doc = document.documentElement;
            const scrollable = doc.scrollHeight - window.innerHeight;
            if (scrollable <= 0) {
                setProgress(0);
                return;
            }
            const next = Math.min(100, Math.max(0, (window.scrollY / scrollable) * 100));
            setProgress(next);
        };

        onScroll();
        window.addEventListener('scroll', onScroll, { passive: true });
        return () => window.removeEventListener('scroll', onScroll);
    }, []);

    return (
        <div className="reading-progress">
            <div className="reading-progress-bar" style={{ width: `${progress}%` }} />
        </div>
    );
}
