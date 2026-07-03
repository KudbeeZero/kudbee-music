# 💡 HERMES — Idea Inbox

The capture net. **Nothing the artist says gets lost.** When an idea gets thrown out
mid-build, it lands here first (acknowledged + logged), the build continues, and the
idea gets designed and scheduled from here. This is the front of the funnel;
[`TODO.md`](TODO.md) is the committed backlog; `brain/` is where ideas become real.

> **Capture protocol (how we work):** every idea is acknowledged the moment it's said
> and written here the same session — even when we're mid-build. We finish the green
> loop we're on, then come back and design what's captured. First thought → second
> thought → decision: this file is the first thought, so none of them slip.

Status key: 💭 captured · ✏️ designing · 🔨 building · ✅ shipped

---

## 🧠 Flagship visions (the big ones)

### 1. The Brain Scan — a living brain that lights up as it thinks  ✅ (v1 shipped)
**Shipped:** `components/hermes/BrainScan.tsx` — an anatomical brain whose functional
regions light up (cyan=analytical/left, magenta=generative/right, amber=center) as the
agents fire; **each region is a knowledge file** you can tap. Language & Culture sits
dim as the next area to wire. Next: drive it live off the per-agent stream during a run
(currently lights from the result state), add the scan boot-sequence, and wire Language.
Make the brain **visible**. An anatomical brain (SVG/Canvas) whose regions map to the
real subsystems, and that **pings and lights up like an fMRI/EEG scan** as the process
runs — so the artist watches their song being thought into existence and *feels* the
brain becoming them.

- **Region → subsystem map** (each is one of the "little knowledge documents" that
  together render the whole brain):
  | Brain region | Subsystem | Lives in |
  |---|---|---|
  | Prefrontal (intent) | Conductor — the brief | `pipeline.ts` |
  | Right hemisphere (generative) | Hooksmith · Lyric Chemist · Visual Director · **persona** | `personas.ts`, providers |
  | Left hemisphere (analytical) | Originality Auditor · A&R Judge · Emotion Scanner · Beat Oracle | `originality.ts`, `scoring.ts` |
  | Hippocampus (memory) | vault · exclusions · learned profile | `memory.ts`, `learn.ts`, `storage.ts` |
  | Corpus callosum (integration) | the **decision** — the artist chooses | Writers-Room `process.ts` |
  | Values cortex | the belief system | `beliefs.ts` |
- **The scan animation:** driven by the events we *already emit* — `runPipeline`'s
  `onProgress` (agent-by-agent) and the Writers-Room step transitions. Each event
  pings its region: a glow pulse, a label, a confidence read-out. Like a diagnostic
  boot sequence "searching" each area.
- **Tech sketch:** an SVG brain with `data-region` nodes; a `regionFor(agentId|stepId)`
  map; CSS keyframe glow + a small driver hook subscribed to progress events;
  reduced-motion aware (fade instead of pulse). Click a region → opens its "little
  document" (its belief/memory/persona knowledge).
- **Why it matters:** visual proof the artist is part of the process; the WIFI DJ
  "Crossroads Board / nervous system" made literal.

### 2. The Council — the agents as a deliberating board  ✅ (shipped — `components/hermes/Council.tsx`)
Render the 10 agents as a **council** around the brain (the "Crossroads Board"): right
hemisphere proposes, left hemisphere challenges, the artist decides. Show the
back-and-forth, not just final outputs.

### 3. Cognitive model — first thought → second thought → decision  ✅ (shipped — `lib/hermes/cognition.ts`)
Model real dual-process cognition explicitly (it already maps onto our two hemispheres):
- **First thought (System 1, right):** fast, generative — the persona-driven proposal.
- **Second thought (System 2, left):** reflective critique — "is this true? original?
  does it earn it?" (Originality/Emotion/A&R challenge the first thought).
- **Decision:** integration — the artist picks; the choice is recorded to the voice
  model (`choiceSignals` → taste). *Assistant, not autopilot.*
- Candidate home: `lib/hermes/cognition.ts` — a `deliberate(proposal) → {critique, options, decision}` loop the Writers-Room and pipeline both run, logged so the brain scan can show the two passes firing in sequence.

### 4. Community-authored personas (ties to governance)  💭
Let the community add craft-DNA personas the same way they add scene packs — which
feeds the WIFI DJ token/governance "steer the G-DJ" loop.

### 5. The Language & Culture cortex  ✅ (shipped — `lib/hermes/language.ts`)
The brain's **language area** — the part that actually shapes word choice. The best
lyrics come from lived experience, and a huge part of that is **culture and how you
were brought up**. Add a layer that maps:
- **Vernacular / register / dialect** — regional and cultural speech patterns (as
  craft traits, never an impersonation of a person).
- **Cultural upbringing as input** — where the writer is from, what shaped them, fed
  into word choice and imagery alongside the persona.
- **Struggle → song.** The truest songs come from struggle, and channeling it is the
  craft. In the game layer this becomes a channelable **"superpower"**: adversity, the
  way it's processed, makes the work hit harder. *(Truth-first belief, made literal.)*
- Maps to real brain regions: language cortex (word formation) + limbic/emotion +
  memory — all of which the Brain Scan should show lighting up. Candidate home:
  `lib/hermes/language.ts` + a `culture` field on the brief.

### 7. The brain IS the file system (Obsidian-style knowledge vault)  ✏️
The brain is already a vault of plain markdown + JSON files Claude reads, writes, and
cross-links directly — no external API (the `brain/` folder: `beliefs.json`,
`memory.json`, `personas.json`, `hemispheres.md`, plus `IDEAS.md`/`TODO.md`). It's the
"second brain" pattern, **version-controlled in git** (better than a plain Obsidian
vault). Lean into it: add an explicit **artist-identity file**, **cross-link** the
docs into a navigable web, and adopt an **ingest → research → save** loop. Crucially,
**each knowledge file = one region of the Brain Scan** — click a region, open its file.

