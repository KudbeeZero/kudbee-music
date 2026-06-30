# Concepts

## The pipeline (agents)
`analyze → align → treatment → timeline → composite → render → qa`. Each stage is
a "Hermes" agent (see `.claude/agents/`) backed by a script in `studio/`.

## Sections & sub-shots
`studio/build-timeline.mjs` arranges the song into **sections** (intro, verse,
hook, bridge, outro), each beat-snapped to the audio analysis. A section can have
**sub-shots** — footage that cuts in on a specific lyric line (`line`) or time
(`at`). A **max-hold cutter** guarantees no shot holds longer than ~4.6s, so the
edit keeps moving.

## The frame-driven compositor
`studio/player.html` is a `<canvas>` whose every frame is a pure function of its
index + the audio `loudness[]`. That determinism is why renders are reproducible.
It draws hero footage **or** a procedural scene, then a split-tone grade, film
grain, vignette, and word-by-word kinetic-typography lyrics.

## Forced lyric alignment
`studio/transcribe.py` (Whisper) emits word timestamps; `studio/align.mjs`
monotonically aligns your *exact* lyrics to them. Where ASR fails (a dense choir
hook), a recovery step redistributes those lines so nothing drifts.
