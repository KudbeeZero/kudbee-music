# Shot list — scene timeline

Generated into `studio/config.json` by `studio/build-timeline.mjs`. Times below
are **aligned to the real vocal** (Whisper word timestamps via `studio/align.mjs`).
Hero footage is video-only (audio stripped); the mashup is the only soundtrack.

| Start | End   | Scene     | Source            | Notes |
|------:|------:|-----------|-------------------|-------|
| 0.2   | 12.2  | intro     | clip02 (slowed)   | corridor pull-in, title card "DOM SHADY" |
| 12.2  | 21.1  | desk      | clip01 (writer)   | Verse 1a — writer at desk, drifting |
| 21.1  | 33.1  | neon      | procedural        | Verse 1b — receding neon arches (echoes still) |
| 33.1  | 42.4  | vortex    | procedural        | Pre-Hook — spinning amber↔magenta tunnel |
| 42.4  | 59.5  | corridor  | clip02 (loop)     | **Hook 1** — big Anton type "round and round" |
| 59.5  | 69.8  | filmnoir  | clip01 (slowed)   | Verse 2a — moving spotlight, detective mood |
| 69.8  | 80.4  | desk      | clip01 (writer)   | Verse 2b — "scribbling notes" |
| 80.4  | 96.9  | glitch    | clip02 + RGB-split| Verse 2c — "fade to black — jump cut" |
| 96.9  | 103.1 | vortex    | procedural        | Pre-Hook 2 — spin |
| 103.1 | 119.9 | corridor  | clip02 (loop)     | **Hook 2** — big type |
| 119.9 | 138.7 | bridge    | procedural        | warped hallway, whisper |
| 138.7 | 158.1 | outro     | hero still (zoom) | pull-out, tape-rewind FX, fade to black |

## Lyric sync
`song/sync-map.json` (44 lines) is now **forced-aligned to the vocal**:
1. `studio/transcribe.py` (needs `pip install faster-whisper`) → `song/whisper.json`
   (word timestamps).
2. `studio/align.mjs` monotonically aligns the known lyric lines to those words.
3. The back third (choir/808 hook, where ASR is unreliable) is recovered by
   even-distribution to the song end; a de-crowd pass enforces a minimum on-screen
   time per line.

To tighten further, nudge individual `start`/`end` values in `song/sync-map.json`
and re-run `npm run render` (no need to re-transcribe).
