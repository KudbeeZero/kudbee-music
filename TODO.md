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
- [x] **Pattern packs — lyric structure + rhyme-scheme variety** — "lyrics are all coming out
   very similar in regards to pattern... people should be able to choose more." Fixed two real
   gaps a `/deep-research` pass confirmed: rhyme generation was hard-coded to sequential AABB
   couplets (now a `rhymeScheme` dial — AABB/ABAB/ABBA/AAAA/XAXA, verified against the
   existing `rhymeScheme()` detector), and the "Full song" structure silently duplicated
   hook-first (now rides out on a repeated final hook, per the AABA convention). Named
   presets in `brain/patternPacks.json`. See "Pattern packs" in Shipped + `docs/pattern-packs.md`.
- [x] **Real-AI Claude engine — live in the panel (bring-your-own-key)** — the Engine Rack's
   Claude Engine slot is now interactive: any visitor can paste their own Anthropic key
   (`console.anthropic.com`), it's stored only in their browser (`lib/hermes/claudeKey.ts`),
   and their browser calls `api.anthropic.com` directly — no server, no founder key, no
   proxy involved. The Actions-secret + CLI eval lane (`docs/claude-engine.md`) remains
   separately available for founder-triggered comparison runs whenever you want them.
- [x] **Watchdog — Claude-powered security/quality review, scheduled + findings-only** — a
   `claude-watchdog` GitHub Action runs weekly (Mondays) plus on demand, reviews recent
   commits + `npm audit` + the repo's own written laws + every security-sensitive file, and
   files structured findings + research ideas as a GitHub issue. Findings-only — a permanent
   design floor, not a stepping stone: an auto-fix-PR follow-on was built and then
   deliberately reverted after the platform's own safety tooling flagged unattended
   code-write-and-push (no human click between generation and a pushed branch) as a real
   risk boundary. See `docs/watchdog.md`.

**Blocked on you (needs a key / account / decision — I can scaffold the $0 parts, you flip the switch):**
- [x] **Delete the stray 'Workers Builds' check** — ✅ founder deleted the stray `kudbee-music`
   Worker (2026-07-02); the red check + ❌ bot comment are gone from all future pushes
   (verified live on the very next PR). The `wifi-dj-meme` Pages deploys are unaffected.
