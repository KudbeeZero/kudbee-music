# 🧠 HERMES — TODO

The living backlog. **Nothing gets stale, nothing gets mixed, nothing gets missed.**
The README [Roadmap](README.md#-roadmap) is the highlight reel; this is the working
list. Raw ideas land first in [`IDEAS.md`](IDEAS.md) (the capture net — nothing the
artist says gets lost), then graduate here once designed. Check items off as they ship.

> Convention: `[x]` done · `[~]` in progress · `[ ]` not started. Keep the most
> recently shipped items at the top of **Shipped** so the history reads newest-first.

---

## 🔑 Founder vision — everything you raised (one place, honest status)
_A consolidated index of every big idea the founder brought up, so nothing lives only in
chat. Detail for each is in [`brain/roadmap.json`](brain/roadmap.json) + [`IDEAS.md`](IDEAS.md)._

**Shipped ($0/local):**
- [x] **Particle Brain heat-map** — SVG brain + thermal particles, hot where *you* are as an artist _(#40)_
- [x] **Create-your-own-artist + Story Mode** — alias, bio, chapters unlock as you make songs _(#46)_
- [x] **dNFT signature (near-term $0 step)** — `brainSignature()` → deterministic traits + ERC-721 metadata _(#45)_
- [x] **Pro Studio Rack** — DAW-style upgradeable engine "boxes"; free unit active, key/server slots locked _(#48)_
- [x] **Crossroads Board — Stage 1** — local `crossroads.json` decision model _(#44)_
- [x] **Notion live roadmap mirror** · **Grok agent-image prompts** (10, delivered in chat)

**Blocked on you (needs a key / account / decision — I can scaffold the $0 parts, you flip the switch):**
- [ ] **Runway Gen-4 video** (you have the key + ~1000 credits) → `studio/runway.mjs` behind `RUNWAY_API_KEY`
   (`.env.local`, gitignored, never committed). Uses: agent avatars → living characters, the **HERMES office/world**
   scenes (agents get bodies), a **landing-page hero video**, real video clips. I can build the adapter $0; you run it.
- [ ] **Cool landing page** — hero (Runway video optional), Solana connect, live Brain-Scan. $0 static shell buildable now.
- [ ] **Solana wallet connect + accounts** — identity for the Board + dNFT; needs the auth/DB decision.
- [ ] **dNFT mint on-chain** (Solana/Metaplex) — the signature is $0-ready; minting is your call.
- [ ] **Agent images → avatars** — wire the Grok-generated images onto each agent (once you generate them).
- [ ] **Lightning AI spike** — one Studio running a HERMES agent behind **HTTPS/SSL** as an opt-in provider (you connect SSL).
- [ ] **Discord server** (+ GitHub→Discord webhook) — channels/roles/listening parties; wire on your go-ahead.
- [ ] **Real-AI Claude engine** — `claudeLyricsProvider` behind `ANTHROPIC_API_KEY` unlocks the locked rack slot (mock stays default).
- [ ] **Cloud brain** — server-side vault/memory (Notion/Drive/Supabase creds) so it's not localStorage-only.
- [ ] **Suno-Studio workspace** — section/arrangement timeline + rack + meter bridge ($0 read-only now; clip editing later).

**$0/local, no key — I can just build these next:**
- [~] **Deeper lyric craft** (the moat) — grammaticality shipped _(#58)_; **imagery coherence** shipped
   _(#60)_: theme/mood → imagery clusters (street/home/water/light/struggle/…) so backfill nouns match the
   subject. Next: image-coherence *scoring* + verb/noun agreement so lines relate, not just cohere thematically.
- [x] **Vector search strategies** — hybrid (cosine + deterministic lexical/keyword overlap) +
   diversity/MMR re-ranking (no near-duplicate recalls), opt-in + off by default, threaded through
   the per-agent recalls. Determinism preserved (quantized + id tie-break). _(#62)_
   Next vector ideas (deferred): embedding cache, hierarchical/section chunking.
- [x] **Vector memory → the agent systems** — `vectorRecall.ts` now stores a memory per facet
   (hook/lyric/theme→procedural/mood→emotion) and exposes per-agent recalls: `recallSimilarCraft`
   (procedural), `recallSimilarEmotion` (limbic), `recallSimilarHook` (Council self-repetition).
   Opt-in + graceful (empty without the dep); server/CLI-only so the client bundle stays Node-free. _(#61)_
- [x] **README hero / onboarding** — reframed the top around the deterministic songwriting brain
   (video studio now secondary), added a "⚡ Try it in 10 seconds" (`npm run demo`) path, a
   "🧠 Semantic memory (opt-in)" section (4 recall lenses + hybrid/MMR/determinism), and prominent
   demo-gallery + "Explain this song" links. The stars/adoption front door. _(#65)_
- [x] **In-app trace explorer** — a "🔍 Explain this song" button on the song package opens the
   interactive brain trace (heat-map + per-region cards + copy-paste Suno prompt) in a new tab,
   built client-side from the real brain modules (same renderer the demo gallery ships). #50 made
   visible where people actually use it. _(#63)_
- [x] **End-to-end app audit** — drove the static `/hermes` build headless through the full flow:
   generate → **choose a different hook** (swaps lead + re-scores) → **edit lyrics → save** (taste
   feedback) → **🔍 Explain** (trace opens) → **⬇ Export JSON** → **reload** (vault persists). PASS,
   zero console errors; the old "deck not selectable" issue is resolved. _(audit only, no code change)_
   - ~~Surfaced two combinator-polish issues~~ **both fixed _(#67)_**: (a) the audience word no longer
     leaks into `{noun}` slots (`themeNouns` excludes audience tokens); (b) the combinator's own action
     verbs (`carry`/`grind`/…) are rejected by `nounable` (`VERB_SET` derived from `VERBS`). Regression-tested.
- [ ] **Crossroads Stages 2–3** — `/crossroads` board UI → decisions feed the taste model.
- [ ] **3 review cleanups** — stronger memory-id hash · independent "earns-it" critique · guaranteed vault mirror.
- [ ] **Star-launch kit** — `LAUNCH.md` with a draft Twitter/X thread + a YouTube demo-recording script (you post it).

---

## 🚧 In progress
_The autonomous `/loop` is working the phased roadmap. **Source of truth:
[`brain/roadmap.json`](brain/roadmap.json)** — it indexes every item + the PR that
shipped it. This file is the human-readable view; keep the two in sync._

## 🧠 Brain buildout queue (autonomous /loop — research-informed)
1. [x] **Local lexicon** (vocabulary cortex) — token-free word store. _(shipped)_
2. [x] **Rhyme + meter engine** — `lib/hermes/rhyme.ts`: end-rhyme/scheme/density +
   lexicon rhyme families; the combinator now writes **rhymed couplets**, and hook
   scoring is honest (brevity + theme reference + internal rhyme, not length+RNG). _(shipped)_
3. [x] **Emotion → diction** — the limbic valence now picks the rhyme words + adjective
   pool (dark vs bright), so word choice leans with the mood. _(shipped)_
4. [x] **Default-Mode Network** — `lib/hermes/defaultMode.ts`: surfaces divergent
   angles on the brief (creativity-at-rest); the 10th brain region, coupled by nerves to
   generative + decision + analytical; feeds a divergent option into the concept step. _(shipped)_
5. [x] **Reward circuit** — `lib/hermes/reward.ts`: crave-ability score (returns +
   mutation + brevity + singability); the 11th brain region, surfaced by the A&R Judge. _(shipped)_
6. [x] **Procedural memory** — `lib/hermes/procedural.ts`: derives the artist's recurring
   craft moves (favorite structure, recurring rhyme sounds, verse length) from the vault;
   surfaced as a "signature move" recommendation. _(shipped)_
7. [x] **"Becoming you" self-portrait** — the 🪞 panel surfaces how much of a song is the
   learned voice vs fresh suggestion. _(#30)_

## 🎯 Up next (ordered) — the phased roadmap (see [`brain/roadmap.json`](brain/roadmap.json))
- **Phase 1 — Measure & make it safe:** eval harness + golden songs (`npm run eval`);
  output-safety filter + disclaimer; one-command demo (`npm run demo`).
- **Phase 2 — Deepen the visible brain:** cognitive model (`cognition.ts`, first→second
  thought→decision); the Council (agents as a deliberating board); brain-scan boot
  sequence + live per-agent drive.
- **Phase 3 — Make it yours:** create-your-own-artist v1 (artist-identity file that
  becomes you); community-authored personas.
- **Phase 4 — Durability:** vault durability (export-on-change + backup); optional cloud brain.
- **Phase 5 — Real intelligence (opt-in):** `claudeLyricsProvider` behind a key (mock
  default → $0); rhyme/BPM validation loop.
- **Phase 6 — Influence Studio:** describe an influence (felt, never copied) → craft params.

## 🚀 Traction Sprint (from the multi-agent audit — ranked, $0, 2–4 wks)
The audit converged: turn **display-only** brain systems into **load-bearing** ones, wire in
vector memory, and document the architecture — lifts output quality, dev appeal, and stars.
- [x] **0. Vector-memory determinism hardening** — quantized rank + deterministic tie-break
   (id, then text) so search is reproducible across Intel/Apple-Silicon/AMD (FP/BLAS-safe). _(#49)_
- [x] **1. Semantic originality** — `semanticOriginality.ts` flags *meaning*-similar prior
   lines (paraphrases the fingerprint/bigram check misses) via `vectorMemory`; `mergeSemanticFlags`
   folds them into the base report + re-scores. Server/CLI-only (keeps the client bundle
   Node-free), opt-in + graceful. _(#54)_
- [x] **2. Close the cognition loop** — cognition is now load-bearing: `selectHookByCognition`
   picks the best-*reasoned* hook (not just top score), the pipeline stores the `Deliberation`
   on the package, `opts.cognitionFeedback` steers regeneration toward a hook that fixes the
   flagged critiques, and a "↻ Regenerate from these critiques" button wires it in the UI. _(#52)_
- [x] **3. Interactive trace explorer + demo gallery** — `traceHtml.ts` renders a `SongTrace`
   to self-contained HTML: brain heat-map (Brain-Scan hues, clickable nodes), collapsible
   per-region cards, copy-to-clipboard Suno prompt. `GEN_DEMOS=1` mints `trace.html` per demo
   + `docs/demo-gallery.html`. The top shareability/stars move. _(#50)_
- [x] **4. Council scoring → hook ranking + learn→vector recall** — `council.ts`
   `rankHooksByCouncil` ranks every hook across the three voices (challenges 45 · crave 35 ·
   confidence 20), shown as a live board in the Council. `vectorRecall.ts` (`rememberSong` /
   `recommendSimilar`) stores winners into semantic memory + recalls meaning-close past hooks —
   kept in its own server/CLI module so the client bundle stays Node-free. Both opt-in/$0. _(#53)_
- [x] **5. ARCHITECTURE.md + brain-wiring diagram** — `ARCHITECTURE.md` (two studios/one
   brain, pipeline flow, full `lib/hermes/` module map, non-negotiables) + a code-generated
   `docs/brain-wiring.md` Mermaid diagram (`wiringDoc.ts` from `brainMap.ts`, can't drift);
   README "New here?" pointer. Attracts senior-eng contributors; reframes as "a modular
   agent brain." _(#51)_

### 📎 $0 backlog (post-sprint polish)
- [x] **Persona-map reference** — `docs/personas.md` documenting the 6 craft archetypes,
   generated from `personas.ts` (`personasDoc.ts`, `GEN_DOCS`-gated) so it can't drift;
   states the original-only / never-name-an-artist stance. _(#55)_
- [x] **Vault durability** — `storage.ts` mirrors every vault/album write to a `.bak` key;
   reads auto-heal from the mirror if the live key is missing/corrupt, plus `restoreFromBackup()`
   + `vaultBackupStatus()` for an explicit restore. Survives a truncated write or a cleared
   single key (full-storage export/import still covers a wiped browser). Tested. _(#56)_
- [x] **Lyric grammaticality (the moat)** — the combinator was slotting verbs/adjectives/
   gerunds into noun positions ("handed me GROWING", "the WAS and the light"). Added
   `nounable()` (rejects gerunds/participles/adverbs/auxiliaries) + a concrete-noun bank that
   backfills so `{noun}` slots are always real, distinct nouns; anchor thread padded so a thin
   theme doesn't repeat one word. Grammaticality guard tests; demos regenerated. _(#58)_
- [ ] **Deeper lyric craft (next $0 pass)** — the combinator is grammatical now but still
   impressionistic; next: theme→imagery mapping so backfill nouns fit the subject, verb/noun
   agreement in frames, and image-coherence scoring so a line's nouns relate.

## 🌐 Ecosystem (integrates via API — kept out of the free local core)
- [~] **Crossroads Board** — the WIFI DJ governance/community steering surface (the brain's
   "decision" region, made social). Staged plan in [`brain/roadmap.json`](brain/roadmap.json):
   (1) local `crossroads.json` model → (2) `/crossroads` board UI → (3) decisions feed the
   taste model → (4) community sync via API → (5) token-weighted governance. Stages 1–3 are
   $0/local; 4–5 are a separate service the core calls via API.
- [ ] **Discord community server** (preferred over Telegram) — learn-the-process + contribute:
   channels (`#showcase`/`#help`/`#contributing`/`#song-drops`), roles, voice listening
   parties, and a **GitHub→Discord webhook** posting commits/PRs/releases. Draft structure +
   wire the webhook on founder's go-ahead; optional Telegram announce mirror later.
- [ ] **`LAUNCH.md` kit** — star-launch checklist + draft Twitter/X thread + demo-recording
   script (supports the Twitter/YouTube launch). $0 doc-only.
- [ ] **Lightning AI spike** — per-agent compute for the opt-in "advance your model" tier
   (user signs up → their own agent). Best used as the **optional GPU lane**, not the
   backbone; base stays $0/local/serverless. Prereq: accounts + persistent vault (Phase 4).
   **Spike when SSL is connected:** one Lightning Studio running a single HERMES agent
   behind HTTPS, wired as an opt-in provider; compare vs Anthropic-API-direct + Modal/Replicate.
- [ ] **Per-track Suno structure hints** — `[Intro]`/`[Bridge]` pacing, stems, BPM/key
   tags in the Suno export (folds into Phase 5).
- [ ] **Docs site on GitHub Pages** — Astro Starlight.

## 💡 Backlog (unordered ideas)
- [ ] **Live preview = the review path** — deploy to **Vercel** (free, instant
      `*.vercel.app` URL) so the founder can review each change in a browser; point
      **wifidj.xyz** at it later as the branded home. No domain needed to start.
- [ ] **16:9 scene builder wired to the video studio** straight from a Hit Factory package
      (today `hermes from-song` scaffolds the project; this would auto-pick shots).
- [ ] **Artist/project vault** server-side (today the vault is localStorage only).
- [ ] **Release calendar** + per-track release-readiness tracking.
- [ ] **More scene packs** (community-extensible — the easiest contribution).
- [ ] **More expansion packs** (Suno style presets — the song-side equivalent).
- [ ] **Team / agent marketplace** — share agent rosters and packs.
- [ ] **Stripe credits** for any future hosted/paid lane (kept optional).
- [ ] **Social-preview + demo reel refresh** when the next flagship video lands.

---

## 🧭 North star — the WIFI DJ "Lyrical Recombinator Framework"
This repo is the **AI-engine pillar** of [WIFI DJ](https://wifidj.xyz). Our build maps
onto the framework's three parts (we stay original-only — influences are *felt, never
copied*; no living-artist mimicry):
1. **Deconstruct the influences** — thematic cartography, lexical fingerprinting,
   architectural blueprinting → an **Influence Studio** (describe an influence → craft
   parameters; reuse `learn.ts` + originality fingerprints). *Guardrail: structure &
   feel, never an artist's actual words.*
2. **The generation engine** — probabilistic model + **syllabic constraint layer** +
   **rhyme architect** → Phase 2 (rhyme/meter in `text.ts`/`mockLyricsProvider.ts`) +
   Phase 3 (real LLM behind the adapter).
3. **The ghost in the machine** — the ~20% novelty + community **prompting tags** →
   `originality.ts` + seed/variety + steering hooks.
The **Writers-Room** (`process.ts`) is the human-craft layer on top; the **Crossroads
Board** governance / Solana / token / NFT layer integrates with this engine via API
later (kept out of this repo's core so it stays free + local).

## ✅ Shipped (newest first)
- [x] **Responsive web UI (mobile + tablet)** — a scoped pass in the existing CSS-Modules +
      CSS-variable system (no Tailwind migration) around two breakpoints: **≤1180 (stack)** and
      **≤640 (touch)**. Touch targets ~44px, 16px inputs (no iOS focus-zoom), a glass budget that
      drops `backdrop-filter` blur on phones, drawers → bottom sheets (safe-area aware), the
      generation "moment" scrolls into view when the deck is stacked, and the generated trace
      explorer gets a mobile media query. Verified headless at 375/768/1280 — no horizontal
      scroll, zero console errors. _(#69)_
- [x] **Lyric grammaticality — audit hardening** — the end-to-end app audit + the "No Permission"
      song surfaced real bugs (`the carry`, `through the daughter`, `the built`). Fixed by excluding
      the combinator's own action verbs, the audience token, and irregular past-tense verbs from
      noun slots, with regression tests. _(#66 · #67 · #68)_
- [x] **Pro Studio Rack** — `components/hermes/Rack.tsx` + `lib/hermes/engines.ts`: a DAW-style
      "🎛️ Engine Rack" — the free Local Combinator active, locked Claude/Lightning upgrade
      slots on the LyricsProvider seam (the professional-stack vision; premium units unlock
      with a key/server). _(#48)_
- [x] **Vector memory + semantic search (opt-in, $0/local)** — `lib/hermes/vectorMemory.ts`:
      a local semantic-recall layer on top of the rule/lexicon systems. `@xenova/transformers`
      is an **optional lazy dep** (core install + CI stay light; enable with `npm i
      @xenova/transformers`); the pure cosine-search core is unit-tested without the model.
      `addMemory`/`semanticSearch` + type filtering + a gitignored store. Wiring into
      learn/originality/procedural is the next step. _(#47)_
- [x] **Create-your-own-artist v1 + Story Mode** — `lib/hermes/artist.ts` grows an identity
      (alias, signature words, hemisphere, chapter, bio) from your vault+taste; `lib/hermes/story.ts`
      unlocks chapters (First Spark → Finding Your Voice → First Banger → The Album) as the brain
      becomes you. A "🎭 Your Artist" card (editable, persisted alias) surfaces it. _(#46)_
- [x] **Living-Brain dNFT signature (near-term, $0)** — `lib/hermes/brainSignature.ts`:
      `brainSignature()` → deterministic traits (dominant hemisphere, temperature, signature
      rhyme, songs made, becoming-you, primary emotion) + `toNftMetadata()` → standard
      ERC-721 metadata. The exact JSON a token points to — no chain, no network. A later
      Solana/Metaplex mint becomes trivial. _(#45)_
- [x] **Crossroads Board — Stage 1** — `lib/hermes/crossroads.ts` (the $0/local decision model:
      open a "crossing", weighted votes, tally, decide) + `brain/crossroads.json` (seeded
      crossings) + tests. The brain's "decision" region made social; community sync + token
      voting (stages 4-5) integrate later via API, out of the free core. _(#44)_
- [x] **Launch kit** — `LAUNCH.md` rewritten brain-first: pre-flight checklist, demo-recording
      script, draft X thread, channel sequence, guardrails. For the Twitter/YouTube launch. _(#43)_
- [x] **Brain-scan boot sequence + live drive** — a scan-line boot sweep while running
      (reduced-motion aware) and regions/agents ignite in sequence live off the per-agent
      stream. **Completes Phase 2 (deepen the visible brain).** _(#42)_
- [x] **The Council** — `components/hermes/Council.tsx`: the agents as a deliberating board
      (right proposes · left challenges · you decide), reusing agent findings + the cognition
      loop. The WIFI DJ "Crossroads Board" made literal. Plus a `.env*` gitignore guard +
      `.env.example` so founder API keys can never be committed. _(#41)_
- [x] **Particle Brain + artist heat-map** — the Brain Scan now has a canvas particle layer
      + a **thermal heat-map** (`lib/hermes/heat.ts` `brainHeat()`, tested): regions glow by
      *the type of artist you are* (right/generative → hot magenta, analytical → cyan, emotion
      raises temp, more "becoming-you" → hotter). Reduced-motion aware. _(#40)_
- [x] **Cognitive model** — `lib/hermes/cognition.ts`: `deliberate()` runs first thought →
      second thought (3 real critiques: true-to-brief / original / earns-it) → decision
      (keep|revise); a "🧭 How the brain decided" readout on the lead hook. _(#39)_
- [x] **One-command demo** — `npm run demo`: generates a full original song end-to-end and
      prints it + the 11-region generation trace (lyrics-focused, no video; deterministic).
      The 30-second "see it work" moment for new visitors. _(#38)_
- [x] **Output-safety filter + disclaimer** — `lib/hermes/safety.ts`: screens generated
      hooks/lyrics against a famous-phrase list → a `famous-phrase` uniqueness flag; a
      responsibility disclaimer in the README + Uniqueness panel. _(#37)_
- [x] **Eval harness + golden songs** — `lib/hermes/eval.ts` + `npm run eval`: objective
      local metrics (rhyme density, line diversity, thematic coherence, hook strength) over
      the demos + flagship as a **golden set**; a CI regression guard so "learn/score" is
      measurable. _(#36)_
- [x] **Deterministic lyric-core depth** — hierarchical generation (section goals:
      setup→turn→reflect), thematic threading, diversity scoring (`selfSimilarity`), and a
      slant-rhyme "temperature" dial (`rhymeTemp`, `slantKey`, Song Lab selector). _(#34)_
- [x] **Functional song deck + video pullback** — hook options selectable (honest re-score
      + feeds the voice model), clips copy-on-tap; video framing removed from the web app
      (plain JSON export, music-video section gone). Video studio code kept for the CLI. _(#33)_
- [x] **Demo songs + generation traces** — `examples/demos/`: 5 original songs, each minted
      by the real pipeline with a trace of what all 11 regions contributed. _(#32)_
- [x] **Honest framing pass** — README + `hemispheres.md` + Brain Scan state the brain is an
      inspired workflow model, not biological fidelity. _(#31)_
- [x] **Reward, Default-Mode, Procedural memory, Becoming-you** — the last brain-buildout
      regions/readouts (crave score, divergent angles, signature moves, voice mirror). _(#27–#30)_
- [x] **Rhyme + meter engine** — `lib/hermes/rhyme.ts` (end-rhyme, scheme, density,
      lexicon rhyme families). The combinator writes **rhymed couplets** now (verses
      actually rhyme), and hook scoring is **honest** — brevity + theme reference +
      internal rhyme, not length + RNG. Closes the "lyrics don't rhyme / gameable
      score" weakness. _(this PR)_
- [x] **Local lexicon (vocabulary cortex)** — `brain/lexicon/core.json` + `lib/hermes/lexicon.ts`:
      a token-free, version-controlled word store (part-of-speech, affect/valence,
      imagery tag) with heuristic **syllable counting** and **rhyme matching**
      (`rhymesWith`, `doesRhyme`), plus affect/imagery queries. The offline backbone for
      the rhyme engine + emotion-colored diction. Grow it by adding words to the JSON. _(this PR)_
- [x] **Limbic (emotion) layer** — `lib/hermes/emotion.ts`: reads mood into an affect
      model (valence/intensity/primary feeling), proposes the emotional **contrast** for
      depth, and maps sections onto an emotional **arc**. Feeds the Writers-Room
      (concept + arc) and enriches the Emotion Scanner. Its own **Limbic brain region**
      (9/9) now lights up. Emotion is now *shaped*, not just scored. _(this PR)_
- [x] **Deploy path + `wifidj.xyz` wiring** — `docs/deploy.md`: the app is fully static
      (all routes prerendered), so `STATIC_EXPORT=1 next build` → `out/` hosts on
      **Cloudflare Pages** with one env var (or Vercel, already configured). Env-gated
      static export in `next.config.mjs`; `out/` fully gitignored. _(this PR)_
- [x] **`/resume` continuity skill** — `.claude/skills/resume/SKILL.md`: a new chat runs
      `/resume` to pick up exactly where the last left off — reads TODO/IDEAS/docs, checks
      git + open PRs (nothing stale/crossed), states the workflow rules, proposes the next
      step. _(this PR)_
- [x] **Language & Culture area** — `lib/hermes/language.ts`: maps the artist's OWN
      described background (where you're from / what shaped you) + voice into craft
      levers (register, diction, imagery from their own words, vernacular), with
      struggle-as-depth (truth-first). Feeds the Writers-Room truth/draft steps and a
      new Lyric Lab brief field. The dim brain region now **lights up** (wired to the
      lyric-chemist) — the whole brain is active. Original-only, never a group profile. _(this PR)_
- [x] **Nervous system + memory tiers** — the brain's signalling + memory layer:
      `lib/hermes/brainMap.ts` (regions + nerves, single source of truth),
      `lib/hermes/nervousSystem.ts` (a signal bus), `lib/hermes/workingMemory.ts`
      (decaying short-term memory that **consolidates** into long-term on save). The
      Brain Scan draws the nerves and **pulses them live** as signals travel; Short-term
      and Long-term are now distinct regions. _(this PR)_
- [x] **Brain Scan (v1)** — `components/hermes/BrainScan.tsx`: an anatomical brain whose
      functional regions light up as the agents fire (cyan=left/analytical,
      magenta=right/generative, amber=center). **Each region is a knowledge file** you
      can tap (the Obsidian-style vault, made visual). Language & Culture region pending. _(this PR)_
- [x] **Lyric Lab** — the Writers-Room made visible (`components/hermes/LyricLab.tsx`):
      pick a craft persona, walk the 9 steps with options *and reasons*, commit choices;
      the committed **hook becomes the song's real hook** (pipeline `forcedHook`), and
      every choice **trains the voice** (`recordTaste`). _(this PR)_
- [x] **Persona engine — anonymized craft-DNA** (framework Part 1, original-only) —
      `brain/personas.json` + `lib/hermes/personas.ts`: 6 lyrical-mind archetypes
      (subjects, rhyme density, cadence, structure, register, novelty); `matchPersona`
      / `suggestPersona` map a *described feel* (never a name) to the closest archetype;
      `personaOverlay` steers each Writers-Room step. No artist names, no lyrics. _(this PR)_
- [x] **Writers-Room engine + belief system** — `lib/hermes/process.ts` (the 9-step
      craft assistant: concept→truth→perspective→hook→rhyme→draft→revise→arc, options
      *with reasons*, voice-signal capture) + `brain/beliefs.json` constitution
      (`lib/hermes/beliefs.ts`). The proprietary edge: assistant, not autopilot. _(this PR)_
- [x] **Phase 1 — Proof & loop polish** — flagship **Cold Hard Gold** example
      (`examples/cold-hard-gold/`, minted by the real pipeline, 99/100) seeded into
      the app's empty state via a one-click "see a finished example" button; the
      song→video **Suno handoff** (`from-song` emits a ready-to-paste Suno link +
      Style + Lyrics, `build` gives clear guidance when `track.mp3` is missing);
      honest score labels. _(this PR)_
- [x] **Public testing URL** — `vercel.json` (Vercel-ready) + `docs/testing.md`
      (Vercel / Codespaces / local tunnel) + `scripts/expose.sh`. _(PR #10)_
- [x] **Song → video bridge** — `hermes from-song` turns a Hit Factory song package
      into a renderable video project; both studios fused. _(PR #9)_
- [x] **Learn from edits** — rewriting lyrics teaches the brain a taste model
      (added vs cut words); a repeatedly-cut word becomes a one-tap exclusion. _(PR #8)_
- [x] **Memory + learning brain + albums** — `brain/memory.json` exclusion list,
      artist profile, recommendations, album assembly + one-block Suno export,
      production expansion packs (`drill-dark`, `soul-sample`, `trap-ballad`). _(PR #7)_
- [x] **Hit Factory V1** — 10-agent song-creation studio (Next.js + React), banger
      score (/100), local uniqueness checker, vault, vendor-neutral adapters,
      no API key. _(PR #6)_
- [x] **Two-hemisphere brain** — `--brain right|left|balanced` dominance dial,
      `hermes-qa` eval gate (CI-gated), `brain/hemispheres.md` + `brain/brain.json`. _(PR #5)_
- [x] **Audio mastering** — `hermes master` two-pass EBU R128 to −14 LUFS / −1 dBTP. _(PR #5)_
- [x] **Scene packs** — `neo-noir`, `retrowave`, `vhs-lofi`, `lyric-minimal`;
      project-targeted builds (`hermes build <dir>`); 9:16/1:1/4:5 aspect ratios. _(PRs #1, #5)_
- [x] **Code-only, vocal-synced 1080p music videos** — the flagship: Whisper
      force-aligned lyrics, headless Chromium → ffmpeg, $0 of paid software. _(PR #1)_

---

## 🔁 Working agreement (so nothing gets left behind)
- One open PR at a time where possible; **once CI is green on a PR, mark it ready and
  merge it** — don't park drafts.
- A merged branch is finished — **follow-up work goes on a fresh branch / new PR**,
  never stacked on already-merged history.
- When something ships, move it from **Up next/Backlog** to **Shipped** in the same PR,
  and update the README Roadmap if it's highlight-worthy. Keep this file and the README
  in sync.
- **Living-state rule (anti-staleness spine):** every PR updates all four surfaces
  together — [`brain/roadmap.json`](brain/roadmap.json) (flip the item's status + record
  the PR), this `TODO.md`, [`IDEAS.md`](IDEAS.md), and the README roadmap. A PR that ships
  an item but leaves the spine stale is **not done**. The `/loop` reads `roadmap.json` to
  pick the next item, so it must always reflect reality.
