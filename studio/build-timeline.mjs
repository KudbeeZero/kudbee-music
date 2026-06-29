// Hermes-Editor + Hermes-Lyricist: turn a high-level arrangement into
// studio/config.json (scene timeline) and song/sync-map.json (lyric timing).
// All times in seconds; beat-snapped to the analysis grid where possible.
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const analysis = JSON.parse(readFileSync(resolve(ROOT, 'song/analysis.json')));
const DUR = analysis.durationSec;
const beats = analysis.beats;
const snap = (t) => {
  let best = t, d = 1e9;
  for (const b of beats) { const e = Math.abs(b - t); if (e < d) { d = e; best = b; } }
  return d < 0.25 ? +best.toFixed(3) : +t.toFixed(3);
};

// ---- Arrangement: [start, sceneType, label, lyric lines] ----
// scene types: intro | desk | neon | corridor | vortex | filmnoir | glitch | bridge | outro
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

// hero footage mapping per scene type
const HERO = {
  intro:    { clip: 'clip02', mode: 'slow', factor: 0.5 },   // corridor pull-in, slowed
  corridor: { clip: 'clip02', mode: 'loop' },
  desk:     { clip: 'clip01', mode: 'loop' },                // writer at desk
  filmnoir: { clip: 'clip01', mode: 'slow', factor: 0.6 },
};

// Build section windows with end times
const sections = SECTIONS.map((s, i) => {
  const end = i + 1 < SECTIONS.length ? SECTIONS[i + 1].t : DUR;
  return { ...s, start: snap(s.t), end: snap(end) };
});

// Distribute lyric lines across each section's vocal window
const VOCAL_LEADIN = 0.6; // let scene establish before words
const syncMap = [];
for (const s of sections) {
  if (!s.lines.length) continue;
  const vStart = s.start + VOCAL_LEADIN;
  const vEnd = s.end - 0.3;
  const span = (vEnd - vStart) / s.lines.length;
  s.lines.forEach((text, k) => {
    const start = snap(vStart + k * span);
    const end = snap(vStart + (k + 1) * span);
    syncMap.push({ text, start, end, scene: s.scene, big: !!s.big });
  });
}

const config = {
  fps: analysis.fps,
  width: 1920,
  height: 1080,
  durationSec: DUR,
  totalFrames: analysis.totalFrames,
  hero: HERO,
  sections: sections.map(({ t, ...rest }) => rest),
};

writeFileSync(resolve(ROOT, 'studio/config.json'), JSON.stringify(config, null, 2));
writeFileSync(resolve(ROOT, 'song/sync-map.json'), JSON.stringify(syncMap, null, 2));
console.log(`sections=${sections.length} lyricLines=${syncMap.length} dur=${DUR}`);
console.log(sections.map(s => `${s.start.toFixed(1)}-${s.end.toFixed(1)} ${s.scene}`).join('\n'));
