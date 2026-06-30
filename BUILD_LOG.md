# HERMES — build log

An autonomous build loop works through the backlog below: each iteration builds
one item, verifies it, commits, and records it here.

## Up next
- [ ] Project-targeted build — make `hermes build <dir>` render a scaffolded project (read its `hermes.json`)
- [ ] Auto song-structure detection (segment from beats + energy novelty, fewer hand-authored sections)
- [ ] `hermes-composer`: optional MusicGen wiring (opt-in, documented heavy deps)
- [ ] Tiny test suite + a smoke-render CI job

## Done
### Iteration 2 — two new scene packs (`vhs-lofi` + `lyric-minimal`)
Two fully-procedural styles, gated on `PACK` exactly like `retrowave`, each a
`scene<Name>` + `grade<Name>` in `studio/player.html` plus a `pack.json`.
- **`vhs-lofi`** — faded analog tape: warm teal/cream wash, drifting phosphor
  blooms + dust, scanlines, a sliding head-switching noise band, chroma edge
  bleed and tracking-tear flicker. (`--pack vhs-lofi`, closes #2)
- **`lyric-minimal`** — type-forward: near-black canvas, one soft warm accent orb
  drifting behind the words, a sparse dot grid + baseline rule. (`--pack lyric-minimal`, closes #3)
Both verified with a rendered slice + spot-checked frame. README gallery (now 4
packs), `docs/scene-packs.md`, and the roadmap updated.

### Iteration 1 — `hermes new` project scaffold
`hermes new <name>` creates `song/`, `assets/`, `hermes.json`, `lyrics.md`, and a
project README — the first step of the `hermes.json` project model.
`studio/scaffold.mjs` · `bin/hermes`. (closes #4)
