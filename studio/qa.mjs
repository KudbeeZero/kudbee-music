// Hermes-QA — the left hemisphere's eval gate.
//
// Right brain proposes (the render); left brain disposes. This scores a finished
// MP4 deterministically and exits non-zero on failure, so it works as a release
// gate in CI. Thresholds come from the brain dial (studio/brain.mjs): a
// right-dominant build is judged loosely, a left-dominant one strictly.
//
//   node studio/qa.mjs [video] [--brain <name>]
//   HERMES_DATA=<proj> node studio/qa.mjs <proj>/out/x.mp4
import { readFileSync, existsSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { resolveBrain } from './brain.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const DATA = process.env.HERMES_DATA ? resolve(process.env.HERMES_DATA) : ROOT;
const PROJECT = !!process.env.HERMES_DATA;
const FFMPEG = process.env.FFMPEG || resolve(ROOT, '.bin/ffmpeg');
const FFPROBE = process.env.FFPROBE || resolve(ROOT, '.bin/ffprobe');

const argv = process.argv.slice(2);
const opt = (k, d) => { const i = argv.indexOf('--' + k); return i >= 0 ? argv[i + 1] : d; };
// --slice: a short render (e.g. a CI smoke test) — only the container + frame
// checks make sense; timeline-bounds / legibility / pacing assume a full render.
const SLICE = argv.includes('--slice');
const video = resolve(DATA, argv.find(a => !a.startsWith('--') && /\.(mp4|mov|webm|mkv)$/i.test(a))
  || (PROJECT ? 'out/video.mp4' : 'out/kudbee-music-video-1080p.mp4'));

// brain: explicit flag > config.brain > env > balanced
const cfgPath = PROJECT ? resolve(DATA, 'config.json') : resolve(ROOT, 'studio/config.json');
const config = existsSync(cfgPath) ? JSON.parse(readFileSync(cfgPath)) : null;
const brain = resolveBrain(opt('brain', process.env.HERMES_BRAIN || config?.brain));
const syncPath = resolve(DATA, 'song/sync-map.json');
const syncMap = existsSync(syncPath) ? JSON.parse(readFileSync(syncPath)) : null;

const results = [];
const add = (name, ok, detail, critical = false) => { results.push({ name, ok, detail, critical }); };

if (!existsSync(video)) { console.error(`QA: no video at ${video}`); process.exit(2); }

// ---- A. container: streams, dimensions, duration ----
const probe = JSON.parse(spawnSync(FFPROBE, ['-v', 'error', '-show_format', '-show_streams', '-of', 'json', video]).stdout.toString() || '{}');
const streams = probe.streams || [];
const v = streams.find(s => s.codec_type === 'video');
const a = streams.find(s => s.codec_type === 'audio');
const dur = parseFloat(probe.format?.duration || (v?.duration) || 0);
add('video stream', !!v && v.width > 0 && v.height > 0, v ? `${v.codec_name} ${v.width}x${v.height}` : 'missing', true);
add('audio stream', !!a, a ? `${a.codec_name} ${a.sample_rate}Hz` : 'missing', true);
add('duration', dur > 1, `${dur.toFixed(1)}s`, true);

// ---- B. not black / has motion: sample luma across the timeline ----
function lumaAt(t) {
  const r = spawnSync(FFMPEG, ['-v', 'error', '-ss', String(t), '-i', video, '-frames:v', '1',
    '-vf', 'scale=1:1,format=gray', '-f', 'rawvideo', '-'], { maxBuffer: 1 << 20 });
  const b = r.stdout; return b && b.length ? b[0] : 0;
}
if (dur > 1) {
  const N = 8, lumas = [];
  for (let i = 0; i < N; i++) lumas.push(lumaAt((i + 0.5) * dur / N));
  const maxL = Math.max(...lumas), spread = maxL - Math.min(...lumas);
  add('not all-black', maxL >= 8, `peak luma ${maxL}`, true);
  // frozen video reads as spread 0-1; real footage (even calm procedural) clears 2
  add('not frozen', spread >= 2, `luma spread ${spread} across ${N} samples`);
}

// ---- C. legibility: lyric lines held long enough to read (brain-tuned) ----
if (!SLICE && syncMap && syncMap.length) {
  const minHold = brain.qa.minHoldS;
  const tooShort = syncMap.filter(l => (l.end - l.start) < minHold);
  const frac = tooShort.length / syncMap.length;
  add('legible lyric holds', frac <= 0.10, `${tooShort.length}/${syncMap.length} lines < ${minHold}s on screen (brain=${brain.name})`);
  // ---- E. bounds: every line within the song, in order ----
  const outOfBounds = syncMap.filter(l => l.start < -0.01 || l.end > dur + 0.5 || l.end <= l.start);
  let monotonic = true; for (let i = 1; i < syncMap.length; i++) if (syncMap[i].start < syncMap[i - 1].start - 0.01) monotonic = false;
  add('lyric times in-bounds', outOfBounds.length === 0 && monotonic, outOfBounds.length ? `${outOfBounds.length} lines outside [0,${dur.toFixed(1)}s]` : (monotonic ? 'ok' : 'out of order'));
}

// ---- D. pacing: hero FOOTAGE never overstays (the "keep it moving" rule).
// Procedural scenes are continuously animated, so they're exempt — only static
// footage held too long counts as an overstay. Brain-tuned limit. ----
const footageSections = (config?.sections || []).filter(s => s.shots && s.shots.length);
if (!SLICE && footageSections.length) {
  const tol = 1.0, limit = brain.maxhold + tol;
  let longest = 0;
  config.sections.forEach((s, i) => {
    if (!(s.shots && s.shots.length)) return;        // procedural -> always moving
    const end = i + 1 < config.sections.length ? config.sections[i + 1].start : (config.durationSec || dur);
    const segs = s.shots.map(x => x.start);
    for (let k = 0; k < segs.length; k++) longest = Math.max(longest, (k + 1 < segs.length ? segs[k + 1] : end) - segs[k]);
  });
  add('pacing (no overstay)', longest <= limit, `longest footage hold ${longest.toFixed(1)}s (limit ${limit.toFixed(1)}s, brain=${brain.name})`);
}

// ---- report ----
const fails = results.filter(r => !r.ok);
const criticalFails = fails.filter(r => r.critical);
console.log(`\nHERMES-QA  ${video.replace(ROOT + '/', '')}   brain=${brain.name}`);
for (const r of results) console.log(`  ${r.ok ? '✓' : '✗'} ${r.name.padEnd(22)} ${r.detail}`);
const score = results.length ? Math.round(100 * (results.length - fails.length) / results.length) : 0;
console.log(`\n  score ${score}/100  (${results.length - fails.length}/${results.length} checks)`);
if (criticalFails.length || fails.length > 1) {
  console.log(`  FAIL — ${criticalFails.length ? 'critical check failed' : 'too many checks failed'}\n`);
  process.exit(1);
}
console.log(`  PASS${fails.length ? ' (with 1 soft warning)' : ''}\n`);
