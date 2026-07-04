# 🧠 brain/ — the vault index

This folder **is** HERMES's memory — plain JSON/Markdown files, version-controlled in
git, read directly by the code named next to each entry. It's the "brain IS the file
system" idea made literal (see `IDEAS.md` → flagship vision #7): every file below is
one knowledge region, and several render as literal regions in the Brain Scan UI
(`lib/hermes/brainMap.ts`).

**This file is the head page — read it first.** Each entry is one paragraph: what the
file is, who reads it, and its status. The file itself carries a top-level `"note"`
field (JSON) or opening section (Markdown) saying the same thing on its own, so either
entry point — starting here or opening the file directly — orients you immediately.

## Song-brain memory (the live engine)

| File | What it is | Read by | Status |
|---|---|---|---|
| [`beliefs.json`](beliefs.json) | The values cortex — the brain's constitution (green-loop, craft-over-generation, assistant-not-autopilot, …). | `lib/hermes/beliefs.ts` | Live |
| [`memory.json`](memory.json) | Long-term semantic taste — preferences + a growing exclusion list (clichés, avoid-words). | `lib/hermes/memory.ts` | Live |
| [`personas.json`](personas.json) | Craft-DNA archetypes — anonymized songwriter "voices" the artist can lean into. | `lib/hermes/personas.ts` (doc: `docs/personas.md`, generated) | Live |
| [`crossroads.json`](crossroads.json) | The Crossroads Board seed — community/creative decision forks (options, rationale, votes). | `lib/hermes/crossroads.ts`, `lib/hermes/crossroadsBoard.ts`, rendered at `/crossroads` | Live |
| [`patternPacks.json`](patternPacks.json) | Named structure + rhyme-scheme presets (AABA Classic, Ballad/XAXA, …). | `lib/hermes/patternPacks.ts` | Live |
| [`occasionPacks.json`](occasionPacks.json) | Holiday/life-moment lexicon + dedication packs (Christmas, Birthday, …) — the Song Gifts engine. | `lib/hermes/occasionPacks.ts` | Live |
| [`lexicon/core.json`](lexicon/core.json) | The vocabulary cortex — rhyme-family word bank (word, part of speech, affect, imagery cluster). | `lib/hermes/lexicon.ts` | Live |
| [`roadmap.json`](roadmap.json) | The living-state spine — every roadmap item + the PR/status that shipped it. Source of truth for the generated status board. | `lib/hermes/statusBoard.ts` → `STATUS.md` + the STATUS blocks in `CLAUDE.md`/`README.md`/`BUILD_LOG.md` | Live |
| [`branches.json`](branches.json) | The branch ledger — every remote branch ever pushed, cross-referenced against its GitHub PR(s) and merge status, so nothing goes quiet in `git branch -r`. | `scripts/branch-ledger.mjs` refreshes the git-derived fields; PR/status fields are filled in by a periodic branch audit | Live |
| `vector-memory.json` *(generated, gitignored)* | Local embeddings for semantic recall (opt-in, node-only). | `lib/hermes/vectorMemory.ts` / `vectorRecall.ts` | Opt-in |

## Design / manifesto (reference docs, not imported by runtime code)

| File | What it is | Status |
|---|---|---|
| [`brain.json`](brain.json) | The two-hemisphere manifesto, machine-readable — companion to `hemispheres.md`. The *executable* version of this model lives in `lib/hermes/brainMap.ts`. | Reference |
| [`hemispheres.md`](hemispheres.md) | The two-hemisphere manifesto, prose — the metaphor doc. | Reference |
| [`uiDesignLanguage.json`](uiDesignLanguage.json) | The WIFI DJ visual-language memory for the Hit Factory's web UI — hard rules learned from the Council redesign (no flat/gray fills, near-solid gradient stops, ambient glow, locked-palette-only), plus a running gaps backlog and an agent-learnings log. Read/updated by the `hermes-ui` agent (`.claude/agents/hermes-ui.md`) before/after every styling change. | Live |

## Video-studio artifacts (the flagship demo, separate track)

| File | What it is |
|---|---|
| [`treatment.md`](treatment.md) | Creative treatment for the flagship music video ("Stay There × Fuck Em × Poverty Porn"). |
| [`shotlist.md`](shotlist.md) | The shot list generated into `studio/config.json` — timed to the real vocal. |

## The rule that keeps this honest

Every file here carries its own one-line `"note"` (JSON) or opening paragraph
(Markdown) — so this index and the file agree, and neither can drift silently. When
you add a file to `brain/`, add both: the in-file note and a row here. `CLAUDE.md`'s
memory-layers table is the higher-level index across *all* memory (this folder +
`lib/hermes/`, localStorage, `docs/`) — this file is the zoomed-in index for just this
folder.
