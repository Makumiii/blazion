import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { expect, test } from 'bun:test';

const packageRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const repoRoot = path.resolve(packageRoot, '..', '..');

test('core web exposes robots and sitemap endpoints', () => {
    expect(fs.existsSync(path.join(packageRoot, 'src', 'app', 'robots.ts'))).toBe(true);
    expect(fs.existsSync(path.join(packageRoot, 'src', 'app', 'sitemap.ts'))).toBe(true);
});

test('metadata sources do not hardcode product-specific brand strings', () => {
    const layoutSource = fs.readFileSync(path.join(packageRoot, 'src', 'app', 'layout.tsx'), 'utf8');
    const aboutSource = fs.readFileSync(
        path.join(repoRoot, 'packages', 'pack-blog-web', 'src', 'routes', 'about-page.tsx'),
        'utf8',
    );
    const postSource = fs.readFileSync(
        path.join(repoRoot, 'packages', 'pack-blog-web', 'src', 'routes', 'post-detail-page.tsx'),
        'utf8',
    );

    expect(layoutSource).not.toContain('Blazion');
    expect(aboutSource).not.toContain('Blazion');
    expect(postSource).not.toContain('Blazion');
});
