import Link from 'next/link';

interface PaginationNavProps {
    page: number;
    totalPages: number;
    basePath: string;
    searchParams?: Record<string, string | undefined>;
}

function pageHref(
    basePath: string,
    page: number,
    params?: Record<string, string | undefined>,
): string {
    const query = new URLSearchParams();

    if (params) {
        for (const [key, value] of Object.entries(params)) {
            if (!value || key === 'page') {
                continue;
            }
            query.set(key, value);
        }
    }

    query.set('page', String(page));
    return `${basePath}?${query.toString()}`;
}

export function PaginationNav({
    page,
    totalPages,
    basePath,
    searchParams,
}: PaginationNavProps) {
    if (totalPages <= 1) {
        return null;
    }

    const previous = page > 1 ? page - 1 : null;
    const next = page < totalPages ? page + 1 : null;

    return (
        <nav className="pagination" aria-label="Pagination">
            {previous ? <Link href={pageHref(basePath, previous, searchParams)}>Previous</Link> : <span />}
            <p>
                Page {page} of {totalPages}
            </p>
            {next ? <Link href={pageHref(basePath, next, searchParams)}>Next</Link> : <span />}
        </nav>
    );
}
