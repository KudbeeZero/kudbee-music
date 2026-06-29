// Hermes-Editor + Hermes-Lyricist: build studio/config.json (scene timeline) and
// song/sync-map.json (lyric timing). If song/whisper.json exists, lyric + scene
// times are aligned to the real vocal via studio/align.mjs; otherwise lines are
// distributed evenly across each section (beat-snapped) as a fallback.
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { alignLines } from './align.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const analysis = JSON.parse(readFileSync(resolve(ROOT, 'song/analysis.json')));
const DUR = analysis.durationSec;
const beats = analysis.beats;
const snap = (t, tol=0.25) => { let best=t,d=1e9; for(const b of beats){const e=Math.abs(b-t);if(e<d){d=e;best=b;}} return d<tol?+best.toFixed(3):+t.toFixed(3); };

const SECTIONS = [
  { t: 0.0,   scene: 'intro',    label: 'Intro',     lines: [] },
  { t: 8.0,   scene: 'desk',     label: 'Verse 1a',  lines: [
    "Why's it tough for anyone to see?",
    "This isn't some grand philosophy.",
    "Words tossed fast like broken debris,",
    "Knocking the calm right outta the day." ] },
  { t: 21.0,  scene: 'neon',     label: 'Verse 1b',  lines: [
    "Said something reckless—five minutes prior,",
    "Now flames rise higher like a midnight fryer.",
    "Thoughts keep spinning in a busted dryer,",
    "Wish somebody'd speak straight for once, okay?" ] },
  { t: 34.0,  scene: 'vortex',   label: 'Pre-Hook',  lines: [
    "Talking circles like a worn-out tire,",
    "Messing with timing like a novice liar.",
    "Every line thrown feels more bizarre,",
    "Guess honesty's never part of the play." ] },
  { t: 46.0,  scene: 'corridor', label: 'Hook 1',    big: true, lines: [
    "We go round and round…",
    "Drop the wrong step, end up underground…",
    "Gone from the map, never be found…",
    "Dom Shady laughs soft with a subtle rebound." ] },
  { t: 62.0,  scene: 'filmnoir', label: 'Verse 2a',  lines: [
    "They spotted a footprint—nah, not factual,",
    "Dom Shady's tactics stay supernatural.",
    "Hours of those shows where detectives track",
    "All the methods amateurs lack." ] },
  { t: 74.0,  scene: 'desk',     label: 'Verse 2b',  lines: [
    "Documentaries teaching what not to reveal,",
    "How to keep every angle harder to peel.",
    "Host says evidence always tells what's real…",
    "Cut to me scribbling notes during every ordeal." ] },
  { t: 86.0,  scene: 'glitch',   label: 'Verse 2c',  lines: [
    "Neighbors whisper like they're part of a cast,",
    "Claiming my movement's a little too fast.",
    "Narrator pops in: “That theory won't last.”",
    "Fade to black—jump cut—back to the task." ] },
  { t: 98.0,  scene: 'vortex',   label: 'Pre-Hook 2',lines: [
    "Dom Shady pacing like a scene on tape,",
    "Filling each moment with sarcastic shape.",
    "Drama in the room that nobody escapes,",
    "Nothing here follows the usual way." ] },
  { t: 110.0, scene: 'corridor', label: 'Hook 2',    big: true, lines: [
    "We go round and round…",
    "Drop the wrong step, end up underground…",
    "Gone from the map, never be found…",
    "Dom Shady hums low with a playful sound." ] },
  { t: 126.0, scene: 'bridge',   label: 'Bridge',    lines: [
    "Every thought loops back like a hallway bend,",
    "Every claim they toss twists without an end.",
    "Rumors bounce wild—none of them blend,",
    "Dom Shady just wants the script to amend." ] },
  { t: 140.0, scene: 'outro',    label: 'Outro',     lines: [
    "Camera pans out on a crooked grin,",
    "Pen hits paper like trouble's twin.",
    "Story keeps spinning from within,",
    "Roll the credits—let the chaos begin." ] },
];