- [~] **Runway Gen-4 video** — **adapter shipped + live-tested** _(#83)_: `studio/runway.mjs`
   (`hermes runway --image <path> --prompt "..." --duration 5|10 --out <path>`) drives Runway's
   `image_to_video` (Gen-4 Turbo), polls the task, downloads the clip. Behind `RUNWAY_API_KEY`
   (`.env.local`, gitignored, never committed) — opt-in, key-gated, never the free core. Verified
   end-to-end with a real 10s clip animating `assets/hero-still.png` (the landing-page hero use
   case) on the founder's test-account key/credits. Remaining, founder-paced: wire clips into the
   actual landing page, animate the agent avatars into living characters, the **HERMES office/world**
   scenes. See `docs/runway-plan.md` for the phased rollout.
- [x] **Cool landing page** — interactive scroll-driven landing shipped at `/` _(#86)_, live at
   [wifi-dj-meme.pages.dev](https://wifi-dj-meme.pages.dev); the Runway hero video + Solana connect remain
   founder-gated upgrades (comment slots left in `components/landing/Landing.tsx`).
- [~] **Accounts / sign-in** — local-first identity layer shipped (guest + dev door + honest
   Google/GitHub slots, `docs/accounts.md`); what remains yours: pick a hosted-auth provider (or add
   Cloudflare Pages Functions) + register the OAuth apps so real Google/GitHub sign-in activates.
   Solana wallet connect (for the Board + dNFT) still needs the same auth/DB decision.
- [ ] **dNFT mint on-chain** (Solana/Metaplex) — the signature is $0-ready and the metadata now targets the
   real **Metaplex Token Metadata** standard _(#85, `docs/nft-standard.md`)_; minting is your call (devnet-first, never mainnet without your explicit approval).
- [ ] **Agent images → avatars** — wire the Grok-generated images onto each agent (once you generate them).
- [ ] **Lightning AI spike** — one Studio running a HERMES agent behind **HTTPS/SSL** as an opt-in provider (you connect SSL).
- [ ] **Discord server** (+ GitHub→Discord webhook) — channels/roles/listening parties; wire on your go-ahead.
- [ ] **Cloud brain** — server-side vault/memory (Notion/Drive/Supabase creds) so it's not localStorage-only.
- [ ] **Suno-Studio workspace** — section/arrangement timeline + rack + meter bridge ($0 read-only now; clip editing later).

**$0/local, no key — I can just build these next:**
- [x] **Deeper lyric craft** (the moat) — grammaticality shipped _(#58)_; imagery coherence shipped
   _(#60)_: theme/mood → imagery clusters (street/home/water/light/struggle/…) so backfill nouns match the
   subject. **Image-coherence scoring + verb/noun agreement** shipped _(this PR)_: a new
   `imageryCoherence()` eval metric measures whether a song's actual bank nouns share its top-ranked
   cluster (not just whether a theme keyword is mentioned somewhere); verbs now draw from a
   `VERB_CLUSTERS`-tagged pool biased toward those same clusters (falls back to the full list when
   too few verbs match, so variety never starves). Also fixed the noun/thread backfill itself — it
   was shuffling across every cluster before slicing, diluting the very bias imagery coherence
   depends on; picked/rest now shuffle separately so padding stays biased toward the top cluster(s).
   Demos regenerated; the golden eval is green on all 6 songs, including the new metric.
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
- [~] **Crossroads Stages 2–3** — Stage 2 shipped _(#116)_: a `/crossroads` board UI. Stage 3
   (decisions feed the taste model) is still queued.
- [x] **PNG share card has no UI trigger** — fixed _(this PR)_: a "🖼 Download card" button
   now sits in `SongPackageView` between Share and Explain, wired straight to the already-
   tested `downloadShareCard()`. Verified live: triggers a real ~700KB PNG download, gift
   framing included when the package qualifies, zero console errors.
- [~] **2026-07-02 code-review findings (Fable 5 review → Sonnet verification)** — weakness #1
   (share-reproduction integrity) fixed _(this PR)_. Still open, in fix order:
   - [x] **Weakness #2 — quota-honest vault writes** — fixed _(this PR)_: `saveSong` now
     returns `{ song, persisted }` (writeDurable reports whether the live write landed), the
     app shows an honest amber banner ("won't survive a reload — Export now") with an
     Open-Vault shortcut when persistence fails, and same-title version history is capped at
     5 so quota pressure stops growing unbounded. Playwright-verified with a throwing
     localStorage; 4 new tests incl. the quota-simulation path and the version cap.
   - [x] **Weakness #3 — short-form breaks non-AABB schemes** — fixed _(this PR)_: short-form
     now builds its 2-line unit directly (always a rhymed couplet via `layoutFor`'s 2-line
     rule) instead of slicing the 4-line scheme-arranged verse, built lazily inside the case
     so every other structure's RNG draw order stays byte-identical (demos unchanged).
     5 new tests prove the couplet rhymes under every scheme.
   - [x] **Improvement — determiner–noun number agreement** — fixed _(this PR)_: slot-level
     singularization in `fill()` (template context makes this/that unambiguous — a first-pass
     line-level regex was caught corrupting relative clauses like "the hook that lifts" before
     shipping and redesigned), + a `determiner agreement` metric in `eval.ts` (a/an/every —
     the always-determiners) so the golden set can see the defect class forever. Demos
     regenerated ("All this games" → "All this game").
   - [x] **Improvement — chorus variation + repetition budget** — fixed _(this PR)_: the
     final chorus of every arrangement evolves one repeat into a fresh second line (the
     engine's own uniqueness critique + the seeded Crossroads 'evolve' path, made real);
     every Hook section gets its own array copy (aliasing hazard closed); and a 7th golden
     metric, `repetition budget` (inverse share of the most-repeated content word,
     calibrated 0.83–0.90 on the golden set, threshold 0.8), watches song-wide repetition
     forever. Demos regenerated.
   - [x] **Improvement — cross-section diversity guard is dead code** — resolved _(this PR)_
     as an honest-comment fix: the `used` set dedupes frames WITHIN a section; cross-section
     variety comes from each section's goal-specific pool (setup/turn/reflect), which is the
     actual design — the comment now says so instead of overclaiming.
- [x] **2026-07-03 post-merge audit findings (agent audit of #116–#119)** — ALL FIXED
   _(this PR)_: short-form starvation (fresh `used` set for `shortV1` + a deeper pre-existing
   crash the new test exposed — `pick()` on an empty array returns undefined when banned
   words shrink a frame pool to 1 and the prevFrame exclusion empties it, reachable from the
   public doNotUse field; the exclusion now never empties a pool); `importVault` quota
   honesty (reports 0 when the write doesn't land) + version-cap on import; decided-crossing
   label resolution + `aria-pressed` on vote rows; `loadDemo` keeps the quota banner
   truthful; Share tooltip softened (personal avoid-words don't travel with a link);
   quota-reporting scope documented (songs only — albums/taste/votes are reconstructable
   soft state, deliberately best-effort); `castVote` comment reworded to describe real
   browser behavior.
- [ ] **2 review cleanups** — stronger memory-id hash · independent "earns-it" critique. _(the third —
   guaranteed vault mirror — is now surfaced in the Vault drawer with status + restore)_
- [x] **Star-launch kit** — `LAUNCH.md` shipped _(#43)_: pre-flight checklist + draft X thread + demo-recording script. Posting it stays yours (the pre-flight boxes in `LAUNCH.md` are your launch-day gate).

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
- [x] **Deeper lyric craft (next $0 pass)** — theme→imagery mapping shipped _(#60)_; verb/noun
   agreement + image-coherence scoring shipped _(this PR)_ — see the "Deeper lyric craft" entry above.

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
- [x] **`LAUNCH.md` kit** — star-launch checklist + draft Twitter/X thread + demo-recording
   script shipped _(#43)_; the pre-flight boxes inside it are the founder's launch-day gate.
- [ ] **Lightning AI spike** — per-agent compute for the opt-in "advance your model" tier
   (user signs up → their own agent). Best used as the **optional GPU lane**, not the
   backbone; base stays $0/local/serverless. Prereq: accounts + persistent vault (Phase 4).
   **Spike when SSL is connected:** one Lightning Studio running a single HERMES agent
   behind HTTPS, wired as an opt-in provider; compare vs Anthropic-API-direct + Modal/Replicate.
- [ ] **Per-track Suno structure hints** — `[Intro]`/`[Bridge]` pacing, stems, BPM/key
   tags in the Suno export (folds into Phase 5).
- [ ] **Docs site on GitHub Pages** — Astro Starlight.

## 💡 Backlog (unordered ideas)
- [ ] **Meter/stress + rap-flow parameters (pattern packs, part 2)** — the deep-research pass
      confirmed the pedagogy (iambic default, mutate the template not the word's natural
      stress) and the MCFlow rap-flow dials (speed, rhyme density, metric position of
      stresses/rhymes/phrases, phrase length), but HERMES's line templates aren't
      syllable-aware yet — needs new generation infra, not just a dial. See
      `docs/pattern-packs.md` → "Deliberately out of scope for this pass."
- [ ] **Repetition devices beyond anaphora** (epistrophe, call-and-response, list songs, POV
      shifts) — only anaphora survived the research's verification; the rest need their own
      sourcing before becoming a dial.
- [ ] **Scribe editor: drag-to-reorder lines + a per-section "rewrite this verse" AI action**
      (today: add/delete a line + per-line ✨ rewrite only — see `IDEAS.md`).
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
- [x] **🔎 Vault search/filter box (tiny-feature cadence, #15)** — a growing vault
      had no way to jump straight to a title without scrolling. A "Search by
      title…" input in `VaultDrawer.tsx` filters the visible list by
      case-insensitive substring match; shown only once the vault has more than 5
      songs (a small vault has nothing worth filtering). An honest "No songs
      match '{query}'" empty state distinguishes "nothing in the vault at all"
      from "nothing matches your search." Playwright-verified live: filled the
      vault to 6 songs (search box appeared), filtered by "gold" and got both
      matching titles, typed a non-matching query and saw the correct empty
      state, cleared it and got all 6 back, zero console errors. _(this PR)_
- [x] **🕐 Recently viewed strip in the Vault (tiny-feature cadence, #14)** — no
      quick way back to a song you had open a minute ago without scrolling/
      hunting the full list. New `storage.ts` `loadRecentlyViewed()`/
      `recordRecentlyViewed(id)` (newest-first, capped at 5, moves a re-viewed id
      back to the front instead of duplicating it — its own localStorage key,
      best-effort like favorites/notes). Recorded on every vault-open
      (`openFromVault` in `HermesHitFactory.tsx`); a "🕐 Recently viewed" chip strip
      renders above the main list in `VaultDrawer.tsx` — stale ids (a since-deleted
      song) are silently filtered, never shown as a broken chip. +4 tests.
      Descoped a dark/light theme toggle in the same round after checking
      `app/globals.css`: the app is fully dark-only with ~20 hardcoded color
      variables and no light-mode infrastructure at all — a real light theme is a
      design-system project, not a same-day tiny build. Playwright-verified the
      shipped feature live: strip absent with nothing viewed, opened a song from
      the vault list, reopened the drawer, confirmed the correct title chip
      appeared, zero console errors. _(this PR)_
- [x] **↺ Reset to defaults on Song Lab (tiny-feature cadence, #13)** — after
      trying Surprise Me / Load Example / a Pattern Pack, the only way back to a
      blank form was reloading the page. `SongLabForm.tsx`'s new `resetForm()`
      clears back to `DEFAULTS`; a "↺ Reset" button appears next to Surprise Me/
      Load Example — but only once the form is actually dirty (`isDirty`,
      comparing against `DEFAULTS`), so a fresh blank form never shows a button
      with nothing to do. Playwright-verified live: confirmed Reset is hidden on a
      blank form, loaded the example brief (Reset appeared), clicked it, watched
      every field clear and the button disappear again, zero console errors.
      _(this PR)_
- [x] **↩️ Undo a committed Lyric Lab step (tiny-feature cadence, #12)** — the
      Lyric Lab's step rail + "← Back" already let you revisit a step and commit a
      *different* answer (which just overwrites the log entry), but there was no
      way to clear a step back to uncommitted without immediately picking a
      replacement. `LyricLab.tsx`'s new `uncommit()` deletes the current step's log
      entry; an "Undo" button sits in the "✓ Committed" box. Safe by construction:
      taste-recording (`choiceSignals`) only runs once, in `finish()`, off the
      final `log` state — an undo mid-session never double-records or corrupts it.
      Playwright-verified live: committed step 1 (1/9 committed, box visible),
      clicked Undo, watched it revert to 0/9 with the box gone, zero console
      errors. _(this PR)_
- [x] **📄 Markdown export (tiny-feature cadence, #11)** — the only downloadable
      formats were full JSON (backup/re-import) or a Suno-specific prompt; nothing
      readable for Notion, GitHub, or a plain lyric sheet. New
      `lib/hermes/markdownExport.ts`'s `songMarkdown(pkg)`: title as H1, concept,
      creative brief, the chosen hook as a blockquote, every section as an H3 with
      its lines, production notes as a bullet list. Pure + deterministic. A new
      "⬇ Export Markdown" download button next to Export JSON. +5 tests.
      Playwright-verified live: downloaded the file for the demo song, confirmed
      the `.md` filename and every expected section header/content, zero console
      errors. _(this PR)_
- [x] **⎋ Escape-key close for Vault/Album drawers (tiny-feature cadence, #10)** —
      both overlays only closed via the "Close" button or clicking the scrim; a
      window-level Escape listener (same pattern as the Cmd/Ctrl+Enter shortcut)
      now closes each from the keyboard. Deliberately did **not** add this to the
      Lyric Lab — it has an in-progress free-write draft box, and Escape-to-close
      there risks silently discarding unsaved lyric input; that's a regression, not
      a delight. Playwright-verified live: Vault and Album both close on Escape;
      confirmed the Lyric Lab correctly stays open on Escape (the deliberate
      exclusion), zero console errors. _(this PR)_
- [x] **🎵 One-click Copy Suno prompt (tiny-feature cadence, #9)** — the Suno-ready
      prompt (style of music + tagged lyrics) was only reachable by opening
      "Explain this song" and finding it inside the full trace explorer.
      `SongPackageView` now has a direct "🎵 Copy Suno prompt" button next to Copy
      Lyrics/Export JSON, reusing `suno.ts`'s existing `sunoTrack()` — no new
      generation logic, just a shorter path to something the brain already builds.
      Playwright-verified live: clicked it, read the real clipboard back (title +
      "Style of Music:" + tagged `[Hook]` lyrics, 1209 chars for the demo song),
      button label swapped to "suno prompt copied ✓" and reverted, zero console
      errors. _(this PR)_
- [x] **⌨️ Cmd/Ctrl+Enter to generate (tiny-feature cadence, #8)** — submitting Song
      Lab required reaching for the mouse every time, even from mid-typing. A
      window-level keydown listener in `SongLabForm.tsx` now submits on Cmd/Ctrl+Enter
      from anywhere in the form (same "chat app" convention as Slack/Discord),
      respecting the same `briefReady` guard the button already uses so an
      incomplete brief can't be submitted. A discoverability hint appears once the
      brief is ready. Playwright-verified live: confirmed the shortcut does nothing
      on an empty brief, filled a brief via Surprise Me, focused the theme
      textarea (where plain Enter would insert a newline), pressed Ctrl+Enter, and
      watched a full generation run — Brain Scan + all 10 agents completed, zero
      console errors. _(this PR)_
- [x] **📝 Per-song vault notes (tiny-feature cadence, #7)** — a quick sticky note
      per stored song ("needs a bridge rewrite", "send to Marcus") — no way to leave
      yourself a reminder on a specific take before. New `storage.ts`
      `loadSongNotes()`/`setSongNote(id, text)`: a plain `Record<songId, string>` in
      its own localStorage key, best-effort like favorites/taste, capped at 280
      chars so a stray paste can't bloat the vault, blank text clears the entry.
      An inline text input per `VaultDrawer` row, saved on blur. +5 tests.
      Playwright-verified live: typed a note, blurred, reloaded the page, note was
      still there; confirmed clicking into the input doesn't trigger the row's
      "open this song" click handler, zero console errors. _(this PR)_
- [x] **📑 Duplicate this song — fork a vault entry (tiny-feature cadence, #6)** —
      no way to branch a version to try a wild edit without risking the one you
      already liked; `saveSong`'s version history only bumps in-place on a matching
      title. New `storage.ts` `duplicateSong(id)`: clones into a fully independent
      entry — new id, version 1, title suffixed "(copy)" (bumped to "(copy 2)",
      "(copy 3)"... if that title's taken, so repeated duplication never collides).
      A "duplicate" button next to delete on every `VaultDrawer` row. +3 tests.
      Playwright-verified live: duplicated "Cold Hard Gold" twice, got "(copy)" then
      "(copy 2)" as fully separate v1 entries, original untouched, zero console
      errors. _(this PR)_
- [x] **📏 Word/line/runtime counter (tiny-feature cadence, #5)** — the Final Lyrics
      label had no sense of how long the song actually is at a glance. A small
      counter next to the label now reads "183 words · 23 lines · ~2:00 (est.)" —
      word/line counts are exact, the runtime is an explicitly-labeled rough
      estimate (2 bars/line at the production tempo, a common songwriting rule of
      thumb, not a measurement — same honesty discipline as the humming-feature
      scope call earlier this session). Playwright-verified live against the demo
      song (183 words, 23 lines, ~2:00 at 92 BPM), zero console errors. _(this PR)_
- [x] **🎤 Click-a-word rhyme helper (tiny-feature cadence, #4)** — the read-only
      lyrics view had no way to check a word's rhyme options without leaving the
      page. Every word in `SongPackageView`'s Final Lyrics block is now clickable
      (a subtle dotted underline), surfacing `lexicon.ts`'s existing `rhymesWith()`
      — already built for generation, never exposed to the writer directly — in a
      small "Rhymes with '<word>'" row at the bottom, with an honest "nothing in
      the lexicon rhymes with that" fallback. Reference only: never edits the
      lyric. Playwright-verified live: clicked "mind" in the demo song, got
      grind/find/blind/kind/behind back, closed the panel cleanly, zero console
      errors. _(this PR)_
- [x] **⭐ Vault favorites — pin your best takes (tiny-feature cadence, #3)** — the
      Vault list had no way to mark a song as a keeper; a growing catalog buries the
      songs you actually love under whatever generated most recently. New
      `storage.ts` functions `loadFavorites()`/`toggleFavorite()` (a plain song-id
      `Set`, its own localStorage key — best-effort like taste/alias, no bearing on
      generation or `SongPackage`'s shape). `VaultDrawer.tsx` gets a ☆/⭐ toggle per
      row and sorts favorites to the top (stable sort — un-favorited songs keep their
      original newest-first order). +3 tests in `storage.test.ts`. Playwright-verified
      live: favorited the second-listed song, watched it jump to the top with a solid
      ⭐, toggled it back, zero console errors. _(this PR)_
- [x] **📋 Copy lyrics — plain-text copy button (tiny-feature cadence, #2)** — the only
      ways to get lyrics out of a package were the full JSON export or copying one
      short-form clip caption at a time; there was no single "just give me the
      words" action. `SongPackageView`'s existing `rawLyrics` (section labels + lines)
      is now one click via a "📋 Copy lyrics" button next to Explain/Export, with the
      same copied-confirmation pattern already used elsewhere in the file. Playwright-
      verified live: clicked, clipboard held the full lyrics text (`[Hook]` present,
      965 chars for the demo song), button label swapped to "lyrics copied ✓" within
      ~100ms and reverted after ~1.6s, zero console errors. _(this PR)_
- [x] **🎲 Surprise me — a varied starter-brief pool for Song Lab** *(tiny-feature
      cadence — "keep coming up with new little features... that amplify one little
      area")* — `SongLabForm.tsx`'s `loadExample()` only ever loaded the one fixed
      `EXAMPLE_BRIEF`, so a returning visitor who'd already tried it saw nothing new.
      New `STARTER_BRIEFS` pool (6 varied genre/mood/structure/rhyme-scheme combos —
      indie pop, country, alt R&B, pop-rock, lo-fi soul, plus the original trap
      example) and a "🎲 Surprise me" button beside it that picks a different one than
      whatever's currently loaded (never a same-brief no-op click). Pure UI
      convenience, no pipeline/determinism impact. Playwright-verified: 8 clicks
      surfaced 5 of 6 distinct briefs, every field (mood/genre/tempo/voice/audience/
      references/structure/rhyme) filled correctly, zero console errors. _(this PR)_
- [x] **Voice Notes — record & attach your own take (Bring Your Own Sound, PR1)**
      *(founder idea — "people should be able to record their voice... hum a melody...
      updating our brain mechanism")* — first slice of a bigger plan (full writeup in
      IDEAS.md): record a quick mic take with `MediaRecorder`, play it back, delete it,
      all attached to the song. New `lib/hermes/audioVault.ts` stores clips in
      IndexedDB — binary audio doesn't fit the localStorage JSON vault's ~5-10MB budget
      — with an in-memory fallback (SSR/tests/unsupported browsers) mirroring
      `storage.ts`'s `kv()` pattern; zero new npm deps, both APIs are browser
      built-ins. Deliberately a pure attachment with **no effect on generation** —
      the determinism contract only has to hold for the deterministic pipeline, and
      an attached voice clip isn't part of it. Caps: 8MB/clip, 6 clips/song.
      Playwright-verified live with a fake mic device: record → stop → save → list →
      play → delete, all working, zero console errors. PR2 (instrument riff clips)
      and PR3 (the actual "hum shapes the lyric's rhythm" brain wiring) are queued —
      see IDEAS.md for the full phased plan. _(this PR)_
- [x] **The Council, PR1 — your learned taste as a 4th voice** — first build step of the
      Council-improvement plan (a research agent audited the existing `council.ts` +
      `Council.tsx` and found the board's ranking used only 3 voices — challenge/reward/
      confidence — with zero connection to the artist's own learned `Taste` vault, even
      though `becomingYou.ts`'s `voiceMirror` already scores whole songs against it).
      `council.ts`'s new `voiceFit(hookText, taste)` scores a single hook against
      liked/disliked word tallies (neutral 50 with no signal, same idiom as
      `voiceMirror`); `rankHooksByCouncil()` takes an optional 4th `taste` argument that
      only activates once the artist has real edit history (`taste.edits > 0`) —
      re-normalizing the weights to challenge 40 / crave 30 / confidence 15 / your voice
      15. With no taste, or a fresh vault with zero edits, the ranking is byte-identical
      to the 3-voice baseline (verified in tests). `Council.tsx` shows a 🎙 chip per hook
      and the caption's weight breakdown flexes to match. Playwright-verified both states
      live: no taste → 3-voice caption, no chips; taste with edit history → 4-voice
      caption + a 🎙 50 chip on every ranked hook. _(this PR)_
- [x] **Memory-vault head pages (`brain/README.md` + `docs/index.md`)** — founder directive:
      every memory-layer folder needs a "chapter index" page, and every file its own
      organizing note. `brain/README.md` now indexes all 12 files in `brain/` (what it is,
      who reads it, status) grouped into song-brain memory / design manifesto / video-studio
      artifacts. `docs/index.md` was stale (listed 4 of ~20 docs, video-studio only, no
      song-brain docs at all) — rewritten to route to everything, split Hit Factory vs Video
      Studio vs reference. The three `brain/*.json` files missing a top-level `"note"` field
      (`beliefs.json`, `brain.json`, `roadmap.json`) got one, matching the pattern
      `crossroads.json`/`memory.json`/`personas.json` already used. New guard test
      (`memoryIndexes.test.ts`) fails CI if either index falls out of sync with its folder's
      real contents — same discipline `claudeMd.test.ts` already holds CLAUDE.md to.
      CLAUDE.md's memory-layers table now points to both head pages first. _(this PR)_
- [x] **PNG share card — wired the download button (roadmap 5.9 follow-up)** — the Song
      Gifts phase-2 PR made `shareCard.ts`'s `renderShareCard`/`downloadShareCard` gift-aware
      but surfaced that neither was ever called from any component — a visitor had no way to
      download the card at all. Fixed: a "🖼 Download card" button in `SongPackageView`,
      between Share and Explain, with busy/error states (`cardState`). Verified live with
      Playwright: triggers a real PNG download (~700KB), correct filename, gift framing shows
      when the package qualifies (occasion + dedicated name), zero console errors. _(this PR)_
- [x] **Song Gifts — gift-framed share link, PNG card, and OG unfurl (roadmap 5.9, Song
      Gifts phase 2)** — completes the pitch from 5.8. Every existing share surface becomes
      gift-aware whenever a package carries an Occasion Pack + a dedicated audience name —
      deliberately no NEW surfaces, just the existing ones telling the truth about what a
      gift link is. `shareLink.ts`'s new `giftMessage()` turns the clipboard text into a
      one-line message ("🎄 A Christmas song for Mom — open it to watch the brain write it:
      <url>") instead of a bare URL; `SongPackageView`'s Share button becomes "🎄 Share the
      gift" and copies that message; opening a gift link shows a themed "gift reveal" banner
      (`HermesHitFactory`) before the brain scan runs. The downloadable PNG card
      (`shareCard.ts`'s new `giftEyebrow()`) and the env-gated OG unfurl
      (`functions/_lib/ogCard.ts`, still `OG_UNFURL=1`-gated + inert by default) both swap
      their eyebrow/title/description to the gift framing, so a shared gift link previews
      correctly in iMessage/Slack/Discord once the founder activates unfurl. ~30 new tests
      across `shareCard`/`shareLink`/`ogFunction`. Playwright-verified live end to end:
      generated a Christmas gift for "Mom," copied the gift message, opened it fresh, watched
      the reveal banner render — zero console errors on either side. _(this PR)_
- [x] **Occasion Packs — holiday/life-moment lexicon + dedication (roadmap 5.8, Song Gifts
      phase 1)** — the founder's holiday-song-pack idea, generalized to 8 life moments
      (Christmas, Valentine's, Mother's/Father's Day, Birthday, Anniversary, Graduation, New
      Year) and paired with the sell pitched alongside it: **Song Gifts** — a song written
      FOR someone, delivered as the existing deterministic share link. This PR ships the
      engine half. `brain/occasionPacks.json` + `lib/hermes/occasionPacks.ts`: each pack is a
      mood/genre/structure/rhymeScheme preset PLUS genuinely new imagery vocabulary
      (stocking, mistletoe, diploma, tassel…) that mood/genre/references text alone can't
      express — so `occasion` is its own `SongInputs` field (unlike pattern packs, which just
      recombine existing dials), validated at all three untrusted-input boundaries (pipeline
      normalize, share decode, vault import) with the exact `rhymeScheme` discipline from the
      review. The mock provider biases noun slots toward the pack's vocabulary and swaps the
      Intro line for the pack's dedication frame ("Merry Christmas, {who}") when set.
      SongLabForm gets an Occasion picker that relabels Audience to "Dedicated to (name)".
      **Surfaced and fixed a real pre-existing bug along the way**: third-person pronouns
      (she/he/they/our…) were in neither the keyword-extraction stopword list nor the
      noun-slot exclusion list, so a natural dedication theme ("everything she gave") leaked
      "she"/"our" into noun slots ("through the she") — caught by testing the feature's own
      flagship use case (a Mother's Day dedication) before shipping, fixed at both layers.
      +23 new tests across occasionPacks.test.ts and the pronoun regression in text.test.ts.
      Demos regenerated (a legitimate noun-pool dedup fix shifted hometown-ghosts; golden eval
      stays 6/6 PASS). Song Gifts phase 2 (a dedicated gifting flow + gift-framed share/OG
      card) captured in IDEAS.md, queued next. _(this PR)_
- [x] **Final-chorus lift + repetition budget (review improvements #2 + #3)** — the hook
      line repeated 9–15× per song with zero variation, every Hook section shared one array
      reference (latent aliasing), and nothing measured song-wide repetition. Now: the LAST
      chorus of every arrangement evolves one repeat into a fresh second line (hook stays
      the anchor, 3 of 4 lines, per the AABA return-to-A convention — and it's literally the
      seeded Crossroads "repeat vs evolve" question's evolve path made real); every Hook
      section owns its lines array; `eval.ts` gains a 7th metric, `repetition budget`
      (1 − max content-word share, calibrated 0.83–0.90 across the golden set, threshold
      0.8). The dead cross-section diversity guard got an honest-comment fix (#3): `used`
      dedupes within a section; variety across sections comes from the goal-specific pools.
      Demos regenerated — completes all three improvements from the 2026-07-02 review. _(this PR)_
- [x] **Post-merge audit fixes for #116–#119 (8 findings + 1 deeper crash)** — a review agent
      audited the day's four merged PRs; every finding fixed the same session (never-skip-
      silently). Mediums: short-form's couplet no longer shares a frame-`used` set with the
      discarded 4-line verse (starvation), `importVault` now reports honest counts under
      quota failure and holds imports to the 5-version cap, decided Crossroads crossings
      render the option label (not the raw id). The starvation regression test then exposed a
      deeper PRE-EXISTING crash: `pick()` on an empty array returns undefined when banned
      words shrink a section's frame pool to one and the prevFrame exclusion empties it —
      reachable from the public doNotUse form field; the exclusion now never empties a pool
      (repeating a frame with different slot words beats crashing). Lows: loadDemo keeps the
      quota banner truthful, Share tooltip softened (personal avoid-words don't travel),
      quota-reporting scope documented (songs only, deliberately), castVote comment fixed,
      aria-pressed on vote rows. +4 tests. _(this PR)_
- [x] **Determiner–noun number agreement + eval grammar metric (review improvement #1)** —
      "All this winters, I earned it slow" and "Took that records and turned it to an art"
      shipped in the flagship demo because frames like `all this {noun}` slot arbitrary theme
      nouns after singular determiners and no metric could see it. Fixed at the SLOT level in
      `fill()` — when a template puts a noun slot right after a/an/this/that/every, a plural
      theme word is singularized (`singularizeIfPlural`, conservative heuristic + exception
      list); the determiner is kept (not flexed) so downstream singular pronouns stay correct
      ("took that record and turned IT to an art"). A first-pass line-level regex was caught
      corrupting relative clauses ("the hook that lifts" → "that lift") during verification
      and redesigned — template context is what makes this/that unambiguous. Plus a 6th golden
      metric, `determiner agreement` (a/an/every only — what free text can prove), so the
      class is measured forever. Demos regenerated (paper-crowns "games"→"game"); noun
      consumption order unchanged so everything else is byte-identical. _(this PR)_
- [x] **Quota-honest vault writes + version-history cap (review weakness #2)** — on a full
      localStorage, `writeDurable` swallowed the `setItem` failure, `saveSong` still returned
      a "stored" package, and the UI rendered a song that silently vanished on reload — the
      exact data loss the backup-mirror design exists to prevent, with zero user-facing
      signal. Now: `writeDurable` reports whether the live write landed, `saveSong` returns
      `{ song, persisted }`, and the studio shows an honest amber banner ("your song is on
      screen but won't survive a reload — Export now") with an Open-Vault shortcut whenever
      persistence fails. Also caps same-title version history at 5 (`pruneVersionHistory`) —
      regenerating one title forever grew the vault unbounded, with every list mirrored so
      quota pressure doubled. 4 new tests (simulated quota via `__simulateVaultQuota`,
      version cap, cross-title isolation); Playwright-verified with a throwing localStorage:
      banner appears after generate, Vault reads 0 (honesty warranted), dismiss works, zero
      page errors. Completes all three confirmed weaknesses from the 2026-07-02 review. _(this PR)_
- [x] **Short-form × rhyme-scheme fix (review weakness #3)** — `short-form` used to return
      `v1.slice(0, 2)` off the 4-line scheme-arranged verse; under ABAB/ABBA/XAXA those two
      lines belong to different rhyme families, so the shipped "couplet" didn't rhyme (both
      dials freely selectable in the Song Lab). Now builds a dedicated 2-line unit — always a
      rhymed couplet per `layoutFor`'s 2-line rule — lazily inside the short-form case so
      every other structure's RNG draw order (and all demos) stays byte-identical. 6 new
      tests: the couplet rhymes under all 5 schemes + determinism pin. _(this PR)_
- [x] **Share-reproduction integrity (review weakness #1)** — a two-agent + focused-verification
      code review (Fable 5 pass → Sonnet adversarial verification, 12 candidate findings, 2
      refuted) confirmed the viral-loop promise was silently broken two ways: (1)
      `shareLink.ts`'s sanitizer whitelist-rebuilt inputs and **dropped `rhymeScheme`**, so any
      pattern-pack song (ABAB/ABBA/AAAA/XAXA) reproduced as AABB — different lyrics for the
      recipient; (2) the hand-authored example song has no `seed`, so its "🔗 Share" encoded
      `seed ?? 0` and reproduced a completely different song than the one on screen (verified
      empirically). Fixed: `RHYME_SCHEME_IDS` in `types.ts` is now the canonical runtime enum,
      validated at **all three** untrusted-input boundaries — `pipeline.ts` `normalizeInputs`
      (an out-of-enum string used to crash the combinator's scheme-layout lookup with a
      TypeError; now dropped → AABB default), `shareLink.ts` decode (preserved when valid),
      and `storage.ts` vault import (preserved when valid, so 🔍 Explain replays imported
      pattern-pack songs with their real scheme). The Share button now renders only when the
      package carries its real generation seed — the seedless demo song shows Explain/Export
      but no false reproduction promise. +5 tests: ABAB share round-trip byte-identical,
      hostile-scheme crash regression, import preservation. Playwright-verified live: demo
      hides Share, a generated song shows it, zero page errors. _(this PR)_
- [x] **Crossroads Board — Stage 2 (the board UI)** — Stage 1 (`brain/crossroads.json` +
      `lib/hermes/crossroads.ts`, #44) shipped the pure decision model with nowhere to see or
      vote on it. This PR adds the board itself: a `/crossroads` route (`components/hermes/
      CrossroadsBoard.tsx`) rendering every seeded crossing — question, ranked options with
      rationale + a vote bar, and a front-runner readout. Clicking an option casts (or
      changes) this browser's own vote, persisted to `localStorage` only
      (`lib/hermes/crossroadsStorage.ts`, same BYOK-key idiom as `claudeKey.ts`) — no
      account, no server. Deliberately honest about scope: the tally shown is the seeded
      base plus THIS browser's one vote, not a real community headcount — that's stage 4
      (community sync via API), still out of the free local core. A new
      `lib/hermes/crossroadsBoard.ts` keeps the seed-plus-vote combine logic pure and
      testable (10 new tests total across the two new modules). Linked from the Hit
      Factory header ("🧭 Crossroads"). `/crossroads` added to the mobile device-matrix
      (18/18 clean) and screenshot-verified: vote/re-vote, highlight + front-runner update,
      and persistence across reload, at desktop and iPhone SE widths. Stage 3 (board
      decisions feeding the taste/memory model) stays queued. _(this PR)_
- [x] **Watchdog — Claude-powered security/quality review, scheduled + findings-only
      (roadmap 5.7)** — "an agent... consistently monitoring the system, finding weaknesses,
      also finding ways to improve the system through research... deploy its own developer
      agent, security code review... run on a dynamic type loop through the Claude API."
      Shipped in two passes, both in this PR. **Pass 1**: a Claude review over a bounded,
      curated context — the last 20 commits, `npm audit`, `CLAUDE.md`/`SECURITY.md` in full,
      and every security-sensitive file (`claudeKey.ts`, `claudeLyricsProvider.ts`,
      `shareLink.ts`, `storage.ts`, `identity.ts`, every `.github/workflows/*.yml`) — producing
      structured findings (severity, file, summary, suggested fix, confidence) + research
      ideas, filed as a GitHub issue labeled `watchdog-report`. New
      `.github/workflows/claude-watchdog.yml`, `contents: read` + `issues: write`.
      **Pass 2** (a `/goal` follow-up after the founder flagged Pass 1 as incomplete against
      the original ask): built `scripts/watchdog-fix.mjs`, an auto-fix-PR follow-on — pick a
      low-severity/high-confidence finding, draft a one-file Claude patch, validate it against
      the full local gate suite, auto-commit + push + open a **draft** PR. The platform's own
      auto-mode safety classifier **blocked wiring this live**: an unattended agent writing and
      pushing code with no human-approval step between generation and a pushed branch, gated
      only by automated tests, is a real risk boundary. Given the choice (asked via
      `AskUserQuestion`), the founder chose to **drop the auto-fix-PR piece entirely** (deleted
      `watchdog-fix.mjs`) and instead add a `schedule:` trigger (weekly, Mondays) for genuine
      unattended monitoring — safe specifically because the workflow's permission ceiling stays
      `issues: write`, never `contents: write`, so an unattended run can spend money but is
      structurally incapable of altering the repo. `SECURITY.md`/`CLAUDE.md` rewritten:
      `workflow_dispatch`-only is the default; `schedule:` is a named, one-at-a-time exception
      gated on the workflow being unable to write code — not a general permission. Findings-only
      is now stated as a **permanent design floor**, not a v1 gap. `renderReport()` stays pure
      and unit-tested (`test/watchdog.test.mjs`, 3 tests, zero network). See `docs/watchdog.md`
      for the full before/after reasoning.
- [x] **Pattern packs — lyric structure + rhyme-scheme variety (roadmap 5.6)** — "the lyrics
      are all coming out very similar in regards to pattern... people should be able to
      choose more instead of being so limited." Grounded in a `/deep-research` pass (104
      agents, 22 sources, 9 verified findings). Two real gaps in `mockLyricsProvider.ts`
      fixed: (1) rhyme generation was hard-coded to sequential AABB couplets —
      `buildRhymedVerse()` now takes a `rhymeScheme` dial (`SongInputs.rhymeScheme`:
      AABB/ABAB/ABBA/AAAA/XAXA) via a family-per-line layout, reusing `rhyme.ts`'s already
      generic `rhymeFamily(n)` hook; `lib/hermes/__tests__/patternPacks.test.ts` proves it
      two ways — same seed reproduces byte-identical lyrics, and the **existing** scoring-side
      `rhymeScheme()` detector independently confirms each generated verse reads back as the
      exact scheme requested. (2) the "Full song" structure option was a silent duplicate of
      "hook-first" (same `default` switch case) — now rides out on a repeated final Hook
      instead, in the spirit of the verified AABA convention ("no new lyrics after the first
      cycle" — Open Music Theory / Summach, MTO 17.3). `brain/patternPacks.json` →
      `lib/hermes/patternPacks.ts` bundles structure + rhymeScheme into named presets (AABA
      Classic, Ballad/XAXA, Verse-Chorus Alternating/ABAB, Monorhyme Chant, Enclosed/ABBA,
      Strophic-lean), each with an honest `sourceNote` distinguishing verified findings from
      the rhyme-scheme dial itself (offered as a general, well-established poetic device —
      genre-to-scheme mapping did NOT survive the research's verification, so no pack
      overclaims a genre affinity for its scheme). New Song Lab "Pattern pack" quick-apply
      dropdown plus a standalone "Rhyme scheme" dial — pattern packs aren't their own
      `SongInputs` field, they just set `structure` + `rhymeScheme` together, so the brief
      stays the single source of truth for generation. Default behavior (rhymeScheme unset)
      is byte-identical-scheme to before (still AABB); demos regenerated
      (`GEN_DEMOS=1 npx vitest run trace`) since the RNG draw order changed under the hood.
      Deferred for a follow-up: meter/stress and rap-flow parameters (no syllable-aware
      generation infra yet) — see `docs/pattern-packs.md` → "Deliberately out of scope." _(this PR)_
- [x] **Scribe line editor + Rack "Test key" verification (roadmap 5.5)** — "make sure Claude
      API is working, people should be able to edit their lyrics almost like the application
      Scribe." `components/hermes/ScribeEditor.tsx` replaces the single-textarea lyric edit
      with a per-line editor: each line is its own field with **+** (add line below), **×**
      (delete line), and **✨** (ask the Claude Engine for 3 in-context alternate phrasings of
      just that line, via the new `suggestLineRewrites()`) — click a suggestion to apply it.
      Without the Claude Engine unlocked the ✨ button shows an honest unlock hint instead of
      silently doing nothing. The old single-textarea editor stays one tap away ("edit as raw
      text") for power-user paste workflows; both save through the same new
      `renderSections()` (`lib/hermes/edits.ts`, the exact inverse of `parseSections`, tested
      round-trip) → learn-from-edits path, so taste-learning behaves identically either way.
      Separately, the Rack gained a **🔌 Test key** button: an explicit, opt-in, real minimal
      round-trip against `api.anthropic.com` (`testClaudeKey()`, 16 max_tokens) so a visitor
      can directly confirm their pasted key works before generating a full song with it —
      reports `✓ Claude API is working` or the exact typed failure. `claudeLyricsProvider.ts`
      refactored to a shared `callClaudeMessages()` helper so generation, line rewrites, and
      the key test all resolve the key/CORS header/error typing one way. Verified live with
      Playwright: locked-hint popover on ✨ before unlock, line edit/add, raw-text round trip,
      "brain learned from your edit" banner, and Test key failing gracefully (bad key) without
      crashing the panel. See `docs/claude-engine.md`. _(this PR)_
- [x] **Claude Engine BYOK panel (roadmap 5.4)** — the Engine Rack's Claude Engine slot is
      now interactive, not just a locked display box: click "Enter your Anthropic key," it's
      stored in this browser's `localStorage` only (`lib/hermes/claudeKey.ts`,
      `hermes.claudeKey.v1` / `hermes.claudeEngineActive.v1`), then "Turn on/off" flips it as
      the active lyrics provider for this visitor's own generations — calls go straight from
      their browser to `api.anthropic.com` (the `anthropic-dangerous-direct-browser-access`
      header, Anthropic's sanctioned BYOK opt-in) with no server or founder key involved
      anywhere. `HermesHitFactory.tsx` swaps the lyrics provider only when
      `claudeEngineReady()`; a reproduced/shared song always ignores it (byte-identical for
      every viewer); any Claude failure falls back to the free Local Combinator with an
      honest on-screen notice, never leaving generation stuck. `claudeLyricsProvider.ts`'s
      old "never imported by app/components" bundle rule is intentionally relaxed for this
      opt-in path (still zero founder-key access from the browser bundle). Verified live with
      Playwright: unlock → active → persists across reload → forget key relocks. Docs +
      security laws updated (`docs/claude-engine.md`, `SECURITY.md`, `CLAUDE.md`) to name the
      BYOK-browser key location as a third, distinct approved key location. _(this PR)_
- [x] **Status Board — never-stale checklists** — status now lives ONLY in `brain/roadmap.json`
      (video-studio backlog folded in as `videoStudioTrack`; phase-0/4 lags fixed); `STATUS.md`
      + STATUS-marker blocks in CLAUDE.md/README/BUILD_LOG are GENERATED from the spine
      (`lib/hermes/statusBoard.ts`, regen `GEN_DOCS=1 npx vitest run status`);
      `statusBoard.test.ts` fails CI on any drift, bans unchecked `- [ ]` boxes outside the
      allowlist, and the wiring/personas generated docs got the drift assertion they were
      missing. Founder's rotted-checklist screenshot can never happen again
- [x] **Deep Brain Atlas — 37 subregions, the real bread and butter** — every hub region now
      fans out into anatomy-named subsections (Broca’s & Wernicke’s areas, temporal lexicon,
      amygdala + insula, ACC + corpus callosum, VTA + OFC, hippocampus + basal ganglia +
      procedural memory…), each honestly mapped to a real module + function
      (`SUBREGIONS` in `brainMap.ts`). Tap a region in the Brain Scan → its constellation
      fans out (screenshot-style); the trace explorer shows per-subsection notes computed
      from the song itself; `docs/brain-wiring.md` gains the full atlas tables; the two
      node-only lanes render dim + honest ("CLI lane"). 8 new integrity tests incl. a
      byte-identical determinism proof for the sub-notes
- [x] **CLAUDE.md memory spine** — the repo's saved conventions in one root file: iron laws
      (determinism contract, $0-core, original-only), the full gate list, the green-loop
      working agreement, the security rules learned the hard way (key hygiene, dev-door gate,
      hostile-input sanitizing, OG activation gate), deploy/phone-testing facts, and a routing
      table to every memory layer (brain/*.json, living-state files, localStorage keys, docs).
      Guarded by `lib/hermes/__tests__/claudeMd.test.ts` — the spine fails the suite if a
      route rots. Maintenance rule embedded: repeat an instruction twice → save it here
- [x] **Mobile foundation — device intelligence + PWA + phone-testing workflow** — the app
      recognizes what phone/browser it's on and adjusts: `lib/hermes/device.ts` (pure, 22-test
      classifier: UA + capabilities → phone/tablet/desktop, perf class → animation level, single
      column, compact brain, ≥44px touch targets, bottom sheets, light media) + an SSR-safe
      `useDevice()` hook that re-adjusts on rotation. PWA manifest + brand icons → "Add to Home
      Screen" opens the studio standalone. `scripts/mobile-matrix.mjs` walks iPhone SE/14 Pro,
      Galaxy S9+, Pixel 7, iPad Mini across `/` and `/hermes` and fails on console errors,
      overflow, or sub-40px tap targets (12/12 clean). Phone workflow: every branch previews at
      `<branch>.wifi-dj-meme.pages.dev` — thumb-test on a real phone before merging
      (`docs/mobile.md`). _(#104)_
- [x] **Adaptive UI wiring — "it adjusts"** — `useDevice()` now drives the app: the studio shell
      carries `data-touch` / `data-form` / `data-anim` so CSS keys CAPABILITY-driven rules (44px
      touch targets + 16px inputs on any touch device at any width — a landscape phone at 852px
      no longer misses them; low-end/Data-Saver devices lose the stacked backdrop blurs), and the
      landing treats Data Saver / low-end (`ui.lightMedia`) like reduced motion for MEDIA: poster
      hero, no scrub runway, ambient loops paused — copy and layout identical. DOM-verified under
      iPhone vs desktop emulation; 12/12 device-matrix clean. _(this PR)_
- [x] **HERMES Live #3 — downloadable PNG share card** — `⬇ Share card` renders the song's brain
      trace to a deterministic 1200×630 canvas PNG (heat-map, lead hook, banger score + verdict,
      the "$0 · no API key · deterministic" receipt) fully client-side; the screenshot you post
      next to the share link. Playwright-verified real download, zero console errors. _(#103)_
- [x] **HERMES Live #2 — inline landing playground** — the landing IS the product: type one line,
      pick a genre chip, and the REAL brain (all 10 agents, client-side) generates above the fold —
      live BrainScan replay → lead hook + banger score → "🔗 Share this" + "Open in the full
      studio →". Byte-identical reproduce proof in tests; Playwright fresh-context verification.
      `/` First-Load 102→134 kB (ships the engine — intended for the flagship interaction). _(#102)_
- [x] **HERMES Live #1 — deterministic share permalinks (the viral loop)** — every song gets a
      `/hermes?s=<token>` link that REPRODUCES the byte-identical song for anyone who opens it
      (inputs + seed in a sanitized base64url token; hostile tokens neutralized, never throw).
      "Here's the song my brain wrote — click to watch it think." $0, static, no server. _(#101)_
- [x] **Dev-door is no longer a production backdoor** — `?dev=1` "Developer entry" now exists
      only on dev/local builds (`isDevBuild()`: `NODE_ENV!=='production'`, or an explicit
      `NEXT_PUBLIC_DEV_DOOR=1` opt-in for a chosen hosted preview). On the live Cloudflare
      export the door is compiled out — `?dev=1` is inert, and a stale `hermes.devDoor.v1`
      flag can't reopen it. Runtime-verified against the production build (welcome gate shows,
      no Developer entry); 3 new tests pin prod-off/dev-on/flag-opt-in. _(this PR)_
- [x] **Onboarding / identity layer + blank-first Song Lab** — new visitors now land on a
      **Welcome gate** (`components/auth/WelcomeGate.tsx`), not a pre-filled form: the Song Lab
      opens **empty** (no more "Out the Mud"/Chicago preloaded words) with a one-click
      "✨ Load an example brief" and Generate gated until title+theme+genre are set. Accounts are
      **local-first** (`lib/hermes/identity.ts`, `hermes.profile.v1`): "Continue as guest" now,
      **Google / GitHub sign-in slots** that light up honestly the moment OAuth creds are provided
      (no fake buttons — real token exchange needs the founder's provider decision, see
      `docs/accounts.md`), and a **developer entry** (`/hermes?dev=1` → a quiet "Developer entry →"
      that signs in instantly and sticks, so testing never needs a login). Sign-out keeps the vault.
      _(this PR)_
- [x] **Adversarial-input hardening (break-proofing for public traffic)** — attacked the app the
      way a hostile visitor would and fixed everything that broke: `importVault` now sanitizes
      every song/album (allowlist rebuild, required id+title, `__proto__`/`constructor` keys
      stripped, dupes dropped, honest accepted-counts — hostile files can no longer crash the
      deck); pipeline inputs are normalized (BPM clamped to 40–260, NaN-proof, free-text soft-cap
      2000 chars); the generation **seed is persisted on the package** so 🔍 Explain replays the
      real run (was hardcoded 0); XSS through the trace explorer, regex metachars in avoid-words,
      and path traversal in `from-song` were attacked, HELD, and are now pinned by tests
      (+28 vitest, +1 node → 283 | 16). Plus: CI `concurrency` dedup and `metadataBase`. _(this PR)_
- [x] **Claude Engine groundwork (roadmap 5.1) — opt-in real-AI provider + eval-comparison lane** —
      `lib/hermes/providers/claudeLyricsProvider.ts` implements the `LyricsProvider` seam against the
      Anthropic Messages API (structured JSON output, hard avoid-list in the prompt, typed errors,
      key resolved only at call time from `ANTHROPIC_API_KEY`); `lib/hermes/evalCompare.ts` + a
      gated vitest lane (`npm run eval:compare`) score combinator vs. real-AI on the golden briefs
      with the existing metrics. **Mock stays the default everywhere**; nothing client-side imports
      the provider; the runner hard-skips unless `RUN_LIVE_EVAL=1` AND a key are set — zero live
      calls were made and the live comparison run is the founder's trigger
      (`RUN_LIVE_EVAL=1 ANTHROPIC_API_KEY=... npm run eval:compare`). See `docs/claude-engine.md`. _(this PR)_
- [x] **Vault backup status + guarded restore in the UI** — the shipped-but-unsurfaced
      durability APIs (`vaultBackupStatus()` / `restoreFromBackup()`, #56) now show in the
      Vault drawer: a `🛟 backup mirror: N songs` status line, an amber warning when the live
      vault is behind its mirror, and a confirm-guarded "Restore from backup" that reports
      real counts and refreshes the list (assistant-not-autopilot: cancelable, honest no-op
      when no mirror exists). Verified with Playwright at 1280/375 incl. a live corrupt-vault
      restore; zero console errors. _(this PR)_
- [x] **Interactive scrolling landing page** — `/` is now a real scroll-driven landing
      (`components/landing/`): a scroll-scrubbed hero over the repo's own hero clips (honest
      loading — poster until ready, no spinners), "right proposes · left disposes" hemispheres
      driven by the real `AGENT_DEFINITIONS`, the real demo-song proof table, lazy video-studio
      GIF strip, CTA into `/hermes`. Mobile-first on the two standard breakpoints, full
      reduced-motion fallback, zero new deps; verified at 375/768/1280 + reduced-motion with
      zero console errors. Live on Cloudflare Pages. _(#86)_
- [x] **dNFT metadata → Metaplex Token Metadata** — the audit found `toNftMetadata()` emitted
      an ERC-721 shape while every living-state source targets Solana/Metaplex. Now emits the
      Metaplex off-chain JSON standard (32-char name clamp, symbol, `properties.files`,
      `seller_fee_basis_points: 0`), same six traits, still pure/deterministic/no-chain.
      Decision record + mint blocker note in `docs/nft-standard.md`. _(#85)_
- [x] **Security/public-readiness hardening** — four-point adversarial audit before going
      public (paid-API abuse surface: clean; fork-PR CI secrets isolation: clean; full-history
      secret scan: clean; brain/*.json write-protection: needs branch protection — founder
      toggle). Shipped `SECURITY.md` (threat model, reporting, paid-provider deployment rules)
      + a least-privilege `permissions: contents: read` CI token. _(#84)_
- [x] **Auto-exclude on the 2nd cut + proactive cliché seeding (the moat)** — closes the
      remaining "learn from edits" gaps a repeated round of artist feedback surfaced.
      (1) A word cut twice in the lyric editor is now auto-added to the avoid list
      instead of only being *recommended* with a manual tap — surfaced as a visible,
      undo-able notice (`components/hermes/HermesHitFactory.tsx`) so learning never
      silently overrides the artist, per the "assistant, not autopilot" belief.
      `recommend.ts` now takes the current `banned` list so it never re-suggests a word
      that's already excluded. (2) A "📋 copy N new words to remember permanently"
      button in the Avoid-words panel bridges the session-local, localStorage-only
      learned exclusions into the durable, git-committed `brain/memory.json`
      (`lib/hermes/memory.ts`'s new `newLearnedExclusions()`) — no fake auto-sync, just
      a one-tap export the same way the Suno-style copy button already works. (3)
      Proactively expanded `bannedWords.ts` with 18 commonly-recognized AI-lyric-cliché
      terms (tapestry, unwavering, phoenix, haunting, etc.) ahead of a specific
      complaint — confirmed zero overlap with current generation vocabulary, so no
      demo regeneration needed. Verified live: generate → cut a repeated word → notice
      + auto-exclusion appear; avoid-words panel surfaces the copy button; zero console
      errors. _(this PR)_
- [x] **Avoid-words actually enforced during generation (the moat)** — the exclusion
      system (`brain/memory.json` + `bannedWords.ts` generic clichés) was **warn-only**:
      `checkOriginality()` flagged a banned word after the fact, but nothing in the
      combinator (`nounPool`/`imageryNouns`/`verbPool`/`adjPool`, the frame-template pools,
      or `rhymeFamily()`'s lexicon rhyme picks) ever filtered against it — so "fire",
      "flame", "crown", and "mirror" kept surfacing even though they were already on the
      generic avoid-list. Surfaced by generating "Second Wind" in the live app and getting
      real artist feedback (skyline/flame/mirror/throne overused, plus the hard-coded
      "no turning back" frame opener). Now every generation path takes a `banned: Set<string>`
      and filters it out at the source (never starving a pool — falls back to the full list
      when an exclusion would empty it); frame templates whose own fixed wording hits a
      banned phrase are dropped from the pool outright. `LyricsProvider.generateHooks/
      generateSections` gained an optional `bannedWords` param; `pipeline.ts` threads its
      already-computed `banned` list through instead of only handing it to the originality
      scan. Added "skyline", "throne", and the phrase "no turning back" to
      `brain/memory.json`'s exclusions. Also fixed a related `imageryCoherence()` scoring
      bug it surfaced: the metric only credited the top-2 imagery clusters as "on-image",
      but the generator itself draws padding from *every* cluster with a nonzero signal
      score — aligned the two. Demos regenerated; golden eval green on all 6 songs. _(this PR)_
- [x] **Image-coherence scoring + verb/noun agreement (the moat, deeper lyric craft)** —
      a new `imageryCoherence()` eval metric measures whether a song's actual imagery-bank
      nouns share its top-ranked cluster, not just whether a theme keyword is mentioned
      anywhere (a stronger signal than the existing "thematic coherence" metric). Verbs are
      now tagged by imagery cluster (`VERB_CLUSTERS`) and drawn from a pool biased toward the
      song's top cluster(s) — the same register the noun backfill already leans on — falling
      back to the full verb list when too few match so variety never starves. Also fixed a
      real bug in the existing noun/thread backfill: it shuffled candidates across *every*
      cluster before slicing, diluting the exact cluster bias imagery coherence depends on;
      picked/rest now shuffle separately so padding stays biased toward the top cluster(s).
      Demos regenerated (`GEN_DEMOS=1 npx vitest run trace`); golden eval green on all 6
      songs, including the new metric. _(this PR)_
- [x] **Focal Compose / Studio layout** — `/hermes` splits into a focused "Compose"
      hero (just the brief + Generate, plus "or see a finished example") vs. the full
      three-column "Studio" deck once a run starts or a package exists; a "✨ New"
      header button returns to Compose. Second of the UI-polish sequence (after
      typography); next: the generation-as-a-moment animation, then the in-app
      semantic-memory panel. _(#72)_
- [x] **Premium typography** — self-hosted **Space Grotesk** (display) + **Inter**
      (body) via `next/font/local` (`app/fonts/`, OFL-licensed, ~74KB total): no
      Google Fonts/CDN call, deterministic $0/offline CI builds. Wired only in
      `app/layout.tsx` so the component test suite stays free of the `next/font`
      dependency; headings/brand mark/big numerals take the display face. _(#71)_
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
- **Known non-blocking check:** the Cloudflare "Workers Builds: kudbee-music" GitHub
  check always fails (stray Workers integration, unrelated to Pages) and is not a
  merge gate — see `brain/beliefs.json` (`known-nonblocking-checks`) and
  `ARCHITECTURE.md`. Never treat it as a CI failure.
