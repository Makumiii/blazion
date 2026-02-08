'use client';

import { useEffect, useState } from 'react';

export function ThemeToggle() {
    const [dark, setDark] = useState(false);

    useEffect(() => {
        const hasDark = document.documentElement.classList.contains('dark');
        setDark(hasDark);
    }, []);

    const onToggle = () => {
        const nextDark = !dark;
        setDark(nextDark);
        document.documentElement.classList.toggle('dark', nextDark);
        localStorage.setItem('blog-theme', nextDark ? 'dark' : 'light');
    };

    return (
        <button className="theme-toggle" onClick={onToggle} type="button" aria-label="Toggle theme">
            {dark ? 'Light' : 'Dark'}
        </button>
    );
}
