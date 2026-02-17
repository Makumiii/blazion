import { describe, expect, test } from 'bun:test';

import { resolveUnknownPackNames } from '../src/packs';

describe('pack resolution', () => {
    test('reports only unknown pack names', () => {
        const unknown = resolveUnknownPackNames(['blog', 'docs', 'wiki']);
        expect(unknown).toEqual(['docs', 'wiki']);
    });

    test('returns empty when all pack names are known', () => {
        const unknown = resolveUnknownPackNames(['blog']);
        expect(unknown).toEqual([]);
    });
});

