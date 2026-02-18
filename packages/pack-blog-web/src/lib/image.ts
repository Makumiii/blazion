export function usesAwsSignedQueryParams(src: string): boolean {
    try {
        const url = new URL(src);
        return url.searchParams.has('X-Amz-Algorithm') && url.searchParams.has('X-Amz-Signature');
    } catch {
        return false;
    }
}
