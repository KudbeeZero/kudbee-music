# HERMES — build log

An autonomous build loop works through the backlog below: each iteration builds
one item, verifies it, commits, and records it here.

## Up next
- [ ] Project-targeted build — make `hermes build <dir>` render a scaffolded project (read its `hermes.json`)
- [ ] `vhs-lofi` scene pack
- [ ] `lyric-minimal` scene pack
- [ ] Auto song-structure detection (segment from beats + energy novelty, fewer hand-authored sections)
- [ ] `hermes-composer`: optional MusicGen wiring (opt-in, documented heavy deps)
- [ ] Tiny test suite + a smoke-render CI job

## Done
### Iteration 1 — `hermes new` project scaffold
`hermes new <name>` creates `song/`, `assets/`, `hermes.json`, `lyrics.md`, and a
project README — the first step of the `hermes.json` project model.
`studio/scaffold.mjs` · `bin/hermes`. (closes #4)