### 8. The Emotional (limbic) layer  ✅ (shipped — `lib/hermes/emotion.ts`)
Shipped: reads mood into an affect model (valence + intensity + primary feeling),
proposes the emotional **contrast** that adds depth, maps sections onto an emotional
**arc**, and feeds the Writers-Room (concept + arc steps). Its own **Limbic brain
region** (9/9) now lights up, driven by the Emotion Scanner. Next: use the affect to
actually color word/imagery selection in generation (emotion → diction).
Emotion is *analyzed* today (Emotion Scanner arc score, emotional-clarity banger
category, mood input, dark-lean, emotional-contrast recs, struggle-as-depth). The next
level is a true **limbic layer** that *shapes* feeling, not just scores it: its **own
Brain Scan region** (the limbic/amygdala area), an explicit **emotional-arc model**
(which section carries which feeling; the tension curve across the song), and **affect
mapping** (mood → word-color + imagery). Pairs with Language & Culture: *how it feels* +
*how you say it*. Candidate home: `lib/hermes/emotion.ts` + a `limbic` region in
`brainMap.ts`.

### 6. Create-your-own-artist — a living world  ✅ (v1 shipped — `lib/hermes/artist.ts` + Story Mode; the bigger living-world game stays 💭)
The big game: anyone can **build their own artist**, choose its path and identity,
visually show it, and **capture events like a living world** that evolves. Each user's
artist is theirs; the brain becomes *them* over time. Personas + memory + the persona
contribution loop are the seeds of this.

---

## 🌐 Platform / ecosystem
- 💭 **wifidj.xyz as the front door** — point the (Cloudflare-fronted) domain at the
  Vercel deploy / docs site once we're ready to go public.
- 💭 **WIFI DJ radio** — a **live radio** that streams the music this engine makes;
  people **submit** tracks, the community **shapes** the project, and eventually each
  person runs **their own agent**. The closed loop becomes a public, living station.
- 🔨 **Crossroads Board (extensive)** — **Stage 1 ✅ shipped (#44), Stages 2–3 💭** (`lib/hermes/crossroads.ts` +
  `brain/crossroads.json`: the $0/local decision model — crossings, weighted votes, tally,
  decide). Stages 2-5 (board UI → taste wiring → community API → token voting) ahead. —
  the WIFI DJ governance/community steering surface:
  the brain's **"decision" region made social**, where the community and the agents meet at
  the crossroads to steer creative + ecosystem direction. **Staged plan in
  [`brain/roadmap.json`](brain/roadmap.json)** → (1) local `crossroads.json` model of
  "crossings" (a decision/fork with options + rationales + weighted votes + outcome,
  versioned in git like beliefs/personas) → (2) a `/crossroads` board UI (right proposes,
  left challenges, artist decides — shares the Council/Brain-Scan look) → (3) decisions feed
  the taste/memory model and steer generation → (4) community sync via API (Supabase /
  Cloudflare D1; email or wallet identity) → (5) token-weighted governance (Solana / NFT).
  Stages 1–3 are $0/local in this repo; 4–5 are a separate service the core calls **via API**,
  so the free brain stays free + local. A token funds the ecosystem (the founding intent).
- ✏️ **Per-agent compute — Lightning AI spike** — the opt-in "advance your model" tier:
  a user **signs up → gets their own agent**, paid tiers give a bigger brain. **My read:**
  great fit for the *optional GPU / bigger-brain lane* and for prototyping per-agent compute,
  **not the backbone** — the base stays $0/local/serverless, and "their own agent" really
  needs an **accounts + persistent-vault** layer first (Phase 4 durability), which is
  compute-light. **Spike (when SSL is connected):** stand up one Lightning Studio running a
  single HERMES agent behind HTTPS, wire it as an opt-in provider behind the existing
  `LyricsProvider` seam (reversible), and compare vs Anthropic-API-direct + Modal/Replicate
  before committing.
- 💭 **Durable cloud brain** — optional Notion / Google Drive backing so a cleared
  browser never loses the vault (fixes the localStorage weakness).
- 💭 **Reference study (opt-in)** — Spotify to study a *described* sound (never names),
  feeding the persona match.

## 🧭 Founder narrative (privacy-guarded)
- 💭 The founding use case is a **closed-loop personal studio** — built so the founder
  can keep creating original music end-to-end with the right tools, when the old way
  of making it wasn't available anymore. The public/launch story is about **resilience
  and channeling adversity into creation** — a superpower, not a limitation.
  **Privacy rule: do NOT publish the founder's personal/medical specifics anywhere**
  (repo, PRs, marketing). Keep it to the resilience message only.

