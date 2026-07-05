# HERMES — build log

An autonomous build loop works through the backlog below: each iteration builds
one item, verifies it, commits, and records it here. The backlog itself lives in
[`brain/roadmap.json`](brain/roadmap.json) (`videoStudioTrack`) — the table below
is generated from it and drift-tested, so it can never silently rot again.

## Video-studio track

<!-- STATUS:BEGIN generated: edit brain/roadmap.json, then GEN_DOCS=1 npx vitest run status -->
**📊 Status board:** ✅ 79 shipped · 🔨 3 in build · 💤 17 queued (99 tracked) — full tables in [`STATUS.md`](STATUS.md), source of truth [`brain/roadmap.json`](brain/roadmap.json).

| | Item | Where it lives | PR |
|---|------|----------------|----|
| ✅ | **hermes new — project scaffold (song/, assets/, hermes.json, lyrics.md)** | `studio/scaffold.mjs + bin/hermes` | — |
| ✅ | **Scene packs vhs-lofi + lyric-minimal (4 packs total)** | `studio/player.html` | — |
| ✅ | **Project-targeted build — hermes build <dir> via HERMES_DATA** | `studio/build-timeline.mjs + bin/hermes` | — |
| ✅ | **Two-hemisphere brain model + --brain dial + left-brain eval gate (hermes qa)** | `studio/brain.mjs + studio/qa.mjs` | — |
| 💤 | **Audio-novelty song-structure detection (segment from beats + energy when lyrics.md has no headers)** | `studio/analyze.mjs` | — |
| 💤 | **hermes-composer — optional MusicGen wiring (opt-in, documented heavy deps)** | `.claude/agents/hermes-composer.md` | — |
| 💤 | **Per-pack scene variety for generic projects (more than the shared scene cycle)** | `studio/build-timeline.mjs` | — |
| 💤 | **Right-brain variance — a --seed so the right hemisphere generates scene variants and qa picks the best** | `studio/brain.mjs + studio/qa.mjs` | — |
<!-- STATUS:END -->

## Done
### Iteration 4 — the two-hemisphere brain model + eval gate
Reframed the agent roster as a **brain** and made the model real (and shipped the
test-suite + smoke-CI item as part of it — "right proposes, left disposes").
- **Named the brain:** `brain/brain.json` (machine-readable) + `brain/hemispheres.md`
  (the write-up); each `.claude/agents/hermes-*.md` tagged right/left.
- **Dominance dial:** `studio/brain.mjs` presets real knobs (`maxhold`/`jump`/
  `mingap`/`lead`/`lyricLead` in build-timeline, split-tone `grade` in player.html,
  QA thresholds). `--brain <balanced|right|left>` + `hermes.json "brain"` +
  `HERMES_BRAIN`, plumbed through `bin/hermes`. balanced is byte-identical
  (verified: only a `brain` field added to config.json). Measurable on the
  flagship: left → 57 short cuts, right → 41 longer cuts.
- **Left-brain eval gate:** `studio/qa.mjs` (`hermes qa`) — ffprobe + frame-luma
  sampling + legibility/bounds/pacing checks → score → non-zero exit on fail.
  `--slice` mode for short renders. Verified: PASS on a good render, FAIL on a
  black/silent clip.
- **Tests + CI:** `test/brain.test.mjs` + `test/packs.test.mjs` (13 tests, assert
  the dial's monotonic logic and that every scene pack is wired into the
  compositor). CI now runs `lint:check` + `npm test` + `npm run timeline`, plus a
  `smoke` job: a real 2s Chromium→ffmpeg render gated by `hermes qa --slice`.

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
