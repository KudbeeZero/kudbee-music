# 📊 HERMES — Status Board

> **Generated from [`brain/roadmap.json`](brain/roadmap.json) — do not hand-edit.** Status lives ONLY in the spine; edit it there, then regenerate with `GEN_DOCS=1 npx vitest run status`. `statusBoard.test.ts` fails CI if this file drifts.

**Scoreboard:** ✅ 30 shipped · 🔨 1 in build · 💤 9 queued — 40 tracked items
(legend: ✅ shipped · 🔌 scaffold shipped, founder-gated · 🔨 in build · ⏭️ next · 💤 queued · 💭 idea · 🚧 blocked on founder)

## Tracks

### Traction Sprint — `▰▰▰▰▰▰▰▰▰▰` 6/6

| | Item | Where it lives | PR |
|---|------|----------------|----|
| ✅ | **Vector-memory determinism hardening** | `lib/hermes/vectorMemory.ts` | #49 |
| ✅ | **Semantic originality — meaning-level novelty (optional, server-side)** | `lib/hermes/semanticOriginality.ts` | #54 |
| ✅ | **Close the cognition loop — cognition picks the hook + regenerate-from-critiques** | `cognition.ts (selectHookByCognition) + pipeline.ts (cognitionFeedback) + SongPackageView.tsx + HermesHitFactory.tsx` | #52 |
| ✅ | **Interactive trace explorer + demo gallery** | `lib/hermes/traceHtml.ts + docs/demo-gallery.html + examples/demos/*/trace.html` | #50 |
| ✅ | **Council scoring → hook ranking + learn→vector recall** | `council.ts (rankHooksByCouncil) + Council.tsx + vectorRecall.ts (rememberSong/recommendSimilar)` | #53 |
| ✅ | **ARCHITECTURE.md + brain-wiring diagram (generated from brainMap)** | `ARCHITECTURE.md + docs/brain-wiring.md + lib/hermes/wiringDoc.ts` | #51 |

### Phase 0 — Living-state spine — `▰▰▰▰▰▰▰▰▰▰` 4/4

