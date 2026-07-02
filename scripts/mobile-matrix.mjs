#!/usr/bin/env node
// Mobile device-matrix harness — proves the app "recognizes what phone or browser
// and it adjusts" on every PR, without owning a drawer of phones.
//
// Serves the static export (out/) with a Range-capable server, then walks a matrix of
// real device profiles (Playwright's registry: viewport + DPR + touch + UA) across the
// landing page and the studio, and fails loudly on:
//   · any console error
//   · horizontal overflow (scrollWidth > viewport — the classic mobile bug)
//   · tap targets smaller than 40px on touch devices (Apple HIG floor is 44px;
//     40 keeps borderless icon-buttons honest without false alarms)
// Screenshots land in out/mobile-matrix/ (gitignored) for eyeballing.
//
//   STATIC_EXPORT=1 npm run web:build     # build the export first
//   node scripts/mobile-matrix.mjs        # run the matrix
//   node scripts/mobile-matrix.mjs --page /hermes --device "iPhone SE"   # narrow it
//
// $0 and offline: no new deps (playwright is already a dependency), no network.

import { chromium, devices } from 'playwright';
import { createServer } from 'node:http';
import { createReadStream, existsSync, statSync } from 'node:fs';
import { mkdir } from 'node:fs/promises';
import { join, extname, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';
import { dirname } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const OUT = join(root, 'out');
const SHOTS = join(OUT, 'mobile-matrix');

// The matrix: small/large iOS, small/large Android, a tablet, and a desktop control.
const MATRIX = [
  { name: 'iPhone SE', profile: devices['iPhone SE'] },
  { name: 'iPhone 14 Pro', profile: devices['iPhone 14 Pro'] },
  { name: 'Galaxy S9+', profile: devices['Galaxy S9+'] },
  { name: 'Pixel 7', profile: devices['Pixel 7'] },
  { name: 'iPad Mini', profile: devices['iPad Mini'] },
  { name: 'Desktop 1280', profile: { viewport: { width: 1280, height: 800 } } },
];
const PAGES = ['/', '/hermes'];

const argv = process.argv.slice(2);
const argOf = (flag) => {
  const i = argv.indexOf(flag);
  return i >= 0 ? argv[i + 1] : undefined;
};
const onlyDevice = argOf('--device');
const onlyPage = argOf('--page');

const MIME = {
  '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json',
  '.png': 'image/png', '.jpg': 'image/jpeg', '.svg': 'image/svg+xml', '.gif': 'image/gif',
  '.mp4': 'video/mp4', '.webm': 'video/webm', '.woff2': 'font/woff2', '.ico': 'image/x-icon',
  '.webmanifest': 'application/manifest+json', '.txt': 'text/plain',
};

/** Tiny static file server over out/ with HTTP Range support (video seeks need it). */
function serveExport() {
  const server = createServer((req, res) => {
    try {
      const url = new URL(req.url, 'http://x');
      let p = normalize(decodeURIComponent(url.pathname)).replace(/^(\.\.[/\\])+/, '');
      let file = join(OUT, p);
      if (!file.startsWith(OUT)) { res.writeHead(403).end(); return; }
      if (existsSync(file) && statSync(file).isDirectory()) file = join(file, 'index.html');
      if (!existsSync(file) && existsSync(`${file}.html`)) file = `${file}.html`;
      if (!existsSync(file)) { res.writeHead(404).end('not found'); return; }
      const size = statSync(file).size;
      const type = MIME[extname(file)] ?? 'application/octet-stream';
      const range = /^bytes=(\d*)-(\d*)$/.exec(req.headers.range ?? '');
      if (range) {
        const start = range[1] ? parseInt(range[1], 10) : 0;
        const end = range[2] ? parseInt(range[2], 10) : size - 1;
        res.writeHead(206, {
          'content-type': type, 'accept-ranges': 'bytes',
          'content-range': `bytes ${start}-${end}/${size}`, 'content-length': end - start + 1,
        });
        createReadStream(file, { start, end }).pipe(res);
      } else {
        res.writeHead(200, { 'content-type': type, 'content-length': size, 'accept-ranges': 'bytes' });
        createReadStream(file).pipe(res);
      }
    } catch {
      res.writeHead(500).end();
    }
  });
  return new Promise((resolve) => server.listen(0, '127.0.0.1', () => resolve(server)));
}

async function auditPage(context, base, path, dev, slug) {
  const page = await context.newPage();
  const consoleErrors = [];
  page.on('console', (m) => { if (m.type() === 'error') consoleErrors.push(m.text()); });
  page.on('pageerror', (e) => consoleErrors.push(String(e)));

  await page.goto(`${base}${path}`, { waitUntil: 'load', timeout: 30_000 });
  await page.waitForTimeout(900); // let reveals settle

  const overflow = await page.evaluate(() => {
    const el = document.scrollingElement ?? document.documentElement;
    return { scrollW: el.scrollWidth, innerW: window.innerWidth };
  });

  const smallTargets = dev.profile.hasTouch
    ? await page.evaluate(() => {
        const bad = [];
        for (const el of document.querySelectorAll('button, a[href], [role="button"]')) {
          const r = el.getBoundingClientRect();
          if (r.width === 0 || r.height === 0) continue; // hidden
          if (r.height < 40 && r.width < 40) {
            bad.push(`${(el.textContent ?? '').trim().slice(0, 28) || el.tagName} ${Math.round(r.width)}×${Math.round(r.height)}`);
          }
        }
        return bad.slice(0, 12);
      })
    : [];

  await page.screenshot({ path: join(SHOTS, `${slug}.png`), fullPage: false });

  const problems = [];
  if (consoleErrors.length) problems.push(`console errors: ${consoleErrors.slice(0, 3).join(' | ')}`);
  if (overflow.scrollW > overflow.innerW + 1) {
    problems.push(`horizontal overflow: scrollWidth ${overflow.scrollW} > viewport ${overflow.innerW}`);
  }
  if (smallTargets.length) problems.push(`tap targets <40px: ${smallTargets.join(', ')}`);
  await page.close();
  return problems;
}

// ---- run ---------------------------------------------------------------------------
if (!existsSync(join(OUT, 'index.html'))) {
  console.error('✗ out/index.html missing — build first: STATIC_EXPORT=1 npm run web:build');
  process.exit(2);
}
await mkdir(SHOTS, { recursive: true });
const server = await serveExport();
const base = `http://127.0.0.1:${server.address().port}`;
const browser = await chromium.launch();

let failures = 0;
try {
  for (const dev of MATRIX) {
    if (onlyDevice && dev.name !== onlyDevice) continue;
    // Chromium can't emulate Safari, but the profile's viewport/DPR/touch/UA still
    // exercise the layout + device.ts classification exactly as iOS sees them.
    const { defaultBrowserType: _ignored, ...profile } = dev.profile;
    const context = await browser.newContext(profile);
    for (const path of PAGES) {
      if (onlyPage && path !== onlyPage) continue;
      const slug = `${dev.name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}${path === '/' ? '-landing' : path.replace(/\//g, '-')}`;
      const problems = await auditPage(context, base, path, dev, slug);
      if (problems.length) {
        failures += 1;
        console.error(`✗ ${dev.name} ${path}\n    ${problems.join('\n    ')}`);
      } else {
        console.log(`✓ ${dev.name} ${path}`);
      }
    }
    await context.close();
  }
} finally {
  await browser.close();
  server.close();
}

console.log(`\nscreenshots → out/mobile-matrix/`);
if (failures) {
  console.error(`\n✗ ${failures} device/page combination(s) failed`);
  process.exit(1);
}
console.log('✓ mobile matrix clean');
