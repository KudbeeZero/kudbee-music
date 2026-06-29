# Contributing to HERMES

Thanks for wanting to make HERMES better! The most valuable contribution right
now is **new scene packs** — the visual styles the studio can render in.

## Quick start
```bash
git clone https://github.com/KudbeeZero/kudbee-music
cd kudbee-music
npm install
# ffmpeg: a static build is expected at .bin/ffmpeg (or set $FFMPEG / $FFPROBE)
node bin/hermes prep      # extract hero-clip frames
node bin/hermes preview   # render a short slice to out/preview.mp4
```

## Ways to contribute
- **Add a scene pack** — a new look (palette + fonts + scene modules). See
  `scene-packs/neo-noir/pack.json` for the shape. Good first issue.
- **New procedural scenes** in `studio/player.html` (a `scene<Name>()` function).
- **Better song segmentation / lyric alignment** in `studio/build-timeline.mjs`
  and `studio/align.mjs`.
- **Docs, examples, bug fixes.**

## Guidelines
- Keep the render **deterministic**: drive motion by the frame index + `loudness`,
  never wall-clock or unseeded randomness.
- Stay within a pack's palette; no off-brand hues.
- Run `npm run lint:check` before opening a PR.
- One focused change per PR; describe what you changed and why.

By contributing you agree your work is licensed under the project's MIT License.
