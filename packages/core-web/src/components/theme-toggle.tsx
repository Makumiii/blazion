'use client';

import { useEffect, useState } from 'react';
import { useTheme } from 'next-themes';
import { Button } from '@blazion/pack-blog-web/components/ui/button';

export function ThemeToggle() {
    const { resolvedTheme, setTheme } = useTheme();
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    const dark = mounted ? resolvedTheme === 'dark' : false;

    const onToggle = () => {
        setTheme(dark ? 'light' : 'dark');
    };

    return (
        <Button
            variant="unstyled"
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
        </Button>
    );
}
