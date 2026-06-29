# kudbee-music — "Hermes" music-video studio

An agent-driven studio that turns a song + reference assets into a finished
**1080p music video**, rendered entirely from code (headless Chromium + ffmpeg).
No paid software. Built for *Stay There × Fuck Em × Poverty Porn (Mashup)* by Dom Shady / kudbee.

> The repo is the "brain": the song, its analysis, the creative treatment, the
> shot list, and the render engine all live here, so the video is fully
> reproducible and re-renderable.

## Output
`out/kudbee-music-video-1080p.mp4` — 1920×1080, 30fps, H.264+AAC, 2:38.
(Git-ignored to keep the repo light; run the render to regenerate.)

## The "Hermes" agents (`.claude/agents/`)
Each owns one stage of the pipeline:

| Agent | Stage | Output |
|-------|-------|--------|
| **hermes-director** | concept & palette | `brain/treatment.md` |
| **hermes-analyst**  | audio analysis | `song/analysis.json` |
| **hermes-lyricist** | lyric timing | `song/sync-map.json` |
| **hermes-art**      | scene visuals | `studio/player.html` scenes |
| **hermes-editor**   | arrangement / cuts | `studio/config.json` |
| **hermes-render**   | render & mux | `out/*.mp4` |
| **hermes-qa**       | review | issue list |

## How it works
1. **Analyze** — `studio/analyze.mjs` decodes the track and derives duration, BPM,
   a beat grid, and a per-frame loudness envelope → `song/analysis.json`.
2. **Arrange** — `studio/build-timeline.mjs` lays out scenes + distributes lyric
   lines across each section (beat-snapped) → `studio/config.json`, `song/sync-map.json`.
3. **Composite** — `studio/player.html` is a frame-driven `<canvas>` that draws
   hero footage + procedural neo-noir scenes (neon arches, spinning vortex, glitch,
   warped hallway) + kinetic-typography lyrics, all in the locked amber↔magenta palette.
4. **Render** — `studio/render.mjs` drives headless Chromium frame-by-frame,
   supplies the right hero frame per scene, screenshots each frame, and pipes them
   into ffmpeg, muxing the original audio.

## Assets
- `song/track.mp3` — the mashup (user owns the copyright).
- `assets/hero-still.png` — defining frame + master palette reference.
- `assets/hero-clip-01.mp4`, `assets/hero-clip-02.mp4` — hero footage (VIDEO-ONLY;
  audio stripped — the mashup is the only soundtrack).

## Build it yourself
```bash
npm install                 # playwright
# ffmpeg: a static build is expected at .bin/ffmpeg (or set $FFMPEG / $FFPROBE)
node studio/prep-frames.mjs # extract hero clip frames -> assets/frames/
npm run build               # analyze -> timeline -> full render
# or a quick look:
npm run render:preview      # renders the 40-56s hook slice
```

## Tuning
- **Lyric sync:** edit `song/sync-map.json` (`start`/`end` per line) — current
  timing is a structural first pass to nudge against the vocal.
- **Pacing / scene order:** edit `SECTIONS` in `studio/build-timeline.mjs`, re-run it.
- **Look of a scene:** edit the scene fns in `studio/player.html`.