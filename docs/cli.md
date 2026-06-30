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
| `build` | prep → analyze → timeline → render |

**Render options:** `--start <s>` `--end <s>` `--out <path>` `--preset <x>`
`--crf <n>` `--aspect <16:9\|9:16\|1:1\|4:5>` `--width <n>` `--height <n>`
