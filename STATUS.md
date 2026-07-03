# 📊 HERMES — Status Board

> **Generated from [`brain/roadmap.json`](brain/roadmap.json) — do not hand-edit.** Status lives ONLY in the spine; edit it there, then regenerate with `GEN_DOCS=1 npx vitest run status`. `statusBoard.test.ts` fails CI if this file drifts.

**Scoreboard:** ✅ 73 shipped · 🔨 2 in build · 💤 8 queued — 83 tracked items
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

### Phase 0 — Living-state spine — `▰▰▰▰▰▰▰▰▰▰` 5/5

| | Item | Where it lives | PR |
|---|------|----------------|----|
| ✅ | **brain/roadmap.json spine + sync discipline** | `brain/roadmap.json` | — |
| ✅ | **Refresh TODO.md to reality (mark #30–#34 shipped)** | `TODO.md` | — |
| ✅ | **CLAUDE.md memory spine — saved conventions + routing table, guard-tested** | `CLAUDE.md` | #107 |
| ✅ | **Status Board — spine-generated status tables + drift tests (never-stale checklists)** | `lib/hermes/statusBoard.ts` | — |
| ✅ | **Branch ledger — every branch cross-referenced against its PR + merge status** | `brain/branches.json + scripts/branch-ledger.mjs` | — |

### Phase 1 — Measure & make it safe — `▰▰▰▰▰▰▰▰▰▰` 4/4

| | Item | Where it lives | PR |
|---|------|----------------|----|
| ✅ | **Eval harness + golden songs (npm run eval)** | `lib/hermes/eval.ts` | #36 |
| ✅ | **Output-safety filter + short disclaimer/ToS** | `lib/hermes/safety.ts` | #37 |
| ✅ | **One-command demo (npm run demo) — full song end-to-end** | `lib/hermes/__tests__/demo.test.ts` | #38 |
| ✅ | **LAUNCH.md kit (star checklist + Twitter thread + demo-recording script)** | `LAUNCH.md` | #43 |

### Phase 2 — Deepen the visible brain — `▰▰▰▰▰▰▰▰▰▰` 8/8

| | Item | Where it lives | PR |
|---|------|----------------|----|
| ✅ | **Cognitive model: first thought → second thought → decision** | `lib/hermes/cognition.ts` | #39 |
| ✅ | **The Council — agents as a deliberating board** | `components/hermes/Council.tsx` | #41 |
| ✅ | **Brain-scan boot sequence + live per-agent drive** | `components/hermes/BrainScan.tsx` | #42 |
| ✅ | **Particle Brain + artist heat-map (living Brain Scan)** | `components/hermes/BrainScan.tsx + lib/hermes/heat.ts` | #40 |
| ✅ | **Deep Brain Atlas — 37 anatomy-named subregions, each mapped to a real module** | `lib/hermes/brainMap.ts` | — |
| ✅ | **Council build plan, PR1 — your learned taste as a 4th voice** | `lib/hermes/council.ts` | — |
| ✅ | **Agent Network codenames — Council companion identities** | `lib/hermes/agents.ts + components/hermes/Council.tsx` | #185 |
| ✅ | **AgentAvatar — $0 SVG glyphs for the Agent Network codenames** | `components/hermes/AgentAvatar.tsx` | — |

### Phase 3 — Make it yours (the living world) — `▰▰▰▰▰▰▰▰▱▱` 5/6

| | Item | Where it lives | PR |
|---|------|----------------|----|
| ✅ | **Create-your-own-artist v1 + Story Mode** | `lib/hermes/artist.ts + lib/hermes/story.ts + components/hermes/ArtistCard.tsx` | #46 |
| 💤 | **Community-authored personas (craft-DNA, like scene packs)** | `brain/personas.json` | — |
| ✅ | **Pro Studio Rack — modular upgradeable engine 'boxes' (Pro Tools aesthetic)** | `components/hermes/Rack.tsx + lib/hermes/engines.ts` | #48 |
| ✅ | **HERMES Studio workspace (Suno-Studio-style: section timeline + rack + meter bridge)** | `components/hermes/Studio.tsx` | — |
| ✅ | **Bring Your Own Sound, PR1 — Voice Notes: record & attach a take** | `lib/hermes/audioVault.ts + components/hermes/VoiceNotes.tsx` | — |
| ✅ | **Bring Your Own Sound — upload an existing audio file (not just live mic recording)** | `components/hermes/VoiceNotes.tsx + lib/hermes/audioVault.ts` | — |

### Phase 4 — Durability — `▰▰▰▰▰▱▱▱▱▱` 1/2

| | Item | Where it lives | PR |
|---|------|----------------|----|
| ✅ | **Vault durability — export-on-change + file/cloud backup** | `lib/hermes/storage.ts` | #56 |
| 💤 | **Optional durable cloud brain (Notion/Drive backing)** | `lib/hermes/storage.ts` | — |

### Phase 5 — Real intelligence (opt-in) — `▰▰▰▰▰▰▰▰▱▱` 7/9

| | Item | Where it lives | PR |
|---|------|----------------|----|
| 🔌 | **claudeLyricsProvider behind ANTHROPIC_API_KEY (mock default)** | `lib/hermes/providers/claudeLyricsProvider.ts` | — |
| 💤 | **Rhyme/BPM validation loop on generated output** | `lib/hermes/pipeline.ts` | — |
| ✅ | **Vector memory + semantic search (local embeddings, opt-in)** | `lib/hermes/vectorMemory.ts` | #47, #49 |
| ✅ | **Claude Engine BYOK panel — visitor's own key, browser-only** | `components/hermes/Rack.tsx` | — |
| ✅ | **Scribe line editor + Rack 'Test key' verification** | `components/hermes/ScribeEditor.tsx` | — |
| ✅ | **Pattern packs — rhyme-scheme + form variety ($0/local)** | `lib/hermes/patternPacks.ts` | — |
| ✅ | **Watchdog — Claude-powered security/quality review, scheduled + findings-only** | `scripts/watchdog.mjs` | — |
| ✅ | **Occasion Packs — holiday/life-moment lexicon + dedication (Song Gifts, phase 1)** | `lib/hermes/occasionPacks.ts` | — |
| ✅ | **Song Gifts — gift-framed share link, PNG card, and OG unfurl (phase 2)** | `lib/hermes/shareLink.ts` | — |

### Phase 6 — Influence Studio (WIFI DJ framework Part 1) — `▱▱▱▱▱▱▱▱▱▱` 0/1

| | Item | Where it lives | PR |
|---|------|----------------|----|
| 💤 | **Influence Studio — thematic cartography + lexical fingerprinting** | `lib/hermes/influence.ts` | — |

### Phase 7 — Tiny features — the standing cadence — `▰▰▰▰▰▰▰▰▰▰` 25/25

| | Item | Where it lives | PR |
|---|------|----------------|----|
| ✅ | **🎲 Surprise me — a varied starter-brief pool for Song Lab** | `components/hermes/SongLabForm.tsx` | — |
| ✅ | **📋 Copy lyrics — plain-text copy button** | `components/hermes/SongPackageView.tsx` | — |
| ✅ | **⭐ Vault favorites — pin your best takes** | `lib/hermes/storage.ts + components/hermes/VaultDrawer.tsx` | — |
| ✅ | **🎤 Click-a-word rhyme helper** | `components/hermes/SongPackageView.tsx` | — |
| ✅ | **📏 Word/line/runtime counter** | `components/hermes/SongPackageView.tsx` | — |
| ✅ | **📑 Duplicate this song — fork a vault entry** | `lib/hermes/storage.ts + components/hermes/VaultDrawer.tsx` | — |
| ✅ | **📝 Per-song vault notes** | `lib/hermes/storage.ts + components/hermes/VaultDrawer.tsx` | — |
| ✅ | **⌨️ Cmd/Ctrl+Enter to generate** | `components/hermes/SongLabForm.tsx` | — |
| ✅ | **🎵 One-click Copy Suno prompt** | `components/hermes/SongPackageView.tsx` | — |
| ✅ | **⎋ Escape-key close for Vault/Album drawers** | `components/hermes/VaultDrawer.tsx + components/hermes/AlbumView.tsx` | — |
| ✅ | **📄 Markdown export** | `lib/hermes/markdownExport.ts` | — |
| ✅ | **↩️ Undo a committed Lyric Lab step** | `components/hermes/LyricLab.tsx` | — |
| ✅ | **↺ Reset to defaults on Song Lab** | `components/hermes/SongLabForm.tsx` | — |
| ✅ | **🕐 Recently viewed strip in the Vault** | `lib/hermes/storage.ts + components/hermes/VaultDrawer.tsx` | — |
| ✅ | **🔎 Vault search/filter box** | `components/hermes/VaultDrawer.tsx` | — |
| ✅ | **✎ Inline vault-song rename** | `lib/hermes/storage.ts + components/hermes/VaultDrawer.tsx` | — |
| ✅ | **🗑 Clear all avoid-words** | `components/hermes/HermesHitFactory.tsx` | — |
| ✅ | **📋 Copy JSON to clipboard** | `components/hermes/SongPackageView.tsx` | — |
| ✅ | **/ jumps to the Vault search box** | `components/hermes/VaultDrawer.tsx` | — |
| ✅ | **🔽 Vault sort toggle (newest/oldest/title A–Z)** | `components/hermes/VaultDrawer.tsx` | — |
| ✅ | **📋 Copy all lyrics — bulk clipboard export for the whole vault** | `components/hermes/VaultDrawer.tsx` | — |
| ✅ | **🔀 Duplicate + rename in one motion** | `lib/hermes/storage.ts + components/hermes/VaultDrawer.tsx + components/hermes/HermesHitFactory.tsx` | — |
| ✅ | **📅 'N songs today' stat in the Vault header** | `components/hermes/VaultDrawer.tsx` | — |
| ✅ | **📄 Copy all as Markdown — bulk vault export, richer format** | `components/hermes/VaultDrawer.tsx` | — |
| ✅ | **🗑 Clear all vault notes** | `lib/hermes/storage.ts + components/hermes/VaultDrawer.tsx` | — |

### Phase 8 — Medium features — the planned arc — `▰▰▰▰▰▰▰▰▰▱` 8/9

| | Item | Where it lives | PR |
|---|------|----------------|----|
| ✅ | **🧭 Studio Flow PR1 — the Review/Refine/Keep/Release rail** | `components/hermes/HermesHitFactory.tsx + SongPackageView.tsx + hermes.module.css` | — |
| ✅ | **🖥️ Agent Board upgrade — live connection lines + terminal signal ticker** | `components/hermes/AgentBoard.tsx + SignalTicker.tsx + HermesHitFactory.tsx + hermes.module.css` | — |
| ✅ | **🔌 Council-voice-registry refactor — the plug-in prerequisite** | `lib/hermes/council.ts` | — |
| ✅ | **🎭 Guest Judges — pluggable Council personas** | `lib/hermes/guestJudges.ts + components/hermes/Council.tsx` | — |
| ✅ | **🎛️ Agent Packs MVP — genre/scene Council voice bundles** | `lib/hermes/agentPacks.ts + components/hermes/Council.tsx` | — |
| ✅ | **📖 Word ideas — a similar-words popup while editing lyrics** | `lib/hermes/lexicon.ts + components/hermes/ScribeEditor.tsx` | — |
| ✅ | **🔄 Live re-scoring on lyric edit — the panel ripples with an edit** | `components/hermes/HermesHitFactory.tsx + lib/hermes/pipeline.ts` | — |
| ✅ | **🧭 Guided tour of the Scribe lyric editor (coach-marks)** | `components/hermes/GuidedTour.tsx + ScribeEditor.tsx + lib/hermes/storage.ts` | — |
| 🔨 | **🕸️ Agent Lifecycle library — data layer only, no UI wired up yet** | `lib/hermes/agentLifecycle.ts` | — |

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
| ✅ | **crossroadsBoard** | stage-3-shipping |
| 🚧 | **lightningAI** | adapter-built; live-test blocked-on-founder-endpoint |
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
