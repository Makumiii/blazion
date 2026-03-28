import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { expect, test } from 'bun:test';

const packageRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const repoRoot = path.resolve(packageRoot, '..', '..');

test('site header does not link to a dedicated search page', () => {
    const siteHeaderPath = path.join(repoRoot, 'packages', 'pack-blog-web', 'src', 'components', 'site-header.tsx');
    const source = fs.readFileSync(siteHeaderPath, 'utf8');

    expect(source).not.toContain('href="/search"');
});

test('core web does not expose dedicated /search app route files', () => {
    const searchDir = path.join(packageRoot, 'src', 'app', 'search');

    expect(fs.existsSync(path.join(searchDir, 'page.tsx'))).toBe(false);
    expect(fs.existsSync(path.join(searchDir, 'loading.tsx'))).toBe(false);
});

test('visual regression manifest does not include the dedicated search route', () => {
    const manifestPath = path.join(repoRoot, 'outputs', 'shadcn-baseline', 'manifest.json');
    const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));

    expect(manifest.routes.some((route) => route.route.startsWith('/search'))).toBe(false);
});
