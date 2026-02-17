import { redirect } from 'next/navigation';

export default function PostsPage({ searchParams }) {
    const page = typeof searchParams?.page === 'string' ? searchParams.page : undefined;
    const limit = typeof searchParams?.limit === 'string' ? searchParams.limit : undefined;

    const params = new URLSearchParams();
    if (page) params.set('page', page);
    if (limit) params.set('limit', limit);

    const suffix = params.toString();
    redirect(suffix ? `/?${suffix}` : '/');
}
