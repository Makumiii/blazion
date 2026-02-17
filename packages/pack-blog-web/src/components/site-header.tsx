import Link from 'next/link';

export function SiteHeader() {
    return (
        <header className="site-header">
            <div className="shell nav-wrap">
                <Link href="/" className="brand" aria-label="Blazion home">
                    Blazion Journal
                </Link>
                <nav aria-label="Primary" className="main-nav">
                    <Link href="/">Home</Link>
                    <Link href="/posts">Posts</Link>
                    <Link href="/search">Search</Link>
                    <Link href="/about">About</Link>
                </nav>
            </div>
        </header>
    );
}
