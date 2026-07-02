#!/usr/bin/env node
// Rasterize public/icon.svg into the PNG sizes the PWA manifest + iOS need.
// $0, no new deps: Playwright's bundled Chromium (already a dependency; honors
// PLAYWRIGHT_BROWSERS_PATH) screenshots the SVG at exact pixel sizes. Deterministic:
// same SVG in, same pixels out.
//
//   node scripts/make-icons.mjs
//
// Writes: public/icon-192.png, public/icon-512.png, public/apple-touch-icon.png (180).

import { chromium } from 'playwright';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { readFile, writeFile } from 'node:fs/promises';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const SIZES = [
  { px: 192, out: 'public/icon-192.png' },
  { px: 512, out: 'public/icon-512.png' },
  { px: 180, out: 'public/apple-touch-icon.png' },
];

const svg = await readFile(join(root, 'public/icon.svg'), 'utf8');
const browser = await chromium.launch();
try {
  for (const { px, out } of SIZES) {
    const page = await browser.newPage({ viewport: { width: px, height: px }, deviceScaleFactor: 1 });
    // Inline the SVG at exact size on a transparent page; screenshot the element.
    await page.setContent(
      `<!doctype html><body style="margin:0;background:transparent">${svg.replace(
        /width="512" height="512"/,
        `width="${px}" height="${px}"`,
      )}</body>`,
    );
    const el = page.locator('svg');
    const buf = await el.screenshot({ omitBackground: true });
    await writeFile(join(root, out), buf);
    console.log(`✓ ${out} (${px}×${px}, ${buf.length} bytes)`);
    await page.close();
  }
} finally {
  await browser.close();
}
