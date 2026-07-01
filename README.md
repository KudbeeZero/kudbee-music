<div align="center">

# 🧠 HERMES

### An agent-driven music-creation **brain** — write the song *and* render the video, entirely from code.

Two studios, one brain. **No paid software. No GPU required. $0.**

[![CI](https://github.com/KudbeeZero/kudbee-music/actions/workflows/ci.yml/badge.svg)](https://github.com/KudbeeZero/kudbee-music/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-amber.svg)](LICENSE)
[![Node 22](https://img.shields.io/badge/node-22-339933.svg?logo=node.js&logoColor=white)](https://nodejs.org)
[![PRs welcome](https://img.shields.io/badge/PRs-welcome-7a3cff.svg)](CONTRIBUTING.md)

<img src="media/demo-intro.gif" width="49%" alt="cinematic studio intro"/> <img src="media/demo-hook.gif" width="49%" alt="kinetic-typography hook"/>

[**▶ Watch the demo video**](media/kudbee-music-video-1080p.mp4) · [The brain](#-the-brain-two-hemispheres-one-dial) · [Hit Factory](#-studio-2--hit-factory-the-song-brain) · [Video studio](#-studio-1--the-video-studio) · [Quickstart](#-quickstart) · [Docs](docs/) · [Roadmap](#-roadmap)

</div>

---

**HERMES is a roster of specialized agents that cross-check each other to make music — end to end, from code, for free.** It's two studios sharing one brain:

| | 🎬 **Video Studio** | 🎤 **Hit Factory** *(song brain)* |
|---|---|---|
| **Does** | song + clips → a vocal-synced **1080p music video** | a rough idea → a complete, original **song package** |
| **How** | headless Chromium frames → ffmpeg, forced-aligned lyrics | 10 cross-checking agents, local "Lyrical Combinator" |
| **Run** | `hermes build` (CLI) | `npm run web:dev` → `/hermes` (web app) |
| **Out** | `out/*.mp4` | concept, hooks, lyrics, production, visuals, **Suno prompts**, scores |
| **Cost** | $0 — ffmpeg + Chromium | $0 — fully local/mock, **no API key** |

The flagship demo is a finished 2:38 video for *"Stay There × Fuck Em × Poverty Porn"* by **Dom Shady / kudbee** — cinematic neo-noir, forced-aligned lyrics, 25 hero shots cut to the beat.

> **🔗 The full loop.** Write a song in the **Hit Factory** → it hands you Suno-ready prompts → render the audio in Suno → `hermes from-song song.json` scaffolds a **video project** with your lyrics already in place → drop the audio → `hermes build` → a finished **music video**. Both halves of HERMES, one pipeline.

---

## 🧠 The brain: two hemispheres, one dial

HERMES isn't just a pipeline — it's a **brain**. The agents split into a **right hemisphere** that *creates* (generative, divergent) and a **left hemisphere** that *verifies* (analytical, convergent). Lateralization is a **bias, not a switch** — both always run — so a single dial leans the whole studio one way.

> **Right proposes; left disposes.**

| Right — *generative* | Left — *analytical* |
|----------------------|---------------------|
| director · songwriter · lyricist · art · composer · **Hooksmith · Lyric Chemist · Visual Director** | analyst · editor · producer · render · qa · **A&R Judge · Originality Auditor · Beat Oracle** |

In the **video studio** the dial is `--brain right\|left\|balanced` — on the flagship song, *left → 57 short legible cuts, right → 41 that breathe*, same song, different temperament. In the **Hit Factory** the same split is "the artist writes, the analyst scores." The hemispheres never share state — they pass **artifacts** across a *corpus callosum*. Full write-up: [`brain/hemispheres.md`](brain/hemispheres.md) · machine-readable [`brain/brain.json`](brain/brain.json).

The brain also has a **memory layer** ([`brain/memory.json`](brain/memory.json)) — it remembers your preferences and a growing exclusion list, and **learns who you are** from everything you make.

---

## 🎤 Studio 2 — Hit Factory (the song brain)

Type a rough idea — *"Chicago pain song for my daughter, melodic hook, street but emotional, 808 trap, not corny"* — and **10 specialized agents** turn it into a complete, original song package. **Fully local, no API key, no copyrighted material.**

```bash
npm install
npm run web:dev          # http://localhost:3000/hermes  (or /hit-factory)
```

> **No setup? Click _"▶ See a finished example — Cold Hard Gold"_** on the empty
> deck to load a real, 99/100 package (hooks, lyrics, production, scores) the engine
> actually produced — then run it through the video studio with one command. See
> [`examples/cold-hard-gold/`](examples/cold-hard-gold/).

**The 10 agents (right proposes, left disposes):**

| Right | Left |
|-------|------|
| **HERMES Conductor** → creative brief | **Beat Oracle** → production notes |
| **Hooksmith** → 3–5 hook options | **Emotion Scanner** → emotional-arc clarity |
| **Lyric Chemist** → verses + final lyrics | **Originality Auditor** → uniqueness 0–100 |
| **Visual Director** → album cover + 16:9 video prompts | **A&R Judge** → banger score 0–100 |
| **Viral Clip Scout** → short-form moments | **Rights & Release Guard** → release checklist |

**It doesn't just generate — it learns you and recommends:**

- 🧠 **Memory** — a growing **exclusion list** + preferences that stick without re-specifying (`brain/memory.json`). Warn-only — it never blocks generation.
- 📈 **Learning** — builds an evolving **artist profile** from your vault (genres, moods, recurring themes, crutch words, dark-lean).
- 💡 **Recommendations** — the emotional contrast to take next, words to retire (one-tap → exclusion), album readiness, weak-hook craft notes, the best-fit production pack.
- 💿 **Albums** — assemble vault tracks into an album; the brain writes the concept, flags the **arc/length gaps**, proposes a running order, and exports **all Suno prompts in one copy-paste block**.
- 🎛️ **Expansion packs** — production/style presets (`drill-dark`, `soul-sample`, `trap-ballad`) each with a ready-to-paste **Suno "Style of Music"** string; the brain recommends the one that fits you and pipes it into a new track.
- 🎚️ **Banger score** — hook strength · emotional clarity · originality · replay value · visual identity · short-form potential · release readiness = **/100**.

Engine is typed (`lib/hermes/`), the UI is a cinematic command deck (`app/hermes`, `components/hermes/`), and everything runs behind **vendor-neutral adapters** so a real AI/music provider drops in later without touching the agents. Full guide: [`docs/hit-factory.md`](docs/hit-factory.md).

---

## 🎬 Studio 1 — the video studio

Turn **a song + a few reference clips** into a real, vocal-synced **1080p music video** — composited frame-by-frame in a headless browser and encoded with ffmpeg.

```bash
node bin/hermes prep        # extract hero-clip frames
node bin/hermes preview     # render a short slice -> out/preview.mp4
node bin/hermes build       # full render -> out/kudbee-music-video-1080p.mp4
```

- **Code, not a timeline editor.** The whole video is a deterministic program — reproducible, diffable, re-renderable.
- **Lyric-accurate.** Whisper word-timestamps are force-aligned to your exact lyrics, so text lands on the vocal (and recovers when ASR struggles on a hook).
- **Project-targeted.** `hermes new mysong` scaffolds a project; `hermes build mysong` renders any song from its own `hermes.json` + `song/` + `assets/`.
- **Aspect ratios.** `--aspect 16:9\|9:16\|1:1\|4:5` for YouTube / Shorts / Reels / TikTok.
- **Mastering.** `hermes master` levels the track to **−14 LUFS** (EBU R128), ffmpeg-only.

```
song + clips
   ├─ hermes-analyst   audio → BPM, beat grid, per-frame loudness   (analyze.mjs)
   ├─ hermes-lyricist  Whisper word-times → force-aligned sync-map   (transcribe.py + align.mjs)
   ├─ hermes-director  reference look → treatment (palette, mood)    (brain/treatment.md)
   ├─ hermes-editor    sections + per-line sub-shots, beat-snapped   (build-timeline.mjs)
   ├─ hermes-art       procedural scenes + hero footage + type       (player.html)
   ├─ hermes-render    headless Chromium → JPEG → ffmpeg (H.264+AAC) (render.mjs)
   └─ hermes-qa        eval gate: dims, not-black, sync, pacing      (qa.mjs)
   ▼  out/*.mp4  (1920×1080, muxed with your audio)
```

### Scene packs
A **scene pack** is a visual style. Switch with `--pack` — the *same song*, a totally different look:

| pack | the look |
|------|----------|
| `neo-noir` *(default)* | cinematic detective film — amber neon, film grain, split-tone |
| `retrowave` | 80s synthwave — chrome sun, neon perspective grid, hot pink/cyan |
| `vhs-lofi` | faded analog tape — teal/cream wash, scanlines, head-switch noise |
| `lyric-minimal` | type-forward — near-black canvas, one warm accent orb, lots of air |

<img src="media/demo-hook.gif" width="32%" alt="neo-noir"/> <img src="media/demo-retrowave.gif" width="32%" alt="retrowave"/>

**Adding a pack is the best way to contribute** — see [CONTRIBUTING](CONTRIBUTING.md) and the [build-a-pack guide](docs/scene-packs.md).

---

## 🚀 Quickstart

```bash
git clone https://github.com/KudbeeZero/kudbee-music && cd kudbee-music
npm install

# 🎤 Song brain (web app — no API key)
npm run web:dev                         # open http://localhost:3000/hermes

# 🎬 Video studio (CLI — needs a static ffmpeg at .bin/ffmpeg, or $FFMPEG/$FFPROBE)
node bin/hermes prep && node bin/hermes build
```

To use your own track in the video studio: drop `song/track.mp3`, your lyrics in `song/lyrics.md`, and reference clips as `assets/hero-clip-NN.mp4`, then `hermes build`. To build your own project: `hermes new <name>` then `hermes build <name>`.

**Want a public link to test the Hit Factory on your phone?** The app is fully static, so it hosts anywhere: **Cloudflare Pages** (`STATIC_EXPORT=1 next build` → `out/`) or **Vercel** (one-click, `vercel.json`) — full steps + custom-domain wiring in [`docs/deploy.md`](docs/deploy.md). Quick local options in [`docs/testing.md`](docs/testing.md).

**Test everything:**
```bash
npm test        # video studio — brain dial + scene-pack contract
npm run test:web   # Hit Factory engine — 36 tests
```

---

## 🗺️ Repository map

```
bin/hermes               video-studio CLI (new, prep, analyze, master, build, render, qa)
studio/                  the video engine (analyze, align, build-timeline, player.html, render, qa, brain)
scene-packs/             visual styles for the video (neo-noir, retrowave, vhs-lofi, lyric-minimal)
brain/                   the shared brain — hemispheres.md, brain.json, memory.json, treatment.md
app/  components/hermes/  the Hit Factory web app (Next.js + React)
lib/hermes/              the Hit Factory engine — agents, pipeline, learn, recommend, album, suno, memory
expansion-packs/         production/style presets for songs (drill-dark, soul-sample, trap-ballad)
docs/                    quickstart, concepts, CLI ref, scene-pack guide, hit-factory guide
.github/workflows/ci.yml  3 gates: check (lint+tests) · smoke (real render + QA) · web (engine tests + build)
```

---

## 🗓️ Roadmap

**Shipped**
- [x] Code-only, vocal-synced 1080p music videos (the flagship)
- [x] Two-hemisphere **brain** + `--brain` dominance dial + `hermes-qa` eval gate (CI-gated)
- [x] 4 **scene packs** · project-targeted builds · 9:16/1:1/4:5 · `−14 LUFS` mastering
- [x] **Hit Factory** — 10-agent song brain, banger score, local uniqueness checker
- [x] **Memory layer** — persistent preferences + growing exclusion list
- [x] **Learning brain** — artist profile + recommendations
- [x] **Albums** + one-click **Suno export** + production **expansion packs**
- [x] **Learn from edits** — rewrite a line, the brain learns your taste
- [x] **Song → video** — `hermes from-song` turns a Hit Factory song into a renderable video project (both studios fused)
- [x] **Public testing URL** — Vercel-ready (`vercel.json`) + deploy guide ([`docs/testing.md`](docs/testing.md))
- [x] **Flagship example + one-click Suno handoff** — load *Cold Hard Gold* in-app; `from-song` emits a ready-to-paste Suno link, and `build` guides you if the audio isn't placed yet

**Next** — the full, living backlog lives in [`TODO.md`](TODO.md).
- [ ] Per-track **Suno structure hints** (stems, `[Intro]`/`[Bridge]` pacing, BPM/key tags)
- [ ] A real **AI/music provider** behind the adapters (lyrics + audio)
- [ ] Auto song-structure detection · docs site on GitHub Pages

---

## 🤝 Contributing
PRs welcome — the easiest wins are a new **scene pack** (`scene-packs/<name>/`) or **expansion pack** (`expansion-packs/<name>/`). See [CONTRIBUTING](CONTRIBUTING.md) · [CODE OF CONDUCT](CODE_OF_CONDUCT.md).

## 🛠️ Built with
Node 22 · headless Chromium (Playwright) · ffmpeg (libx264/AAC) · faster-whisper *(optional)* · Next.js + React · Vitest. **No paid services.**

## 📚 Documentation
[Quickstart](docs/quickstart.md) · [Concepts](docs/concepts.md) · [CLI reference](docs/cli.md) · [Build a scene pack](docs/scene-packs.md) · [Hit Factory guide](docs/hit-factory.md) · [Examples](examples/)

## 📄 License
[MIT](LICENSE). Demo song © kudbee.
