// Hermes-Producer: two-pass loudness master (EBU R128) so a track sits at the
// streaming standard (-14 LUFS, -1 dBTP). ffmpeg only — no extra deps.
//   node studio/master.mjs [--in song/track.mp3] [--out out/track-mastered.wav] [--lufs -14]
import { spawnSync } from 'node:child_process';
import { mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const FF = process.env.FFMPEG || resolve(ROOT, '.bin/ffmpeg');
const argv = process.argv.slice(2);
const opt = (k, d) => { const i = argv.indexOf('--' + k); return i >= 0 ? argv[i + 1] : d; };
const IN = resolve(ROOT, opt('in', 'song/track.mp3'));
const OUT = resolve(ROOT, opt('out', 'out/track-mastered.wav'));
const I = opt('lufs', '-14'), TP = '-1.0', LRA = '11';
mkdirSync(dirname(OUT), { recursive: true });

// pass 1 — measure
const p1 = spawnSync(FF, ['-hide_banner', '-i', IN, '-af',
  `loudnorm=I=${I}:TP=${TP}:LRA=${LRA}:print_format=json`, '-f', 'null', '-'], { encoding: 'utf8' });
const m = (p1.stderr.match(/\{[\s\S]*\}/) || [null])[0];
if (!m) { console.error('loudnorm measure failed'); process.exit(1); }
const j = JSON.parse(m);
console.log(`measured: ${j.input_i} LUFS, TP ${j.input_tp} dBTP, LRA ${j.input_lra}`);

// pass 2 — normalize with measured values
const r = spawnSync(FF, ['-y', '-hide_banner', '-i', IN, '-af',
  `loudnorm=I=${I}:TP=${TP}:LRA=${LRA}:measured_I=${j.input_i}:measured_TP=${j.input_tp}:measured_LRA=${j.input_lra}:measured_thresh=${j.input_thresh}:offset=${j.target_offset}:linear=true`,
  '-ar', '44100', OUT], { stdio: 'inherit' });
process.exit(r.status === 0 ? (console.log(`mastered → ${OUT} (target ${I} LUFS)`), 0) : 1);
