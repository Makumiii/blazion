export function slugify(text: string): string {
    return text
        .toLowerCase()
        .trim()
        .replace(/[^\w\s-]/g, '')
        .replace(/[\s_-]+/g, '-')
        .replace(/^-+|-+$/g, '');
}

export function formatDate(
    value: string | Date,
    locale = 'en-US',
    options: Intl.DateTimeFormatOptions = {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
    },
): string {
    const date = value instanceof Date ? value : new Date(value);
    if (Number.isNaN(date.getTime())) {
        throw new Error('Invalid date provided to formatDate');
    }
    return new Intl.DateTimeFormat(locale, options).format(date);
}

export function normalizeTags(tags: string[]): string[] {
    const seen = new Set<string>();
    const normalized: string[] = [];
    for (const tag of tags) {
        const trimmed = tag.trim();
        if (!trimmed) {
            continue;
        }
        const key = trimmed.toLowerCase();
        if (seen.has(key)) {
            continue;
        }
        seen.add(key);
        normalized.push(trimmed);
    }
    return normalized;
}
