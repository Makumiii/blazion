// Placeholder utilities - will be implemented in Phase 2
export function slugify(text: string): string {
    return text
        .toLowerCase()
        .trim()
        .replace(/[^\w\s-]/g, '')
        .replace(/[\s_-]+/g, '-')
        .replace(/^-+|-+$/g, '');
}

export function formatDate(date: Date): string {
    return date.toISOString().split('T')[0];
}
