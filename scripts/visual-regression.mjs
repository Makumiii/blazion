import fs from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright';
import pixelmatch from 'pixelmatch';
import { PNG } from 'pngjs';

const args = new Set(process.argv.slice(2));
const shouldUpdateBaseline = args.has('--update');

const rootDir = process.cwd();
const baselineDir = path.join(rootDir, 'outputs', 'shadcn-baseline');
const currentDir = path.join(baselineDir, 'current');
const diffDir = path.join(baselineDir, 'diff');
const manifestPath = path.join(baselineDir, 'manifest.json');

if (!fs.existsSync(manifestPath)) {
    console.error(`Missing baseline manifest: ${manifestPath}`);
    process.exit(1);
}

const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
const {
    baseUrl,
    viewport,
    routes,
    themes,
    maxDiffRatio,
} = manifest;

fs.rmSync(currentDir, { recursive: true, force: true });
fs.rmSync(diffDir, { recursive: true, force: true });
fs.mkdirSync(currentDir, { recursive: true });
fs.mkdirSync(diffDir, { recursive: true });

async function gotoWithRetry(page, url, attempts = 3) {
    let lastError = null;
    for (let index = 0; index < attempts; index += 1) {
        try {
            await page.goto(url, { waitUntil: 'networkidle' });
            return;
        } catch (error) {
            lastError = error;
            if (index < attempts - 1) {
                await page.waitForTimeout(400);
            }
        }
    }
    throw lastError;
}

const browser = await chromium.launch();
let failures = 0;

try {
    for (const theme of themes) {
        const context = await browser.newContext({
            viewport,
            colorScheme: theme,
        });
        const page = await context.newPage();

        await page.addInitScript((selectedTheme) => {
            localStorage.setItem('blog-theme', selectedTheme);
            document.documentElement.classList.toggle('dark', selectedTheme === 'dark');
        }, theme);

        for (const item of routes) {
            const filename = `${item.name}.${theme}.png`;
            const baselinePath = path.join(baselineDir, filename);
            const currentPath = path.join(currentDir, filename);
            const diffPath = path.join(diffDir, filename);

            if (!fs.existsSync(baselinePath)) {
                console.error(`Missing baseline image: ${baselinePath}`);
                failures += 1;
                continue;
            }

            try {
                await gotoWithRetry(page, `${baseUrl}${item.route}`);
                await page.waitForTimeout(1200);
                await page.screenshot({ path: currentPath });
            } catch (error) {
                console.error(`FAIL ${item.route} [${theme}] navigation error: ${error instanceof Error ? error.message : String(error)}`);
                failures += 1;
                continue;
            }

            if (shouldUpdateBaseline) {
                fs.copyFileSync(currentPath, baselinePath);
                console.log(`UPDATED ${item.route} [${theme}] -> ${baselinePath}`);
                continue;
            }

            const baselinePng = PNG.sync.read(fs.readFileSync(baselinePath));
            const currentPng = PNG.sync.read(fs.readFileSync(currentPath));

            if (
                baselinePng.width !== currentPng.width ||
                baselinePng.height !== currentPng.height
            ) {
                console.error(`Dimension mismatch for ${filename}`);
                failures += 1;
                continue;
            }

            const diffPng = new PNG({ width: baselinePng.width, height: baselinePng.height });
            const diffPixels = pixelmatch(
                baselinePng.data,
                currentPng.data,
                diffPng.data,
                baselinePng.width,
                baselinePng.height,
                { threshold: 0.1 },
            );
            const totalPixels = baselinePng.width * baselinePng.height;
            const diffRatio = totalPixels === 0 ? 0 : diffPixels / totalPixels;

            if (diffPixels > 0) {
                fs.writeFileSync(diffPath, PNG.sync.write(diffPng));
            }

            const label = `${item.route} [${theme}]`;
            if (diffRatio > maxDiffRatio) {
                console.error(
                    `FAIL ${label} diffRatio=${diffRatio.toFixed(4)} max=${maxDiffRatio.toFixed(4)}`,
                );
                failures += 1;
            } else {
                console.log(
                    `OK   ${label} diffRatio=${diffRatio.toFixed(4)} max=${maxDiffRatio.toFixed(4)}`,
                );
            }
        }

        await context.close();
    }
} finally {
    await browser.close();
}

if (failures > 0) {
    console.error(`\nVisual regression failed (${failures} route/theme checks).`);
    console.error(`Current screenshots: ${currentDir}`);
    console.error(`Diff screenshots: ${diffDir}`);
    process.exit(1);
}

if (shouldUpdateBaseline) {
    console.log('\nBaseline screenshots updated.');
    process.exit(0);
}

console.log('\nVisual regression passed.');
