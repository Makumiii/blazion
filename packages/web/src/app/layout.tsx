import './globals.css';
import Link from 'next/link';

import { ThemeToggle } from '../components/theme-toggle';

export const metadata = {
    title: 'Blog Engine',
    description: 'A beautiful blog powered by Notion',
};

const themeScript = `
(() => {
  try {
    const stored = localStorage.getItem('blog-theme');
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const dark = stored ? stored === 'dark' : prefersDark;
    document.documentElement.classList.toggle('dark', dark);
  } catch {}
})();
`;

export default function RootLayout({ children }) {
    return (
        <html lang="en">
            <body>
                <script dangerouslySetInnerHTML={{ __html: themeScript }} />
                <header className="site-header">
                    <div className="shell nav-wrap">
                        <Link href="/" className="brand-mark">
                            Blog Engine
                        </Link>
                        <nav className="nav-links" aria-label="Primary">
                            <Link href="/posts">Posts</Link>
                        </nav>
                        <ThemeToggle />
                    </div>
                </header>
                {children}
            </body>
        </html>
    );
}
