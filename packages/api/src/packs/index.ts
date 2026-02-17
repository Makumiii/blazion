export interface PackDescriptor {
    name: string;
    description: string;
    routePrefix: string;
    legacyAliasPrefix?: string;
}

export const availablePacks: PackDescriptor[] = [
    {
        name: 'blog',
        description: 'Blog schema, sync rules, and content endpoints.',
        routePrefix: '/api/blog',
        legacyAliasPrefix: '/api',
    },
];

export function resolveUnknownPackNames(enabledPackNames: string[]): string[] {
    const known = new Set(availablePacks.map((pack) => pack.name));
    return enabledPackNames.filter((name) => !known.has(name));
}

