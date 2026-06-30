# Changelog

## v0.1.0
First public release of **HERMES** — turn a song into a finished music video from code.

- Frame-driven `<canvas>` compositor: hero footage + procedural neo-noir scenes
  (neon corridor, vortex, glitch, warped hallway) + word-by-word kinetic typography
- Forced lyric alignment (Whisper word-timestamps → exact lyrics), with recovery
  where ASR fails on dense hooks
- Per-line sub-shots + a max-hold cutter (no shot holds longer than ~4.6s)
- `hermes` CLI: prep / analyze / transcribe / timeline / render / preview / build
- Aspect ratios: 16:9, 9:16, 1:1, 4:5
- `neo-noir` scene pack (manifest + the template for new packs)
- Docs site, examples gallery, CI, MIT license, contribution scaffolding
- Flagship example: Dom Shady — "Stay There × Fuck Em × Poverty Porn" (2:38, 25 shots)
