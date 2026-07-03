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
- ✅ **"Holiday song packs... what would be another feature that could sell something like
  this?"** *(founder idea + prompt, 2026-07-03)* — **Occasion Packs shipped** (roadmap 5.8):
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