| | Item | Where it lives | PR |
|---|------|----------------|----|
| ✅ | **brain/roadmap.json spine + sync discipline** | `brain/roadmap.json` | — |
| ✅ | **Refresh TODO.md to reality (mark #30–#34 shipped)** | `TODO.md` | — |
| ✅ | **CLAUDE.md memory spine — saved conventions + routing table, guard-tested** | `CLAUDE.md` | #107 |
| ✅ | **Status Board — spine-generated status tables + drift tests (never-stale checklists)** | `lib/hermes/statusBoard.ts` | — |

### Phase 1 — Measure & make it safe — `▰▰▰▰▰▰▰▰▰▰` 4/4

| | Item | Where it lives | PR |
|---|------|----------------|----|
| ✅ | **Eval harness + golden songs (npm run eval)** | `lib/hermes/eval.ts` | #36 |
| ✅ | **Output-safety filter + short disclaimer/ToS** | `lib/hermes/safety.ts` | #37 |
| ✅ | **One-command demo (npm run demo) — full song end-to-end** | `lib/hermes/__tests__/demo.test.ts` | #38 |
| ✅ | **LAUNCH.md kit (star checklist + Twitter thread + demo-recording script)** | `LAUNCH.md` | #43 |

### Phase 2 — Deepen the visible brain — `▰▰▰▰▰▰▰▰▰▰` 5/5

| | Item | Where it lives | PR |
|---|------|----------------|----|
| ✅ | **Cognitive model: first thought → second thought → decision** | `lib/hermes/cognition.ts` | #39 |
| ✅ | **The Council — agents as a deliberating board** | `components/hermes/Council.tsx` | #41 |
| ✅ | **Brain-scan boot sequence + live per-agent drive** | `components/hermes/BrainScan.tsx` | #42 |
| ✅ | **Particle Brain + artist heat-map (living Brain Scan)** | `components/hermes/BrainScan.tsx + lib/hermes/heat.ts` | #40 |
| ✅ | **Deep Brain Atlas — 37 anatomy-named subregions, each mapped to a real module** | `lib/hermes/brainMap.ts` | — |

### Phase 3 — Make it yours (the living world) — `▰▰▰▰▰▱▱▱▱▱` 2/4

| | Item | Where it lives | PR |
|---|------|----------------|----|
| ✅ | **Create-your-own-artist v1 + Story Mode** | `lib/hermes/artist.ts + lib/hermes/story.ts + components/hermes/ArtistCard.tsx` | #46 |
| 💤 | **Community-authored personas (craft-DNA, like scene packs)** | `brain/personas.json` | — |
| ✅ | **Pro Studio Rack — modular upgradeable engine 'boxes' (Pro Tools aesthetic)** | `components/hermes/Rack.tsx + lib/hermes/engines.ts` | #48 |
| 💤 | **HERMES Studio workspace (Suno-Studio-style: section timeline + rack + meter bridge)** | `components/hermes/Studio.tsx` | — |

### Phase 4 — Durability — `▰▰▰▰▰▱▱▱▱▱` 1/2

| | Item | Where it lives | PR |
|---|------|----------------|----|
| ✅ | **Vault durability — export-on-change + file/cloud backup** | `lib/hermes/storage.ts` | #56 |
| 💤 | **Optional durable cloud brain (Notion/Drive backing)** | `lib/hermes/storage.ts` | — |

### Phase 5 — Real intelligence (opt-in) — `▰▰▰▰▰▰▰▱▱▱` 4/6

| | Item | Where it lives | PR |
|---|------|----------------|----|
| 🔌 | **claudeLyricsProvider behind ANTHROPIC_API_KEY (mock default)** | `lib/hermes/providers/claudeLyricsProvider.ts` | — |
| 💤 | **Rhyme/BPM validation loop on generated output** | `lib/hermes/pipeline.ts` | — |
| ✅ | **Vector memory + semantic search (local embeddings, opt-in)** | `lib/hermes/vectorMemory.ts` | #47, #49 |
| ✅ | **Claude Engine BYOK panel — visitor's own key, browser-only** | `components/hermes/Rack.tsx` | — |
| ✅ | **Scribe line editor + Rack 'Test key' verification** | `components/hermes/ScribeEditor.tsx` | — |
| ✅ | **Watchdog — Claude-powered security/quality review (findings-only)** | `scripts/watchdog.mjs` | — |

### Phase 6 — Influence Studio (WIFI DJ framework Part 1) — `▱▱▱▱▱▱▱▱▱▱` 0/1

| | Item | Where it lives | PR |
|---|------|----------------|----|
| 💤 | **Influence Studio — thematic cartography + lexical fingerprinting** | `lib/hermes/influence.ts` | — |

### Video studio — `▰▰▰▰▰▱▱▱▱▱` 4/8

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

## Ecosystem (freeform, founder-paced)

| | Initiative | Status |
|---|-----------|--------|
| ✅ | **workersBuildsCheck** | resolved — founder deleted the stray Worker (2026-07-02) |
| ✅ | **crossroadsBoard** | stage-1-shipped (#44) |
| 💤 | **lightningAI** | spike-pending |
| ✅ | **livingBrainNft** | near-term-shipped (#45); chain mint blocked-on-founder |
| 🚧 | **discordServer** | blocked-on-founder |
| 💭 | **wifiDjRadio** | later |
| 💭 | **token** | later |
| 💭 | **perAgentCompute** | later |
| ✅ | **landingPage** | shipped (#86) |
| ✅ | **publicReadiness** | shipped (#84) |
| ✅ | **identityLayer** | shipped (this PR) |
| 💭 | **docsSite** | later |
| 💤 | **videoStudio** | paused |
| ✅ | **runwayGen4** | adapter-shipped |

_The human working list is [`TODO.md`](TODO.md); the idea inbox is [`IDEAS.md`](IDEAS.md); the highlight reel is the [README roadmap](README.md#-roadmap)._
