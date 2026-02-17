import { describe, expect, test } from 'bun:test';

import {
    listSetupPackNames,
    resolveRegisteredPacks,
    resolveSetupPackRegistration,
    resolveUnknownPackNames,
} from '../src/packs';

describe('pack resolution', () => {
    test('reports only unknown pack names', () => {
        const unknown = resolveUnknownPackNames(['blog', 'docs', 'wiki']);
        expect(unknown).toEqual(['docs', 'wiki']);
    });

    test('returns empty when all pack names are known', () => {
        const unknown = resolveUnknownPackNames(['blog']);
        expect(unknown).toEqual([]);
    });

    test('resolves only registered enabled packs', () => {
        const packs = resolveRegisteredPacks(['blog', 'docs']);
        expect(packs.map((pack) => pack.name)).toEqual(['blog']);
    });

    test('resolves setup-capable packs', () => {
        expect(resolveSetupPackRegistration('blog')?.name).toBe('blog');
        expect(resolveSetupPackRegistration('docs')).toBeNull();
        expect(listSetupPackNames()).toEqual(['blog']);
    });
});
