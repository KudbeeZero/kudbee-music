# HERMES — build log

An autonomous build loop works through the backlog below: each iteration builds
one item, verifies it, commits, and records it here.

## Up next
- [ ] Tiny test suite + a smoke-render CI job
- [ ] Audio-novelty song-structure detection (segment from beats + energy when a
      project has no structured `lyrics.md` headers; today sections come from headers)
- [ ] `hermes-composer`: optional MusicGen wiring (opt-in, documented heavy deps)
- [ ] Per-pack scene variety for generic projects (more than the shared scene cycle)

## Done
### Iteration 3 — project-targeted build (`hermes build <dir>`)
The studio now runs against any scaffolded project, not just the flagship.
- **Data-root override:** a `HERMES_DATA` env var points `analyze` / `prep-frames`
  / `build-timeline` / `render` at a project folder (defaults to repo root, so the
  flagship build is byte-identical — verified).
- **Generic timeline:** when building a project, `build-timeline` parses the
  project's own `lyrics.md` (`[Verse]`/`# Hook` headers → sections, spread across
  the song by line count), assigns procedural scenes (skipping the flagship's
  branded intro/outro cards), and emits a compatible `config.json` + sync-map —
  no hero footage required, so any `--pack` renders out of the box.
- **CLI:** `hermes build <dir>` reads `<dir>/hermes.json` (`pack`, `aspect`),
  builds from the project's `song/` + `assets/`, writes `<dir>/out/<name>.mp4`.
- Verified end-to-end: scaffolded a project with its own 20s track + custom
  lyrics, `hermes build proj` → finished `vhs-lofi` video with the project's own
  words rendering in sync. (closes the project-targeted-build backlog item)

### Iteration 2 — two new scene packs (`vhs-lofi` + `lyric-minimal`)
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
