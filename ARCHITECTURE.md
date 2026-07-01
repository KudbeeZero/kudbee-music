# 🏗️ HERMES architecture

A map of how HERMES is put together — for contributors who want to change it with
confidence. If you read one file before your first PR, read this one.

> **Ethos, up front.** Everything here is **$0, local, and deterministic** by default:
> no API key, no backend, no paid service, no network at generation time. The "brain"
> is an [inspired workflow model](brain/hemispheres.md), not biology — but every claim
> the UI makes is the output of real, tested code in [`lib/hermes/`](lib/hermes/), not
> hand-written copy. Real AI is opt-in, behind keys, with the mock as the default.

## The two studios, one brain

HERMES is two front-ends over one shared brain:

```
                 ┌──────────────────────────┐
                 │   brain/  (the vault)     │  hemispheres.md · beliefs · memory · personas
                 └────────────┬─────────────┘
          ┌───────────────────┴────────────────────┐
          ▼                                         ▼
  lib/hermes/  (the song brain)            studio/ + bin/hermes  (the video engine)
  Next.js Hit Factory web app              headless-Chromium CLI renderer
  app/ + components/hermes/                scene-packs/ + ffmpeg
          └───────────────────┬────────────────────┘
                              ▼
                  hermes from-song   (fuses the two: a song package → a renderable video project)
```

The **moat is the song brain** (`lib/hermes/`) — the lyrical process and the cognition
around it. The video studio is a downstream consumer, not the headline.

## How a song is generated (the pipeline)

Entry point: [`lib/hermes/pipeline.ts`](lib/hermes/pipeline.ts) → `runPipeline(inputs, opts)`.
It fires **10 agents in a fixed order**, each emitting a typed `AgentOutput`, then
assembles a `SongPackage`:

```
conductor → hooksmith → lyric-chemist → beat-oracle → emotion-scanner →
originality-auditor → ar-judge → visual-director → viral-clip-scout → rights-release-guard
```

Determinism is a hard contract: same `inputs` + same `seed` ⇒ byte-identical
`SongPackage`. There is no wall-clock and no unseeded RNG in the generation path (ids and
timestamps are injected via `opts.id`/`opts.now`; the regenerate button threads a fresh
`opts.seed`). This is what makes the demo traces reproducible and CI-safe.

The agents pull from **11 brain regions**, each a real module or vault file. See the
generated wiring diagram: [`docs/brain-wiring.md`](docs/brain-wiring.md).

## Module map (`lib/hermes/`)

**Orchestration & types**
- `pipeline.ts` — runs the 10 agents, assembles the `SongPackage`.
- `process.ts` — the Writers-Room / Council deliberation over outputs.
- `agents.ts`, `types.ts` — agent registry + the shared type vocabulary.
- `nervousSystem.ts`, `brainMap.ts` — region/pathway anatomy + live "which region is firing."

**Generation (right hemisphere — generative)**
- `providers/` — the `LyricsProvider` seam. `mockLyricsProvider.ts` is the $0 default;
  a real provider drops in behind the same interface (opt-in, behind a key).
- `text.ts`, `lexicon.ts`, `rhyme.ts` — the deterministic lyric combinator + rhyme/meter.
- `defaultMode.ts` — divergent angles (the "what if" wandering mind).
- `language.ts`, `emotion.ts` — register/diction + emotion→word-choice coloring.

**Evaluation (left hemisphere — analytical)**
- `scoring.ts`, `rescore.ts` — the banger score (craft signals, not length+RNG).
- `originality.ts`, `safety.ts` — uniqueness fingerprints + famous-phrase screen.
- `semanticOriginality.ts` — optional MEANING-level novelty (catches paraphrases the
  fingerprint check misses). Server/CLI-only (imports `vectorMemory`); opt-in + graceful.
- `reward.ts` — crave-ability (returns, mutation, brevity, singability).
- `cognition.ts` — first-thought → second-thought critique → keep/revise decision; picks
  the chosen hook (`selectHookByCognition`).
- `council.ts` — the deliberating board's hook ranking (challenges · crave · confidence).
- `eval.ts` — the golden-set eval harness (`npm run eval`), a CI regression guard.