// per-section hero footage (keyed by section label). null = procedural scene.
const HERO = {
  'Intro':      { clip: 'clip03', mode: 'slow', factor: 0.5 }, // corridor push-in
  'Verse 1a':   { clip: 'clip04', mode: 'loop' },              // writer at desk
  'Verse 1b':   { clip: 'clip05', mode: 'loop' },              // figure in corridor
  'Pre-Hook':   { clip: 'clip06', mode: 'loop' },              // orbit light-trails
  'Hook 1':     { clip: 'clip02', mode: 'loop' },              // corridor walk
  'Verse 2a':   { clip: 'clip07', mode: 'loop' },              // evidence board
  'Verse 2b':   { clip: 'clip08', mode: 'loop' },              // film projector
  'Verse 2c':   { clip: 'clip09', mode: 'loop' },              // doorway whispers
  'Pre-Hook 2': { clip: 'clip06', mode: 'loop' },              // orbit light-trails
  'Hook 2':     { clip: 'clip02', mode: 'loop' },              // corridor walk
  'Bridge':     { clip: 'clip10', mode: 'loop' },              // blue hallway desk
  'Outro':      { clip: 'clip11', mode: 'loop' },              // cassette tape
};

// flatten lines in order, with a back-reference to their section
const flat = [];
SECTIONS.forEach((s, si) => s.lines.forEach(text => flat.push({ text, si, big: !!s.big })));

let aligned = null;
const haveWhisper = existsSync(resolve(ROOT, 'song/whisper.json'));
if (haveWhisper) {
  const whisper = JSON.parse(readFileSync(resolve(ROOT, 'song/whisper.json')));
  aligned = alignLines(flat.map(f => f.text), whisper);
}

// --- collapse recovery: where ASR failed (a run of lines <0.6s apart in the
// back half), discard the bad tail and even-distribute it to the song end ---
if (aligned) {
  const N = aligned.length;
  const firstIdxAll = {}; flat.forEach((f, i) => { if (firstIdxAll[f.si] === undefined) firstIdxAll[f.si] = i; });
  let collapse = -1;
  for (let i = 1; i < N - 1; i++) {
    if (i < N * 0.55) continue; // only the back half
    if ((aligned[i].start - aligned[i-1].start) < 0.6 && (aligned[i+1].start - aligned[i].start) < 0.6) { collapse = i; break; }
  }
  if (collapse >= 0) {
    const si = flat[collapse].si;
    const from = firstIdxAll[si];                 // redistribute whole sections from here
    const lastEnd = from > 0 ? aligned[from-1].end : 0;
    const lines = N - from;
    const span = (DUR - lastEnd) / lines;
    for (let k = from; k < N; k++) {
      const st = lastEnd + (k - from) * span + span * 0.08;
      aligned[k].start = +st.toFixed(2);
      aligned[k].end = +(lastEnd + (k - from + 1) * span - 0.05).toFixed(2);
      aligned[k].anchored = false;
    }
    console.log(`collapse recovery: redistributed lines ${from}..${N-1} across ${lastEnd.toFixed(1)}-${DUR}s`);
  }
}

// ---- section windows ----
const MINLEN = 6.0, LEAD = 1.0;
const sections = SECTIONS.map(s => ({ scene: s.scene, label: s.label, big: !!s.big, hero: HERO[s.label] || null, lines: s.lines, start: 0, end: 0 }));
if (aligned) {
  // first aligned line index per section
  const firstIdx = {};
  flat.forEach((f, i) => { if (firstIdx[f.si] === undefined) firstIdx[f.si] = i; });
  let prev = 0.2;
  sections[0].start = 0.2;
  for (let si = 1; si < sections.length; si++) {
    const fi = firstIdx[si];
    let st = fi !== undefined ? aligned[fi].start - LEAD : prev + MINLEN;
    st = Math.max(st, prev + MINLEN);
    st = snap(st, 0.2);
    sections[si].start = +st.toFixed(3);
    prev = st;
  }
} else {
  sections.forEach((s, i) => { s.start = snap(SECTIONS[i].t); });
}
sections.forEach((s, i) => { s.end = i + 1 < sections.length ? sections[i + 1].start : DUR; });

