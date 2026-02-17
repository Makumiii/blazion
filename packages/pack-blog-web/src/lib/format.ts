export function formatDate(iso: string | null): string {
    if (!iso) {
        return 'Undated';
    }

    const date = new Date(iso);
    if (Number.isNaN(date.getTime())) {
        return 'Undated';
    }

    return new Intl.DateTimeFormat('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
    }).format(date);
}

export function toTitle(value: string): string {
    return value
        .split('-')
        .filter(Boolean)
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');
}
