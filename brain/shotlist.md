# Shot list — scene timeline

Generated into `studio/config.json` by `studio/build-timeline.mjs`. Times in
seconds, beat-snapped to `song/analysis.json`. Hero footage is video-only
(audio stripped); the mashup is the only soundtrack.

| Start | End  | Scene     | Source            | Notes |
|------:|-----:|-----------|-------------------|-------|
| 0.2   | 8.1  | intro     | clip02 (slowed)   | corridor pull-in, title card "DOM SHADY" |
| 8.1   | 21.1 | desk      | clip01 (writer)   | Verse 1a — writer at desk, drifting |
| 21.1  | 34.2 | neon      | procedural        | Verse 1b — receding neon arches (echoes still) |
| 34.2  | 46.2 | vortex    | procedural        | Pre-Hook — spinning amber↔magenta tunnel |
| 46.2  | 61.9 | corridor  | clip02 (loop)     | **Hook 1** — big Anton type "round and round" |
| 61.9  | 73.9 | filmnoir  | clip01 (slowed)   | Verse 2a — moving spotlight, detective mood |
| 73.9  | 85.9 | desk      | clip01 (writer)   | Verse 2b — "scribbling notes" |
| 85.9  | 97.9 | glitch    | clip02 + RGB-split| Verse 2c — "fade to black — jump cut" |
| 97.9  |109.9 | vortex    | procedural        | Pre-Hook 2 — spin |
|109.9  |126.0 | corridor  | clip02 (loop)     | **Hook 2** — big type |
|126.0  |140.1 | bridge    | procedural        | warped hallway, whisper |
|140.1  |157.9 | outro     | hero still (zoom) | pull-out, tape-rewind FX, fade to black |

Lyric timing lives in `song/sync-map.json` (44 lines distributed across each
section's vocal window, beat-snapped). It is a structural first pass — nudge
individual `start`/`end` values there to tighten sync to the vocal, then
re-run `npm run render`.
