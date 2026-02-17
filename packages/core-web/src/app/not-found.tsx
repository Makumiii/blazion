import Link from 'next/link';

export default function NotFound() {
    return (
        <section className="state-block">
            <h2>404</h2>
            <p>The page you requested does not exist.</p>
            <Link href="/">Go home</Link>
        </section>
    );
}
