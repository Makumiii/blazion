'use client';

import { useQuery } from '@tanstack/react-query';

import { fetchPostsClient, type PostsQueryInput } from '../lib/client-api';

export function usePostsQuery(input: PostsQueryInput) {
    return useQuery({
        queryKey: ['posts', input],
        queryFn: () => fetchPostsClient(input),
        placeholderData: (previousData) => previousData,
    });
}
