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
        <button
            className={`theme-switch ${dark ? 'is-dark' : 'is-light'}`}
            onClick={onToggle}
            type="button"
            role="switch"
            aria-checked={dark}
            aria-label={dark ? 'Switch to light mode' : 'Switch to dark mode'}
            title={dark ? 'Dark mode' : 'Light mode'}
        >
            <span className="theme-switch-track" aria-hidden="true">
                <span className="theme-switch-thumb">
                    <svg viewBox="0 0 24 24" className="theme-switch-icon" fill="none" stroke="currentColor">
                        <circle cx="12" cy="12" r="3.4" fill="currentColor" stroke="none" />
                        <path
                            d="M12 2.8v2.1M12 19.1v2.1M3.8 12h2.1M18.1 12h2.1M5.9 5.9l1.5 1.5M16.6 16.6l1.5 1.5M5.9 18.1l1.5-1.5M16.6 7.4l1.5-1.5"
                            strokeWidth="1.9"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                        />
                    </svg>
                </span>
            </span>
        </button>
    );
}
