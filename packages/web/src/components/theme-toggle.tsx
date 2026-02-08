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
                    {dark ? (
                        <svg viewBox="0 0 24 24" className="theme-switch-icon" fill="none" stroke="currentColor">
                            <path
                                d="M21 12.79A9 9 0 1 1 11.21 3a7 7 0 1 0 9.79 9.79Z"
                                strokeWidth="1.8"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                            />
                        </svg>
                    ) : (
                        <svg viewBox="0 0 24 24" className="theme-switch-icon" fill="none" stroke="currentColor">
                            <circle cx="12" cy="12" r="4" strokeWidth="1.8" />
                            <path
                                d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41"
                                strokeWidth="1.8"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                            />
                        </svg>
                    )}
                </span>
            </span>
        </button>
    );
}
