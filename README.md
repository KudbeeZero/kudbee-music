<div align="center">

# 🎬 HERMES

### Turn a song into a finished music video — entirely from code.

Agent-driven. Headless Chromium + ffmpeg. **No paid software, no editor, $0.**

<img src="media/demo-intro.gif" width="49%" alt="cinematic studio intro"/> <img src="media/demo-hook.gif" width="49%" alt="kinetic-typography hook"/>

[**▶ Watch the full demo video**](media/kudbee-music-video-1080p.mp4) · [How it works](#how-it-works) · [Quickstart](#quickstart) · [Scene packs](#scene-packs) · [Docs](docs/) · [Roadmap](#roadmap)

</div>

---

HERMES is a small studio that turns **a song + a few reference clips** into a
real, vocal-synced **1080p music video** — composited frame-by-frame in a
headless browser and encoded with ffmpeg. A roster of "Hermes" agents handles
each stage (analyze the audio, align the lyrics, design the look, cut the
timeline, render, QA), so the whole thing runs from one command.

The flagship demo is a finished 2:38 video for *"Stay There × Fuck Em × Poverty
Porn"* by **Dom Shady / kudbee** — cinematic neo-noir, forced-aligned lyrics,
25 hero shots cut to the beat.

## Why it's different
- **Code, not a timeline editor.** The whole video is a deterministic program —
  reproducible, diffable, re-renderable. Change a line, re-run, done.
- **Agent-driven.** Each pipeline stage is an explicit agent you can read, swap, or extend.
- **Free + self-contained.** Headless Chromium (frames) + ffmpeg (encode). No SaaS, no GPU required.
- **Lyric-accurate.** Whisper word-timestamps are force-aligned to your exact lyrics, so on-screen text lands on the vocal — even when ASR struggles on a hook (it recovers).

## Quickstart
```bash
git clone https://github.com/KudbeeZero/kudbee-music && cd kudbee-music
npm install
# ffmpeg: a static build is expected at .bin/ffmpeg (or set $FFMPEG / $FFPROBE)

node bin/hermes prep        # extract hero-clip frames
node bin/hermes preview     # render a short slice -> out/preview.mp4
node bin/hermes build       # full render -> out/kudbee-music-video-1080p.mp4
```

To use your own track: drop `song/track.mp3`, your lyrics in `song/lyrics.md`,
and reference clips as `assets/hero-clip-NN.mp4`, then `hermes build`.

## How it works
```
song + clips
   │
   ├─ hermes-analyst   audio → duration, BPM, beat grid, per-frame loudness   (analyze.mjs)
   ├─ hermes-lyricist  Whisper word-times → force-aligned lyric sync-map       (transcribe.py + align.mjs)
   ├─ hermes-director  reference look → treatment (palette, mood)              (brain/treatment.md)
   ├─ hermes-editor    sections + per-line sub-shots, beat-snapped             (build-timeline.mjs)
   ├─ hermes-art       procedural scenes + hero footage + kinetic type         (player.html)
   ├─ hermes-render    headless Chromium → JPEG frames → ffmpeg (H.264+AAC)     (render.mjs)
   └─ hermes-qa        spot-check frames, sync drift, palette                  (review)
   │
   ▼  out/*.mp4  (1920×1080, muxed with your audio)
```
The compositor (`studio/player.html`) is a **frame-driven `<canvas>`**: each
frame is a pure function of its index + the audio loudness, so renders are
deterministic. It draws hero footage *or* procedural scenes (neon corridor,
spinning vortex, glitch, warped hallway), then a split-tone grade, film grain,
vignette, and word-by-word kinetic-typography lyrics.

## The Hermes agents (`.claude/agents/`)
| Agent | Stage | Output |
|-------|-------|--------|
| hermes-director | concept & palette | `brain/treatment.md` |
| hermes-analyst  | audio analysis | `song/analysis.json` |
| hermes-lyricist | lyric timing | `song/sync-map.json` |
| hermes-art      | scene visuals | `studio/player.html` |
| hermes-editor   | arrangement / cuts | `studio/config.json` |
| hermes-render   | render & mux | `out/*.mp4` |
| hermes-qa       | review | issue list |

## Scene packs
A **scene pack** is a visual style. Switch with `--pack` — the *same song*, a
totally different look:

| `neo-noir` (default) | `retrowave` |
|----------------------|-------------|
| <img src="media/demo-hook.gif" width="380"/> | <img src="media/demo-retrowave.gif" width="380"/> |
| `hermes render` | `hermes render --pack retrowave` |

Each pack = a palette + fonts + scene modules
([`scene-packs/neo-noir`](scene-packs/neo-noir/pack.json),
[`scene-packs/retrowave`](scene-packs/retrowave/pack.json)). **Adding a pack is the
best way to contribute** — see [CONTRIBUTING](CONTRIBUTING.md) and the
[build-a-pack guide](docs/scene-packs.md).

## Roadmap
- [x] Pluggable **scene packs** + a 2nd style (`retrowave`); more welcome (vhs-lofi, lyric-minimal)
- [ ] `hermes new` project scaffold + `hermes.json` project model
- [ ] Auto song-structure detection (no hand-authored sections)
- [x] **9:16 / 1:1** aspect ratios for Shorts/Reels/TikTok
- [~] Generative **music** agents — songwriter + **producer (mastering, done)**; composer (MusicGen) is opt-in/wip
- [x] Docs site + examples gallery

## Built with
Node 22 · headless Chromium (Playwright) · ffmpeg (libx264/AAC) · faster-whisper (optional) · Anton/Oswald (Google Fonts). No paid services.

## Documentation
[Quickstart](docs/quickstart.md) · [Concepts](docs/concepts.md) · [Build a scene pack](docs/scene-packs.md) · [CLI reference](docs/cli.md) · [Examples](examples/)

## License
[MIT](LICENSE). Demo song © kudbee.
