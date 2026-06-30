// Hermes-Render: drive headless Chromium frame-by-frame, composite, and pipe
// JPEG frames into ffmpeg, muxing the original mashup audio.
//   node studio/render.mjs [--start 0] [--end <sec>] [--out out/x.mp4] [--crf 18] [--preset medium]
import { readFileSync, existsSync, mkdirSync } from 'node:fs';
import { spawn } from 'node:child_process';
import { chromium } from 'playwright';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { dirname, resolve } from 'node:path';
import { resolveBrain } from './brain.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
// HERMES_DATA points at a project folder (hermes build <dir>); defaults to the
// repo root, so the built-in flagship render path is unchanged.
const DATA = process.env.HERMES_DATA ? resolve(process.env.HERMES_DATA) : ROOT;
const PROJECT = !!process.env.HERMES_DATA;
const FFMPEG = resolve(ROOT, '.bin/ffmpeg');
const argv = process.argv.slice(2);
const opt = (k, d) => { const i = argv.indexOf('--' + k); return i >= 0 ? argv[i + 1] : d; };

const A = JSON.parse(readFileSync(resolve(DATA, 'song/analysis.json')));
const C = JSON.parse(readFileSync(PROJECT ? resolve(DATA, 'config.json') : resolve(ROOT, 'studio/config.json')));
const S = JSON.parse(readFileSync(resolve(DATA, 'song/sync-map.json')));
// frames manifest is optional — a fully procedural pack (no hero footage) renders without it
const FM_PATH = resolve(DATA, 'assets/frames/meta.json');
const FM = existsSync(FM_PATH) ? JSON.parse(readFileSync(FM_PATH)) : {};

const FPS = A.fps;
const startSec = parseFloat(opt('start', '0'));
const endSec = parseFloat(opt('end', String(A.durationSec)));
const OUT = resolve(DATA, opt('out', 'out/kudbee-music-video-1080p.mp4'));
const CRF = opt('crf', '18');
const PRESET = opt('preset', 'medium');
const ASPECTS = { '16:9': [1920,1080], '9:16': [1080,1920], '1:1': [1080,1080], '4:5': [1080,1350] };
const aspect = opt('aspect', null);
const PACK = opt('pack', 'neo-noir');
const BRAIN = resolveBrain(opt('brain', process.env.HERMES_BRAIN));
const WIDTH = parseInt(opt('width', aspect ? ASPECTS[aspect][0] : (C.width || 1920)));
const HEIGHT = parseInt(opt('height', aspect ? ASPECTS[aspect][1] : (C.height || 1080)));
const startF = Math.floor(startSec * FPS);
const endF = Math.min(A.totalFrames, Math.ceil(endSec * FPS));
mkdirSync(dirname(OUT), { recursive: true });

// ---- hero frame resolution ----
const fileCache = new Map(); // id -> dataUrl
function fileToDataUrl(path, mime) {
  const b = readFileSync(path);
  return `data:${mime};base64,${b.toString('base64')}`;
}
function clipFrameDataUrl(clip, localFrame) {
  const meta = FM[clip];
  const idx = ((localFrame % meta.count) + meta.count) % meta.count + 1; // 1-indexed
  const id = `${clip}:${idx}`;
  let url = fileCache.get(id);
  if (!url) {
    url = fileToDataUrl(resolve(DATA, `assets/frames/${clip}/${String(idx).padStart(4, '0')}.jpg`), 'image/jpeg');
    if (fileCache.size > 400) fileCache.delete(fileCache.keys().next().value);
    fileCache.set(id, url);
  }
  return { id, dataUrl: url };
}
function heroFor(t) {
  let sec = C.sections[0]; for (const s of C.sections) if (t >= s.start) sec = s;
  let h = sec.hero, originStart = sec.start;         // default: one clip per section
  if (sec.shots && sec.shots.length) {               // sub-shots that cut on lyric lines
    let cur = sec.shots[0]; for (const sh of sec.shots) if (t >= sh.start) cur = sh;
    h = cur; originStart = cur.start;
  }
  if (!h) return null;                               // procedural scene
  if (!FM[h.clip]) return null;                      // no extracted frames -> procedural fallback
  const factor = h.mode === 'slow' ? (h.factor || 0.5) : 1;
  const local = Math.floor((t - originStart) * 24 * factor) + (h.offset || 0);
  return clipFrameDataUrl(h.clip, local);
}

function drain(stream){ return new Promise(r => stream.write('') ? r() : stream.once('drain', r)); }

(async () => {
  const t0 = Date.now();
  console.log(`render frames ${startF}..${endF} (${((endF-startF)/FPS).toFixed(1)}s) -> ${OUT}`);

  const ff = spawn(FFMPEG, [
    '-y',
    '-f', 'image2pipe', '-framerate', String(FPS), '-i', '-',
    '-ss', String(startSec), '-i', resolve(DATA, 'song/track.mp3'),
    '-map', '0:v', '-map', '1:a',
    '-t', String((endF - startF) / FPS),
    '-c:v', 'libx264', '-preset', PRESET, '-crf', String(CRF), '-pix_fmt', 'yuv420p',
    '-c:a', 'aac', '-b:a', '192k', '-movflags', '+faststart',
    OUT
  ], { stdio: ['pipe', 'inherit', 'inherit'] });

  const browser = await chromium.launch({ args: ['--no-sandbox', '--disable-gpu', '--force-color-profile=srgb'] });
  const page = await browser.newPage({ viewport: { width: WIDTH, height: HEIGHT }, deviceScaleFactor: 1 });
  await page.goto(pathToFileURL(resolve(ROOT, 'studio/player.html')).href);
  await page.waitForFunction('window.__ready === true');
  const firstHero = heroFor(startF / FPS);
  await page.evaluate(p => window.__setup(p), { analysis: A, config: C, syncMap: S, firstHero, width: WIDTH, height: HEIGHT, pack: PACK, grade: BRAIN.grade });

  for (let f = startF; f < endF; f++) {
    const t = f / FPS;
    const hero = heroFor(t);
    await page.evaluate(async ([f, hero]) => { await window.__frame(f, hero); }, [f, hero]);
    const buf = await page.screenshot({ type: 'jpeg', quality: 92 });
    if (!ff.stdin.write(buf)) await drain(ff.stdin);
    if ((f - startF) % 60 === 0) {
      const done = f - startF + 1, tot = endF - startF, el = (Date.now() - t0) / 1000;
      process.stdout.write(`\r  frame ${done}/${tot} (${(100*done/tot).toFixed(1)}%) ${el.toFixed(0)}s elapsed   `);
    }
  }
  ff.stdin.end();
  await browser.close();
  await new Promise((res, rej) => ff.on('close', c => c === 0 ? res() : rej(new Error('ffmpeg exit ' + c))));
  console.log(`\nDONE in ${((Date.now()-t0)/1000).toFixed(0)}s -> ${OUT}`);
})().catch(e => { console.error(e); process.exit(1); });
