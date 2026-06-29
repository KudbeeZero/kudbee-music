// Hermes-Render: drive headless Chromium frame-by-frame, composite, and pipe
// JPEG frames into ffmpeg, muxing the original mashup audio.
//   node studio/render.mjs [--start 0] [--end <sec>] [--out out/x.mp4] [--crf 18] [--preset medium]
import { readFileSync, existsSync, mkdirSync } from 'node:fs';
import { spawn } from 'node:child_process';
import { chromium } from 'playwright';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { dirname, resolve } from 'node:path';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const FFMPEG = resolve(ROOT, '.bin/ffmpeg');
const argv = process.argv.slice(2);
const opt = (k, d) => { const i = argv.indexOf('--' + k); return i >= 0 ? argv[i + 1] : d; };

const A = JSON.parse(readFileSync(resolve(ROOT, 'song/analysis.json')));
const C = JSON.parse(readFileSync(resolve(ROOT, 'studio/config.json')));
const S = JSON.parse(readFileSync(resolve(ROOT, 'song/sync-map.json')));
const FM = JSON.parse(readFileSync(resolve(ROOT, 'assets/frames/meta.json')));

const FPS = A.fps;
const startSec = parseFloat(opt('start', '0'));
const endSec = parseFloat(opt('end', String(A.durationSec)));
const OUT = resolve(ROOT, opt('out', 'out/kudbee-music-video-1080p.mp4'));
const CRF = opt('crf', '18');
const PRESET = opt('preset', 'medium');
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
    url = fileToDataUrl(resolve(ROOT, `assets/frames/${clip}/${String(idx).padStart(4, '0')}.jpg`), 'image/jpeg');
    if (fileCache.size > 400) fileCache.delete(fileCache.keys().next().value);
    fileCache.set(id, url);
  }
  return { id, dataUrl: url };
}
let stillUrl = null;
function heroFor(t) {
  let sec = C.sections[0]; for (const s of C.sections) if (t >= s.start) sec = s;
  const lt = t - sec.start;
  switch (sec.scene) {
    case 'intro':    return clipFrameDataUrl('clip02', Math.floor(lt * 24 * 0.5));
    case 'corridor': return clipFrameDataUrl('clip02', Math.floor(lt * 24));
    case 'desk':     return clipFrameDataUrl('clip01', Math.floor(lt * 24));
    case 'filmnoir': return clipFrameDataUrl('clip01', Math.floor(lt * 24 * 0.6));
    case 'glitch':   return clipFrameDataUrl('clip02', Math.floor(lt * 24) + 120);
    case 'outro':
      if (!stillUrl) stillUrl = fileToDataUrl(resolve(ROOT, 'assets/hero-still.png'), 'image/png');
      return { id: 'still', dataUrl: stillUrl };
    default: return null; // procedural
  }
}

function drain(stream){ return new Promise(r => stream.write('') ? r() : stream.once('drain', r)); }

(async () => {
  const t0 = Date.now();
  console.log(`render frames ${startF}..${endF} (${((endF-startF)/FPS).toFixed(1)}s) -> ${OUT}`);

  const ff = spawn(FFMPEG, [
    '-y',
    '-f', 'image2pipe', '-framerate', String(FPS), '-i', '-',
    '-ss', String(startSec), '-i', resolve(ROOT, 'song/track.mp3'),
    '-map', '0:v', '-map', '1:a',
    '-t', String((endF - startF) / FPS),
    '-c:v', 'libx264', '-preset', PRESET, '-crf', String(CRF), '-pix_fmt', 'yuv420p',
    '-c:a', 'aac', '-b:a', '192k', '-movflags', '+faststart',
    OUT
  ], { stdio: ['pipe', 'inherit', 'inherit'] });

  const browser = await chromium.launch({ args: ['--no-sandbox', '--disable-gpu', '--force-color-profile=srgb'] });
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1 });
  await page.goto(pathToFileURL(resolve(ROOT, 'studio/player.html')).href);
  await page.waitForFunction('window.__ready === true');
  const firstHero = heroFor(startF / FPS);
  await page.evaluate(p => window.__setup(p), { analysis: A, config: C, syncMap: S, firstHero });

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