**Memory**
- `memory.ts`, `workingMemory.ts` — short-term (this session) working set.
- `learn.ts`, `edits.ts`, `procedural.ts` — long-term: taste model + learn-from-edits.
- `vectorMemory.ts` — optional local semantic recall (opt-in, lazy-loaded embeddings,
  deterministic ranking). Pure search core is unit-tested with a fake embedder.
- `vectorRecall.ts` — learn→recall over `vectorMemory`. `rememberSong` stores one memory
  per facet (hook / lyric / theme→procedural / mood→emotion); per-agent recalls surface
  meaning-close past work: `recallSimilarCraft` (procedural), `recallSimilarEmotion`
  (limbic), `recallSimilarHook` (Council self-repetition), `recommendSimilar` (coach).
  **Server/CLI-only on purpose** — it imports Node built-ins, so it's kept out of the
  modules the client bundle touches (`learn.ts` / `recommend.ts` stay browser-safe).
- `storage.ts` — the localStorage vault (export/import) with a **backup mirror**: every
  write also lands in a `.bak` key; reads auto-heal from it if the live key is corrupt,
  and `restoreFromBackup()` offers explicit recovery.

**Identity & output**
- `artist.ts`, `story.ts`, `becomingYou.ts`, `brainSignature.ts`, `heat.ts` — who the
  artist is becoming; the Brain-Scan thermal signature; the dNFT-ready signature.
- `trace.ts`, `traceHtml.ts` — "show your work": per-region generation trace →
  committable markdown **and** a self-contained interactive HTML explorer.
- `suno.ts`, `album.ts`, `expansionPacks.ts`, `engines.ts` — Suno export, albums,
  production presets, the upgradeable engine "rack."
- `recommend.ts`, `crossroads.ts`, `personas.ts` — recommendations, community steering, personas.

## The web app (`app/` + `components/hermes/`)

Next.js 14 static export (`STATIC_EXPORT=1` → `out/`), deployed to Cloudflare Pages.
`components/hermes/HermesHitFactory.tsx` is the shell; `BrainScan.tsx` renders the live
region map + thermal particles; `SongPackageView.tsx`, `BangerScoreCard.tsx`,
`UniquenessReport.tsx`, `ArtistCard.tsx`, `Rack.tsx` render the deck. No server — the
brain runs entirely in the browser.

## The video studio (`studio/` + `bin/hermes`)

A headless-Chromium, frame-by-frame renderer muxed with ffmpeg. `bin/hermes` is the CLI
(`prep`, `analyze`, `master`, `build`, `render`, `qa`); `scene-packs/` are the visual
styles. Bring-your-own audio is the default; `hermes from-song` scaffolds a project from
a Hit Factory `SongPackage` and emits a copy-paste Suno handoff.

## CI (`.github/workflows/ci.yml`)

Three gates, all must be green to merge:
- **check** — lint + unit tests (`vitest` web suite + `node --test`).
- **web** — engine tests + the static `web:build`.
- **smoke** — a real render + `hermes-qa` eval gate.

The Cloudflare **"Workers Builds"** check is a separate, expected-red leftover and does
**not** gate merges; the Cloudflare **Pages** deploy is the live one.

## Extending it

- **New lyric engine / real AI:** implement the `LyricsProvider` interface in
  `lib/hermes/providers/` and register it — the mock stays the default so $0 is preserved.
- **New scene pack:** add `scene-packs/<name>/` (easiest first PR).
- **New production preset:** add `expansion-packs/<name>/`.
- **Change the brain anatomy:** edit `REGIONS`/`PATHWAYS` in `brainMap.ts`, then
  regenerate the diagram (`GEN_DOCS=1 npx vitest run wiring`).

## Non-negotiables (keep these true in every PR)

1. **$0 / local / deterministic** by default — no key, no network, no wall-clock in the
   generation path. Real AI is opt-in behind a key.
2. **Original-only** — no living-artist mimicry; the safety screen stays wired.
3. **Living-state spine** — a PR that changes behavior updates `TODO.md`,
   `brain/roadmap.json`, and the README in the same PR. Tests move TODO→Shipped.
4. **One PR per unit of work; merge only when all three CI gates are green.**