// ---- lyric sync-map ----
const syncMap = [];
if (aligned) {
  const LYRIC_LEAD = 0.12;
  flat.forEach((f, i) => {
    const start = Math.max(0, +(aligned[i].start - LYRIC_LEAD).toFixed(2));
    const end = +Math.max(aligned[i].end, start + 0.4).toFixed(2);
    syncMap.push({ text: f.text, start, end, scene: sections[f.si].scene, big: f.big });
  });
} else {
  const VOCAL_LEADIN = 0.6;
  for (const s of sections) {
    if (!s.lines.length) continue;
    const vStart = s.start + VOCAL_LEADIN, vEnd = s.end - 0.3, span = (vEnd - vStart) / s.lines.length;
    s.lines.forEach((text, k) => syncMap.push({ text, start: snap(vStart + k*span), end: snap(vStart + (k+1)*span), scene: s.scene, big: s.big }));
  }
}

// ---- per-line sub-shots: footage that cuts in on a specific lyric line ----
const SHOTS = {
  'Verse 2a': [ {clip:'clip12'}, {clip:'clip07', line:1}, {clip:'clip14', line:2} ], // footprint, evidence, TV wall
  'Verse 2b': [ {clip:'clip08'}, {clip:'clip13', line:3} ],                          // projector, then doc pull-in on "Cut to me"
  'Verse 2c': [ {clip:'clip09'}, {clip:'clip15', line:3} ],                          // doorway, then clapperboard on "jump cut"
};
const firstFlatBySi = {}; flat.forEach((f, i) => { if (firstFlatBySi[f.si] === undefined) firstFlatBySi[f.si] = i; });
sections.forEach((sec, si) => {
  const sh = SHOTS[sec.label]; if (!sh) return;
  const base = firstFlatBySi[si];
  sec.shots = sh.map(x => {
    const ln = x.line || 0;
    const st = (base !== undefined && syncMap[base + ln]) ? Math.max(sec.start, syncMap[base + ln].start - 0.2) : sec.start;
    return { clip: x.clip, mode: x.mode || 'loop', factor: x.factor, start: +st.toFixed(2) };
  });
  console.log(`shots ${sec.label}: ` + sec.shots.map(s => `${s.clip}@${s.start}`).join(' -> '));
});

const config = {
  fps: analysis.fps, width: 1920, height: 1080, durationSec: DUR, totalFrames: analysis.totalFrames,
  sections: sections.map(({ lines, ...rest }) => rest),
};
// de-crowd: guarantee a minimum on-screen time by spreading any crammed run
// of lyric lines across the time available before the next line / section end.
const MINGAP = 0.75;
const secEnd = t => { let e = DUR; for (const s of sections) if (t >= s.start) e = s.end; return e; };
for (let i = 0; i < syncMap.length; i++) {
  let j = i;
  while (j + 1 < syncMap.length && (syncMap[j+1].start - syncMap[j].start) < MINGAP) j++;
  if (j > i) {
    const after = (j + 1 < syncMap.length) ? syncMap[j+1].start : secEnd(syncMap[i].start);
    const lo = syncMap[i].start, hi = Math.max(after, lo + (j - i + 1) * MINGAP);
    const span = (hi - lo) / (j - i + 1);
    for (let k = i; k <= j; k++) { syncMap[k].start = +(lo + (k-i)*span).toFixed(2); syncMap[k].end = +(lo + (k-i+1)*span - 0.05).toFixed(2); }
    i = j;
  }
}

writeFileSync(resolve(ROOT, 'studio/config.json'), JSON.stringify(config, null, 2));
writeFileSync(resolve(ROOT, 'song/sync-map.json'), JSON.stringify(syncMap, null, 2));
console.log(`aligned=${!!aligned} sections=${sections.length} lyricLines=${syncMap.length}`);
console.log(sections.map(s => `${s.start.toFixed(1)}-${s.end.toFixed(1)} ${s.scene}`).join('  '));
console.log('first lyric starts:', syncMap.slice(0,6).map(l=>l.start).join(', '));
