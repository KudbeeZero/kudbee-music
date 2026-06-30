# CLI reference

```
hermes <command> [options]
```

| Command | What it does |
|---------|--------------|
| `new <name>` | Scaffold a new project folder + `hermes.json` |
| `prep` | Extract hero-clip frames → `assets/frames/` |
| `analyze` | Audio → duration, BPM, beat grid, per-frame loudness |
| `transcribe` | Whisper word-timestamps (optional; needs faster-whisper) |
| `timeline` | Build the scene timeline + lyric sync-map |
| `render [opts]` | Render the video |
| `preview` | Render a short slice for a quick look |
| `master` | Loudness-master the track to −14 LUFS (EBU R128) |
| `build` | prep → analyze → timeline → render (the flagship in this repo) |
| `build <dir>` | Build a scaffolded **project**: reads `<dir>/hermes.json` for `pack`/`aspect`/`brain`, uses the project's own `song/` + `assets/`, writes `<dir>/out/<name>.mp4` |
| `qa <video>` | The left-brain **eval gate** — ffprobe + frame-sample a render, score it, exit non-zero on fail (`--slice` for short renders) |

**Render options:** `--start <s>` `--end <s>` `--out <path>` `--preset <x>`
`--crf <n>` `--pack <neo-noir\|retrowave\|vhs-lofi\|lyric-minimal>`
`--brain <balanced\|right\|left>` `--aspect <16:9\|9:16\|1:1\|4:5>`
`--width <n>` `--height <n>`

## The brain dial (`--brain`)
HERMES is a two-hemisphere brain (see [`brain/hemispheres.md`](../brain/hemispheres.md)).
`--brain` biases the whole studio: `right` = bolder/looser (longer cuts, richer
grade), `left` = precise (short legible cuts, tight sync, stricter QA), `balanced`
= the default. Settable per-project via `hermes.json` `"brain"` or the
`HERMES_BRAIN` env var. The flagship/`balanced` output is unchanged.

## Build your own project
```bash
hermes new mytrack          # scaffold mytrack/ (song/, assets/, hermes.json, lyrics.md)
# add mytrack/song/track.mp3, write mytrack/song/lyrics.md,
# set "pack"/"aspect" in mytrack/hermes.json
hermes build mytrack        # -> mytrack/out/mytrack.mp4
```
A project with no hero clips renders fully procedurally, so every scene pack
works out of the box. Sections come from the headers in your `lyrics.md`
(`[Verse 1]`, `[Hook]`, …) and are spread across the song by line count;
add `whisper.json` (via `hermes transcribe`) to lock lyrics to the real vocal.
