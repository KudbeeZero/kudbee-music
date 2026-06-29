// Hermes-Analyst: decode the track to PCM and derive a per-frame loudness
// envelope + beat grid. Dependency-light: just ffmpeg + Node.
import { spawnSync } from 'node:child_process';
import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const FFMPEG = resolve(ROOT, '.bin/ffmpeg');
const TRACK = resolve(ROOT, 'song/track.mp3');
const FPS = 30;
const SR = 22050; // analysis sample rate (mono)

// 1) Decode to raw s16le mono PCM
const dec = spawnSync(FFMPEG, [
  '-v', 'error', '-i', TRACK,
  '-ac', '1', '-ar', String(SR), '-f', 's16le', '-'
], { maxBuffer: 1 << 30 });
if (dec.status !== 0) { console.error(dec.stderr.toString()); process.exit(1); }
const buf = dec.stdout;
const n = buf.length >> 1;
const pcm = new Float32Array(n);
for (let i = 0; i < n; i++) pcm[i] = buf.readInt16LE(i * 2) / 32768;
const durationSec = n / SR;

// 2) Short-time energy envelope at a fine hop (~5.8ms), then resample to FPS
const hop = Math.round(SR / 172);            // ~128 samples
const win = hop * 2;
const frames = Math.floor(n / hop);
const env = new Float32Array(frames);
for (let f = 0; f < frames; f++) {
  let s = 0; const start = f * hop;
  for (let i = 0; i < win && start + i < n; i++) { const v = pcm[start + i]; s += v * v; }
  env[f] = Math.sqrt(s / win);
}

// 3) Spectral-flux-ish onset detection via positive energy difference
const flux = new Float32Array(frames);
for (let f = 1; f < frames; f++) flux[f] = Math.max(0, env[f] - env[f - 1]);
// adaptive threshold (local mean + k*std) for peak picking
const onsetTimes = [];
const W = 24; // ~140ms window
for (let f = 2; f < frames - 2; f++) {
  let m = 0, c = 0;
  for (let j = f - W; j <= f + W; j++) { if (j >= 0 && j < frames) { m += flux[j]; c++; } }
  m /= c;
  let sd = 0;
  for (let j = f - W; j <= f + W; j++) { if (j >= 0 && j < frames) sd += (flux[j] - m) ** 2; }
  sd = Math.sqrt(sd / c);
  const thr = m + 1.4 * sd;
  if (flux[f] > thr && flux[f] >= flux[f - 1] && flux[f] > flux[f + 1] && flux[f] > 1e-3) {
    const t = (f * hop) / SR;
    if (!onsetTimes.length || t - onsetTimes[onsetTimes.length - 1] > 0.12) onsetTimes.push(t);
  }
}

// 4) Tempo estimate via inter-onset-interval histogram (60-180 BPM)
const iois = [];
for (let i = 1; i < onsetTimes.length; i++) iois.push(onsetTimes[i] - onsetTimes[i - 1]);
let bestBpm = 0, bestScore = -1;
for (let bpm = 60; bpm <= 180; bpm += 0.5) {
  const period = 60 / bpm;
  let score = 0;
  for (const ioi of iois) {
    const ratio = ioi / period;
    const near = Math.abs(ratio - Math.round(ratio));
    if (Math.round(ratio) >= 1 && Math.round(ratio) <= 4 && near < 0.12) score += 1;
  }
  if (score > bestScore) { bestScore = score; bestBpm = bpm; }
}

// 5) Build a regular beat grid phase-locked to onsets near downbeats
const beatPeriod = 60 / bestBpm;
let phase = onsetTimes.length ? onsetTimes[0] % beatPeriod : 0;
const beats = [];
for (let t = phase; t < durationSec; t += beatPeriod) beats.push(+t.toFixed(3));

// 6) Per-video-frame loudness (0..1) for visual reactivity
const totalVideoFrames = Math.ceil(durationSec * FPS);
const perFrame = new Array(totalVideoFrames);
let envMax = 1e-6; for (let f = 0; f < frames; f++) if (env[f] > envMax) envMax = env[f];
for (let vf = 0; vf < totalVideoFrames; vf++) {
  const tf = Math.floor(((vf / FPS) * SR) / hop);
  perFrame[vf] = +Math.min(1, (env[Math.min(tf, frames - 1)] / envMax) ** 0.7).toFixed(4);
}

const out = {
  fps: FPS,
  durationSec: +durationSec.toFixed(3),
  totalFrames: totalVideoFrames,
  bpm: +bestBpm.toFixed(1),
  beatPeriod: +beatPeriod.toFixed(4),
  beats,
  onsets: onsetTimes.map(t => +t.toFixed(3)),
  loudness: perFrame,
};
writeFileSync(resolve(ROOT, 'song/analysis.json'), JSON.stringify(out));
console.log(`duration=${out.durationSec}s frames=${out.totalFrames} bpm=${out.bpm} beats=${beats.length} onsets=${onsetTimes.length}`);