## 🧬 Brain / engine
- ✏️ **Rhyme architect + syllabic constraint layer** (framework Part 2) — real rhyme
  scheme + meter in the generation engine. **Founder addition (2026-07-01, after
  generating "Second Wind"):** study how real songs are actually built (rhyme
  schemes beyond AABB, internal/multisyllabic rhyme, genre-typical flow patterns),
  then feed that into three concrete upgrades — (1) a **thesaurus/synonym-expansion**
  layer so word choice isn't limited to the fixed lexicon/noun-bank (broader,
  less-repetitive vocabulary per line); (2) **syllable + rhythmic-pattern awareness**
  in generation, not just at the end-rhyme (`lexicon.ts` already has `syllableCount` —
  extend it to fit whole lines to a target cadence); (3) let the **artist pick a
  lyric-generation style/rhythm** in the Song Lab UI (e.g. tight/loose flow, dense vs.
  sparse rhyme, different genre-typical patterns) rather than one fixed combinator
  voice. Candidate home: `lib/hermes/rhyme.ts` + `lexicon.ts` for the engine work,
  `SongLabForm`/`LyricLab` for the style picker. Natural next step after the
  image-coherence + verb/noun agreement pass (#74).
- ✏️ **Real LLM provider** behind the adapter (opt-in, behind a key; mock stays default).
- 💭 **Influence Studio** — describe a feel → thematic cartography + architectural
  blueprint → craft parameters (original-only).

## 🎨 Visual / UX
- ✅ **Interactive scrolling landing page** — shipped _(#86)_: scroll-scrubbed hero (reuses the
  repo's own hero clips), hemispheres section, demo-proof table, honest loading states, full
  reduced-motion fallback. Comment slots left for the founder-gated Runway hero + wallet connect.
- ✅ **Lyric Lab UI** — the Writers-Room + persona picker, made visible. Pick a
  persona, walk the 9 steps, commit choices (the hook becomes the song's real hook),
  the brain learns your voice. _(see Shipped)_
- 💭 **Brain-scan boot sequence** on song start (see flagship #1).
- ✅ **"It's becoming you"** — the 🪞 Becoming You panel surfaces how much of the current
  song echoes the artist's learned voice vs fresh suggestion. _(#30)_
- ✅ **Functional song deck + focus on lyrics/brain** — every control in the package is
  now live: **hook options are selectable** (tap to set the lead → honest re-score +
  the pick feeds the voice model), **short-form clips copy on tap**, and the export is a
  plain **JSON** download. Pulled the **video framing** out of the web app (removed the
  "video studio" export label + the music-video-prompt section) so the Hit Factory is
  100% about lyrics + the brain. Video studio code stays intact (CLI) for later. _(this PR)_

---

## 🔎 External review (Grok) — adopt these
A second-opinion review flagged real risks worth acting on (truth-first):
- ✅ **Honest framing of the brain metaphor** *(high value, low effort)* — README,
  `brain/hemispheres.md`, and the Brain Scan UI now state up front that the 11 regions /
  hemispheres / nervous system are an **inspired conceptual model**, not a claim of
  biological fidelity — each region is real code in `lib/hermes/`. _(this PR)_
- ✅ **Proof on the landing/README** — `examples/demos/` ships **five original songs**
  (five genres) minted by the real pipeline, each with a committed **generation trace**
  showing what all 11 regions contributed (limbic read, reward crave score, rhyme
  scheme/density, originality, A&R verdict). Reproducible via `GEN_DEMOS=1 npx vitest run
  trace`; linked from the README proof table. `lib/hermes/trace.ts` + tests. _(this PR)_
- ✅ **Deepen the deterministic core** — shipped: **hierarchical generation** (each verse
  pursues a section goal — setup → turn → reflect — from its own frame pool), **thematic
  threading** (theme words anchored across sections so the song develops one idea),
  **diversity guard + scoring** (`selfSimilarity` in `text.ts`, wired into replay value;
  a song-wide guard stops any frame being reused), and a **slant/near-rhyme "temperature"**
  knob (`rhymeTemp` tight↔loose, `slantKey` families, a Rhyme selector in the Song Lab).
  Still $0/local/deterministic. _(this PR)_
- ✅ **Eval harness + golden songs** — `lib/hermes/eval.ts` + `npm run eval`: objective
  metrics (rhyme density, line diversity, thematic coherence, hook strength) over the
  demos + flagship golden set; a CI regression guard so "learn/score" is measurable. _(#36)_
- ✅ **Output safety filter** — `lib/hermes/safety.ts` screens hooks/lyrics against a
  famous-phrase list (a `famous-phrase` uniqueness flag), plus a responsibility
  disclaimer in the README + Uniqueness panel. _(#37)_

## 🌱 Fresh captures
- 💭 **"WIFI radio will have like a jukebox songs. People can submit songs. We have
  contest stuff — bring more value"** *(founder idea, 2026-07-03)* — this already
  had a home: `brain/roadmap.json`'s `ecosystem.wifiDjRadio` ("A live radio
  streaming engine-made music; community submits + shapes"), previously a
  one-liner. Expanded with the concrete shape: a jukebox/playlist surface where
  the community submits finished HERMES songs, plus contest mechanics (voting,
  winners, featured drops). Natural extension of two things already built —
  `crossroads.ts`'s vote/tally/leader model (currently used for governance
  crossings, reusable for song-submission voting) and the Vault/Song-Gifts
  share-link infra (already gets a song out of one artist's browser onto a
  shareable URL). Not started — genuinely blocked on the community layer
  (`crossroadsBoard`'s own stage 4: an opt-in backend), since submissions need to
  be visible across visitors, not just live in one browser's localStorage vault
  like everything else in the free core. Distinct from the tiny-feature cadence
  below — this is ecosystem-scale, not a same-day build.
- 🔨 **"Keep coming up with new little features, real tiny builds that amplify one
  little area... do this enough times, things will be amazing"** *(founder directive,
  standing goal, 2026-07-03)* — a continuous cadence, not a one-off feature: small,
  self-contained, one-green-loop-PR-at-a-time amplifications to any part of HERMES.
  Tracked as its own open-ended roadmap phase (`brain/roadmap.json` phase 7, "Tiny
  features — the standing cadence") so each tiny ship has a real home instead of
  getting lost between bigger builds. Shipped so far:
  - ✅ **🎲 Surprise me — a varied starter-brief pool for Song Lab** — `loadExample()`
    only ever loaded one fixed `EXAMPLE_BRIEF`; a new `STARTER_BRIEFS` pool (6 varied
    genre/mood/structure/rhyme-scheme combos) plus a button that always picks a
    *different* one than what's showing gives a blank-page visitor real variety
    instead of the same canned example every time. See TODO.md Shipped.
  - ✅ **📋 Copy lyrics — plain-text copy button** — the only ways to get lyrics out
    of a package were the full JSON export or one short-form clip caption at a time;
    now `SongPackageView`'s existing `rawLyrics` is one click away. See TODO.md
    Shipped.
  - ✅ **⭐ Vault favorites — pin your best takes** — a growing vault had no way to
    mark a keeper; a ☆/⭐ toggle per row (new `storage.ts` favorites store, its own
    localStorage key, no bearing on generation) sorts favorites to the top. See
    TODO.md Shipped.
  - ✅ **🎤 Click-a-word rhyme helper** — every word in the Final Lyrics view is now
    clickable, surfacing `lexicon.ts`'s existing `rhymesWith()` (already built for
    generation, never exposed to the writer directly) as a reference-only rhyme
    lookup. See TODO.md Shipped.
  - ✅ **📏 Word/line/runtime counter** — "183 words · 23 lines · ~2:00 (est.)" next
    to the Final Lyrics label; word/line counts exact, runtime an explicitly-labeled
    rough estimate. See TODO.md Shipped.
  - ✅ **📑 Duplicate this song** — new `storage.ts` `duplicateSong(id)` forks a vault
    entry into an independent "(copy)"-titled version-1 entry (suffix bumps to avoid
    collisions on repeat), a "duplicate" button on every `VaultDrawer` row. See
    TODO.md Shipped.
  - ✅ **📝 Per-song vault notes** — a free-text sticky note per stored song
    (`storage.ts` `loadSongNotes()`/`setSongNote()`, its own localStorage key,
    280-char cap), an inline input on every `VaultDrawer` row. See TODO.md Shipped.
  - ✅ **⌨️ Cmd/Ctrl+Enter to generate** — a window-level keydown listener in
    `SongLabForm.tsx` submits from anywhere in the form, respecting the same
    `briefReady` guard the button uses. See TODO.md Shipped.
  - ✅ **🎵 One-click Copy Suno prompt** — a direct "Copy Suno prompt" button in
    `SongPackageView`, reusing `suno.ts`'s existing `sunoTrack()` — previously only
    reachable inside "Explain this song". See TODO.md Shipped.
  - ✅ **⎋ Escape-key close for Vault/Album drawers** — a window-level Escape
    listener closes each overlay (same pattern as Cmd/Ctrl+Enter). Deliberately
    NOT added to the Lyric Lab — its in-progress free-write draft box makes
    Escape-to-close a data-loss risk, not a delight. See TODO.md Shipped.
  - ✅ **📄 Markdown export** — new `lib/hermes/markdownExport.ts`'s
    `songMarkdown()`, a pure formatter (title/concept/brief/hook/lyrics/production
    as clean Markdown), a "Export Markdown" download button next to Export JSON.
    See TODO.md Shipped.
  - ✅ **↩️ Undo a committed Lyric Lab step** — a new `uncommit()` clears a step's
    log entry back to uncommitted; an "Undo" button in the committed box. Safe
    because taste-recording only runs once, in `finish()`, off the final log
    state. See TODO.md Shipped.
  - ✅ **↺ Reset to defaults on Song Lab** — a "Reset" button clears the form back
    to blank, shown only when the form is actually dirty. See TODO.md Shipped.
  - 🔻 **Dark/light theme toggle — descoped, not a tiny feature.** Checked
    `app/globals.css` before starting: the app is fully dark-only — ~20 CSS
    variables (`--bg-0`/`--panel`/`--ink`/`--amber`/`--cyan`/`--magenta`/etc.), no
    light-mode values, no `data-theme` or `prefers-color-scheme` infrastructure
    anywhere. A real light theme means designing a full second palette and
    checking contrast/readability across every component — a design-system
    project, not a same-day tiny build. Left un-shipped; queued as its own bigger
    item if the founder wants it (see brain/roadmap.json if promoted later).
  - ✅ **🕐 Recently viewed strip in the Vault** — `loadRecentlyViewed()`/
    `recordRecentlyViewed()` (newest-first, capped at 5), recorded on every
    vault-open, a chip strip above the main Vault list. See TODO.md Shipped.
  - ✅ **🔎 Vault search/filter box** — a "Search by title…" input filters the
    visible list (case-insensitive substring match), shown only past 5 songs; an
    honest "No songs match" empty state distinct from "vault is empty." See
    TODO.md Shipped.
  - ✅ **✎ Inline vault-song rename** — a pencil button on every `VaultDrawer` row
    toggles an inline Save/Cancel rename, an in-place metadata edit that leaves
    the version untouched. Caught (and fixed in the same PR) a real Escape-key
    interaction bug with the earlier Escape-to-close-drawer feature — cancelling
    a rename was also closing the whole drawer until `stopPropagation()` was
    added. See TODO.md Shipped.
  - ✅ **🗑 Clear all avoid-words** — a one-click reset for the learned avoid-words
    list, gated by the same `window.confirm()` pattern as "Restore from backup"
    (the only other destructive-action confirm in the app), shown only when the
    list is non-empty. See TODO.md Shipped.
  Candidates queued for the next few rounds (pick one, ship it, move to the next):
  a per-song "copy JSON to clipboard" (today JSON only downloads, no clipboard
  option like Markdown/Suno have), a keyboard shortcut to jump straight to the
  Vault search box (e.g. "/" like GitHub/Slack), a per-song "share link" copy
  button next to Copy Suno prompt (share-link generation already exists via
  Song Gifts — just needs a one-click surface on the main SongPackageView).
- 🔨 **"Input their music" — upload an existing audio file, not just record live**
  *(founder question, 2026-07-03 — "I want to create something down the road
  where people can input their music... are you working on that?")* — a genuinely
  distinct gap from what's shipped. Voice Notes (Bring Your Own Sound PR1, see
  above) only covers *live mic recording* via `MediaRecorder`; there's no way yet
  to bring in a file the artist already has — a beat they bought, a reference
  track, a vocal recorded elsewhere on their phone. Not started. Natural shape:
  reuse the exact same storage the mic path already proved out —
  `lib/hermes/audioVault.ts`'s IndexedDB clip store (kind: 'voice' | 'riff' —
  would just need `<input type="file" accept="audio/*">` as a second capture path
  alongside `MediaRecorder` in `VoiceNotes.tsx`, feeding the same `saveClip()`).
  $0/no-new-deps: the File API is a browser built-in. Same determinism note as the
  rest of "Bring Your Own Sound" — an uploaded file is a source asset, never part
  of the byte-identical generation contract. Queued as its own item, separate from
  the tiny-feature cadence above (it's closer in size to Voice Notes PR1 than a
  same-day tiny feature) — a priority call against the tiny-feature queue and the
  humming/flow-matching PR3 work.
- ✅ **"Make sure Claude.md files are getting updated, memory layer files... each file
  should have a chapter/head-type page with the contents of the entire folder"**
  *(founder directive, 2026-07-03)* — shipped: `brain/README.md` + rewritten `docs/index.md`,
  guard-tested (`memoryIndexes.test.ts`). See TODO.md Shipped for the full writeup.
- 💭 **"Is there a way to provide more interactive help — like the app Scribe?"** *(founder
  question, 2026-07-03)* — Scribe (scribehow.com) records a real screen workflow, auto-
  detects each click/field via DOM inspection, captures + annotates a screenshot per step,
  and generates step-by-step text (heuristic + AI-assisted) into a shareable guide. A literal
  clone doesn't fit HERMES's $0/static/no-server model (no screen-recording pipeline, no
  server to process it) — but two honest equivalents:
  1. **A hand-rolled "Guided Tour" coach-mark overlay** for onboarding — a small, static
     config of `{ selector, title, body }` steps anchored to Song Lab's existing element ids
     (`#hf-title`, `#hf-theme`, `#hf-occasion`, …), stepped through with a spotlight/scrim
     overlay (pure CSS, zero new deps). Same end-user experience as opening a Scribe guide —
     just authored once instead of recorded, since a static client can't capture a live
     session. Natural v1 scope: walk a first-time visitor through Song Lab → Generate →
     Explain this song.
  2. **HERMES already ships the *other* half of Scribe's idea** — "🔍 Explain this song"
     (`lib/hermes/traceHtml.ts`) auto-generates a step-by-step annotated walkthrough, just of
     the BRAIN's reasoning instead of a human's clicks. Worth naming and leaning into that
     framing rather than treating "interactive help" as unbuilt from scratch.
  Not built yet — needs a priority call against the Council build plan below.
- 🔨 **"Bring Your Own Sound" — record voice/instrument clips, hum a melody to shape
  the flow"** *(founder idea, 2026-07-03 — "people should be able to record their voice
  and add voice clips or record an instrument... maybe you can hum a melody and it'll
  help with the flow of the song... updating our brain mechanism")* — every input to
  the brain today is text; this gives it a real new sense. Checked against the iron
  laws before building: `MediaRecorder`/`AudioContext` are browser built-ins (zero new
  deps); the raw recording is a source asset like a photo (never part of the
  byte-identical determinism contract) but the *extraction* from a hum into a
  structured flow target must stay deterministic, exactly like every other dial.
  Explicit scope call (asked the founder, confirmed): **rhythm/syllable-matching**,
  not full pitch/melody transcription — hum→MIDI is a hard, easy-to-get-wrong DSP
  problem (octave errors, vibrato) not worth promising; syllable-count + coarse stress
  matching is honest, buildable at $0, and still a genuinely new brain sense nobody
  else in this space has. Four phased steps:
  1. ✅ **PR1 — Voice Notes: record & attach, no generation impact.** Shipped — see
     TODO.md Shipped. `lib/hermes/audioVault.ts` (IndexedDB, in-memory fallback) +
     `components/hermes/VoiceNotes.tsx`, wired into `SongPackageView`.
  2. 💭 **PR2 — Instrument riff clips.** Same component (already built generic over
     `kind: 'voice' | 'riff'`), a second recording slot/label, multiple clips per song.
     Mostly UI — the hard part (recording + IndexedDB) is already proven by PR1.
  3. 💭 **PR3 — Hum-to-flow: the actual brain wiring.** New `lib/hermes/melody.ts`:
     energy-envelope onset/peak-picking to segment a hum into syllable-like pulses
     (well-trodden DSP, no ML), collapsed once at capture time into a deterministic
     `flowContour` (`syllablesPerLine: number[]` + a coarse stress pattern). New
     `SongInputs.flowContour?` field, validated at all 3 untrusted-input boundaries
     (`pipeline.ts`/`shareLink.ts`/`storage.ts`) exactly like `rhymeScheme`/`occasion`.
     Needs a syllable counter first — doesn't exist in the codebase today (checked:
     `cadence` on a `HookOption` is just a descriptive label, nothing computed) — a
     small heuristic vowel-cluster counter is plenty for a "flow fit" target, not a
     strict grammar. `providers/mockLyricsProvider.ts`'s `fill()` snaps generated
     lines toward the target syllable count.
  4. 💭 **PR4 (stretch, optional) — pitch-contour visualization.** A cosmetic
     waveform/pitch strip next to the lyric. No coupling to generation. Cut if PR3
     alone sells the story.
- 🔨 **The Council build plan** *(founder directive, 2026-07-03 — "deploy a research agent...
  what could we do with the existing routes and information that we have to make this council
  even better")* — a research agent audited `council.ts`/`Council.tsx` against the rest of the
  brain and found the board's ranking was **display-only**: it never fed back into anything —
  not the pipeline's actual hook choice (`selectHookByCognition` in `cognition.ts` can disagree
  with the Council's own ranking), not the artist's learned taste, not the vault, not generation
  itself. Five build steps, prioritized by how much real signal each unlocks per unit of work:
  1. ✅ **PR1 — taste as a 4th voice.** `voiceFit()` scores a hook against the artist's learned
     `Taste` (liked/disliked word tallies, same idiom as `becomingYou.ts`'s `voiceMirror`);
     `rankHooksByCouncil()` takes it as an optional 4th voice, active only once the artist has
     real edit history. Shipped — see TODO.md Shipped.
  2. 💭 **PR2 — Council verdicts become real Crossroads crossings.** Reuse
     `openCrossing/vote/tally/leader/decide` from `crossroads.ts` to represent a hook decision
     as an actual governance crossing instead of a component-local ranking — ties the board's
     "vote" to the same mechanism the community-steering Crossroads page already uses.
  3. 💭 **PR3 — Council judges across takes.** Rank the vault's up-to-5 stored versions per
     song title with the same 3/4-voice scoring, so "which take is actually best" is answered
     by the board, not just chronologically.
  4. 💭 **PR4 — the first vote that steers generation.** A `hookFinale: 'repeat' | 'evolve'`
     `SongInputs` field driven by the artist's local Crossroads vote on a
     `hook-repeat-vs-evolve` crossing — the first time a Council/Crossroads decision changes
     what the pipeline actually generates, not just how it's displayed. Needs the full
     untrusted-input boundary treatment (`pipeline.ts`/`shareLink.ts`/`storage.ts`) since it's
     a new `SongInputs` field.
  5. 💭 **PR5 — live deliberation in the Lyric Lab.** Reuse `deliberate()` in the hook-typing
     step so the board's challenges run before a hand-typed hook is committed, not just after.
  PR1 shipped; PR2–PR5 queued, one PR at a time per the green-loop.
  `brain/occasionPacks.json` + `lib/hermes/occasionPacks.ts` — Christmas, Valentine's,
  Mother's/Father's Day, Birthday, Anniversary, Graduation, New Year, each a mood/genre/
  structure/rhymeScheme preset PLUS real new imagery vocabulary (stocking, mistletoe,
  diploma, tassel…) and a dedication line ("Merry Christmas, {who}") swapped in for the
  generic Intro. Riding the exact infrastructure pattern packs (#114) proved, but `occasion`
  is genuinely its own field (validated everywhere `rhymeScheme` is). Testing the feature's
  own flagship case (a Mother's Day dedication) surfaced a real pre-existing bug — pronouns
  weren't filtered anywhere, so "everything she gave" leaked "she" into a noun slot — fixed
  in the same PR. See TODO.md Shipped for the full writeup.
  **The sell wrapped around it — "Song Gifts" shipped (roadmap 5.9, phase 2)**: every
  existing share surface became gift-aware whenever a package carries an Occasion Pack +
  a dedicated audience name — deliberately no new surfaces, the existing ones just tell
  the truth about what a gift link is. `shareLink.giftMessage()` turns the copied text into
  "🎄 A Christmas song for Mom — open it to watch the brain write it: <url>" instead of a
  bare URL; the Share button becomes "🎄 Share the gift"; opening a gift link shows a themed
  reveal banner before the brain scan; the downloadable PNG card and the (still inert,
  `OG_UNFURL=1`-gated) OG unfurl both swap to gift framing too, so a gift link previews
  correctly in iMessage/Slack/Discord once activated. Gifting is a proven paid behavior (the
  greeting-card market), every gift recruits the recipient, and the deterministic-permalink
  angle is a moat no other tool has — later it's mintable, straight into the Living-Brain
  dNFT lane. See TODO.md Shipped for the full writeup.
  **Gap surfaced while building this — fixed same-session**: the downloadable-PNG-share-card
  feature (`shareCard.ts`) had no button wired to it anywhere in the UI. Fixed: a "🖼 Download
  card" button now lives in `SongPackageView`, next to Share/Explain/Export. See TODO.md
  Shipped.
  **Cheap viral follow-up — "HERMES Wrapped" (still proposed)**: a Spotify-Wrapped-style
  shareable artist card from the vault (brainSignature already computes hemisphere/
  temperature/signature-words/becoming-you) — zero new engine work, pure share-card
  rendering.
- ✏️ **"Check the code... three things to improve on and three weaknesses... come up with a way
  to fix those"** *(founder directive, first Fable 5 session)* — ran a layered review: Fable 5
  first pass (two broad review agents + hands-on inspection), then wrote verification
  instructions and had a **Sonnet** agent adversarially verify all 12 candidate findings with
  empirical reproduction (2 refuted — the rhymeScheme crash wasn't reachable from public paths,
  and the crossroads prototype-pollution concern was inert). Confirmed weaknesses: share links
  reproduce the wrong song (fixed same-day), silent vault loss on storage quota, short-form ×
  non-AABB schemes ship non-rhyming couplets. Improvements: determiner–noun agreement ("All
  this winters" ships in the flagship demo), chorus variation + repetition budget, dead
  cross-section diversity guard. All tracked with fix designs in `TODO.md` → "code-review
  findings"; the review-then-verify pattern (broad pass → written instructions → independent
  verifier model) is worth reusing — it caught two overclaimed severities before any code moved.
- ✏️ **Crossroads Board — Stage 2 shipped, Stage 3 next** — Stage 1's data model (#44) had
  nowhere for anyone to actually see or cast a vote. Shipped the `/crossroads` route: every
  seeded crossing renders with ranked options + rationale + a vote bar, and a click casts
  this browser's own vote (localStorage-only, honest that it's not a real community tally
  yet — that's the stage-4 API layer). Next up per the original staged plan: Stage 3, wiring
  a cast vote into `recordTaste`/the memory model so board decisions actually steer future
  generation, the same way Lyric Lab choices already do.
- ✅ **"An agent, an engineer, that is consistently monitoring the system, finding
  weaknesses, also finding ways to improve the system through research... deploy its own
  developer agent, security code review... run on a dynamic type loop through the Claude
  API"** *(founder directive, via /goal)* — shipped in two passes. Pass 1 built the
  manually-triggered, findings-only review loop (`claude-watchdog`). The founder's `/goal`
  hook correctly flagged Pass 1 as incomplete against the literal ask ("consistently
  monitoring" and "its own developer agent" weren't real yet), so Pass 2 built both pieces:
  a `schedule:` trigger, and `scripts/watchdog-fix.mjs` (draft a Claude patch from a
  findings, auto-commit, auto-push, auto-open a draft PR). Wiring the auto-fix-PR piece
  live was **blocked by the platform's own auto-mode safety classifier** — unattended
  code-write-and-push with no human-approval checkpoint, gated only by automated tests, is
  a real risk boundary its tooling won't let an agent cross unprompted. Asked the founder
  directly (`AskUserQuestion`) rather than guessing which way to resolve the conflict; the
  founder chose findings + scheduled monitoring, dropped the auto-fix-PR piece entirely
  (not "deferred" — the code was written, tested the block, then deleted). Final shape:
  `claude-watchdog` runs weekly + on demand, reviews recent commits/npm audit/the repo's own
  laws/every security-sensitive file, files findings + research ideas as a GitHub issue —
  permanently findings-only, `issues: write` is its permission ceiling, structurally unable
  to change any file. See `docs/watchdog.md` for the full reasoning, including why the
  reverted design isn't coming back without a human-approval checkpoint built in.
- ✅ **"Lyrics are all coming out very similar in regards to pattern... people should be able
  to choose more instead of being so limited"** *(founder observation)* — shipped: a
  `/deep-research` pass (104 agents, 22 sources) found two real gaps and grounded the fix —
  rhyme generation was hard-coded to AABB couplets (now a 5-value `rhymeScheme` dial:
  AABB/ABAB/ABBA/AAAA/XAXA) and "Full song" silently duplicated "hook-first" (now genuinely
  longer, per the verified AABA convention). Named presets in `brain/patternPacks.json`. See
  "Pattern packs" in `TODO.md` Shipped + `docs/pattern-packs.md` (which is explicit about
  what's research-verified vs. offered as general craft variety — the research's rhyme-*scheme*-
  to-genre mapping did NOT survive verification, so no pack claims a scheme is "the X genre
  scheme"). Deferred: meter/stress and rap-flow parameters need new syllable-aware generation
  infra, not just a dial — captured in `TODO.md` backlog.
- ✅ **"Make sure Claude API is working, people should be able to edit their lyrics almost
  like the application Scribe"** *(founder directive)* — shipped: a per-line lyric editor
  (`components/hermes/ScribeEditor.tsx`) with an AI-rewrite control per line (Claude Engine,
  in-context alternates) and an explicit Rack "Test key" button that makes a real minimal
  call to confirm a pasted key actually works. See "Scribe line editor" in `TODO.md` Shipped
  + `docs/claude-engine.md`. Deferred for later: drag-to-reorder lines (kept to +/× for scope;
  reordering would need a real drag lib or manual up/down controls — small follow-up, not
  blocking) and a per-section "rewrite the whole verse" AI action (line-level only for now).
- ✅ **"Wire in Claude model now that you have API — upgrade the panel"** *(founder directive)* —
  shipped: the Engine Rack's Claude Engine slot is now a real, interactive bring-your-own-key
  unlock, not just a locked display box. Considered and rejected a founder-funded proxy (would
  violate SECURITY.md's no-proxy-without-rate-limit-and-spend-cap rule, which this repo has no
  infra for); BYOK is the only design that satisfies every existing key-hygiene law without new
  infrastructure — each visitor's own key stays in their own browser and pays for their own
  calls. See the "Claude Engine BYOK panel" entry in `TODO.md` Shipped + `docs/claude-engine.md`.
- ✅ **Claude key in GitHub Actions secrets** *(founder question)* — shipped: the manual
  `claude-compare` workflow reads `ANTHROPIC_API_KEY` from Actions secrets (manual-only,
  least-privilege, fork-safe) and renders the mock-vs-Claude eval table on the run page —
  triggerable from a phone. Rule saved to CLAUDE.md + SECURITY.md.
- ✅ **Status Board — "don't let this happen again"** *(founder, rotted-checklist screenshot)* —
  shipped: every status table generated from `brain/roadmap.json`, drift-tested in CI, hand
  checklists banned outside the allowlist. `STATUS.md` is the board.
- ✅ **Deep Brain Atlas — the subsections** *(founder idea, constellation-brain screenshot)* —
  take the 11-region brain down to its real subsections like human neuroanatomy: each hub fans
  out into named subregions (Broca's/Wernicke's areas, amygdala, ACC, basal ganglia, VTA,
  hippocampal consolidation…), every one honestly mapped to a real module/export that runs
  (`rhyme.ts#rhymeScheme`, `cognition.ts#deliberate`, `edits.ts#diffEdit`…). Constellation
  expansion in the Brain Scan + subsection contributions in the trace explorer. Shipped.
- ✅ **CLAUDE.md memory spine** *(founder idea — "every time you repeat an instruction, save
  it")* — shipped: root CLAUDE.md consolidating the house rules + routing to every memory
  layer, with a guard test so it can't rot.
- ✅ **Traction Sprint** *(3-agent audit)* — all six shipped (#49–#54): (T0 ✅)
  vector-memory determinism hardening; (T1) semantic originality wiring; (T2) close the
  cognition loop (keep|revise→regenerate); (T3) interactive trace explorer + gallery;
  (T4) Council scoring→hook ranking + learn→vector recall; (T5) ARCHITECTURE.md + wiring
  diagram. Full detail in `TODO.md` + `brain/roadmap.json` (tractionSprint) + Notion.
- ✅ **Particle Brain + artist heat-map** *(founder idea)* — shipped: canvas particle layer
  over the SVG brain + a thermal heat-map (`lib/hermes/heat.ts`) coloring regions by the type
  of artist you are; header shows artist type + brain temp. Reduced-motion aware. Feeds the
  Living-Brain dNFT. _(#40)_
- ✅ **Pro Studio Rack** *(founder idea)* — shipped: a DAW-style "🎛️ Engine Rack"
  (`components/hermes/Rack.tsx` + `lib/hermes/engines.ts`) — free Local Combinator active +
  locked Claude/Lightning upgrade slots on the `LyricsProvider` seam. The Claude Engine slot
  now unlocks live, per-visitor, with the *visitor's own* bring-your-own-key (see the BYOK
  capture above); Lightning still awaits a connected server. _(#48)_
- 💭 **HERMES Studio workspace** *(founder idea — "look at Suno's Studio")* — a Suno-Studio-style
  pro workspace: a section/arrangement **timeline** (the song's [Intro]/[Verse]/[Hook] as clips we
  already parse) + the engine **rack** + the **Brain Scan as the meter bridge**. $0 read-only
  timeline now; clip editing later. (roadmap 3.4)
- 🔨 **Runway Gen-4 world/video** *(founder has key + ~1000 credits)* — **adapter shipped +
  live-tested**: `studio/runway.mjs` / `hermes runway` drives Gen-4 Turbo image-to-video, opt-in
  and key-gated (`.env.local`, never committed, never in the free core); confirmed working with a
  real 10s clip. Remaining (founder-paced, see `docs/runway-plan.md`): animate agent avatars,
  generate the HERMES Studio "office/living world" scenes, a landing hero video, real clips.
  (ecosystem)
- 🔨 **Living Brain dNFT + token utility** *(founder idea)* — **near-term step shipped**
  (`lib/hermes/brainSignature.ts`: `brainSignature()` traits + `toNftMetadata()` ERC-721
  shape, $0/no-chain). Remaining: a `/brain/[id]` static render + the actual Solana/Metaplex
  mint (founder). **Value = utility** (compute tier, Crossroads votes, roles, radio/curation)
  + evolving status/provenance + portable G-DJ identity + song royalties. Free core stays
  free; utility/identity framing, not investment promises. (ecosystem)
- 💭 **Discord community server** (founder prefers it over Telegram) — a hub to learn the
  process + contribute; channels, roles, voice listening parties, and a GitHub→Discord
  webhook so repo activity streams in. I can draft the structure + wire the webhook on the
  go-ahead. Optional Telegram announce mirror later.
- 💭 **Diction polish (small)** — the deterministic combinator still lets a few function
  words ("from", "into", "turning") land in noun slots. Add them to the noun-slot stoplist
  (`NOUN_STOP` / `text.ts` STOP) so verses read cleaner. Tiny, helps all generation.
- ✅ **One-command demo** — `npm run demo` generates a full song end-to-end + prints the
  11-region trace (lyrics-focused). The 30-second "see it work" moment. _(#38)_

## ✅ Captured → shipped
- ✅ **Nervous system + short-term/long-term memory** — `brain map` (regions + nerves,
  `lib/hermes/brainMap.ts`), a signal bus (`lib/hermes/nervousSystem.ts`), and decaying
  working memory that **consolidates** into long-term on save (`lib/hermes/workingMemory.ts`).
  The Brain Scan now draws the nerves and **pulses them live** as signals travel, with
  Short-term and Long-term as distinct regions. _(this PR)_
- ✅ **Lyric Lab** (the Writers-Room made visible; artist's hook → real song; trains
  the voice) → `components/hermes/LyricLab.tsx` _(this PR)_
- ✅ **Belief system** (the brain's values) → `brain/beliefs.json` _(#13)_
- ✅ **Writers-Room** (step-by-step craft, assistant not autopilot) → `process.ts` _(#13)_
- ✅ **Persona craft-DNA** (map the mind, never the name) → `brain/personas.json` _(#14)_
- ✅ **Flagship example + Suno handoff** → `examples/cold-hard-gold/` _(#12)_
