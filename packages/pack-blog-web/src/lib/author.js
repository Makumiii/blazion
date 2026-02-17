export function formatAuthorDisplayName(name) {
    if (!name || typeof name !== 'string') {
        return '';
    }

    return name
        .trim()
        .split(/\s+/)
        .filter(Boolean)
        .map(formatWord)
        .join(' ');
}

function formatWord(word) {
    return word
        .split(/([-'])/)
        .map((part) => {
            if (part === '-' || part === "'") {
                return part;
            }
            if (part.length === 0) {
                return part;
            }
            return part[0].toUpperCase() + part.slice(1).toLowerCase();
        })
        .join('');
}
