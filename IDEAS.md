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
  before committing. **Adapter half DONE (2026-07-03):** `studio/lightning.mjs` +
  `hermes lightning` — a key-gated CLI that POSTs a prompt to a LitServe / Lightning Studios
  endpoint and extracts the lyrics, unit-tested with an injected fetch (no live key needed),
  reading `LIGHTNING_ENDPOINT` + `LIGHTNING_API_KEY` from gitignored `.env.local` only.
  **Live end-to-end run DONE (2026-07-04):** the founder stood up one Lightning Studio
  (Qwen2.5-14B-Instruct behind a LitServe HTTPS endpoint), dropped the two values in
  `.env.local`, and both `node studio/lightning.mjs --ping` and a real `--prompt` call
  round-tripped, returning actual generated lyrics — the adapter contract is proven live.
  Also surfaced: prompting an LLM to hold a rhyme scheme (AABB) isn't reliable (a generic
  prompt broke both couplets; an explicit AABB + tag + banned-word prompt fixed only the
  first), the exact gap HERMES's own engine avoids by guaranteeing rhyme by construction
  (`lib/hermes/rhyme.ts`) — which is why a LoRA fine-tuning smoke test was started on the
  founder's own, separate Lightning-Studio project (not this repo). The real remaining
  piece is the visitor-facing BYOK Lightning slot in the Engine Rack, mirroring
  `lib/hermes/claudeKey.ts`. See `docs/lightning-plan.md`.
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
- ✏️ **WIFI DJ visual redesign — the "Production UI Kit" + Lyrics Editor mockups**
  *(founder-supplied concept images, 2026-07-03)* — a full DAW-style reimagining of
  the Hit Factory UI: a Desktop Studio (sidebar nav, transport bar, track lanes,
  mixer, AI Co-Pilot slide-out, community feed), a Mobile Studio landscape variant,
  a 24-element component library, and a separate Lyrics Editor screen (violet theme,
  inline verse editor with rhyme/word suggestions, section tools, lyric stats).
  Founder's ask: dispatch mapping/architecture/design agents, map every button and
  route into a directory, decide mobile vs. desktop build order, then build —
  design agents get creative license to fill mockup gaps, and two agents agreeing
  on a call is enough to proceed without asking first. Three parallel research
  agents produced the full directory — see `docs/wifi-dj-redesign.md` for the
  complete button-by-button mapping against existing code (what's a restyle vs.
  genuinely net-new) and the phased build plan (roadmap item 8.10). Decided
  mobile-first (matches the existing capability-flag responsive system). Flagged
  two open questions for later: the mockups' DAW mixer/track-lane concept has no
  real multi-stem-audio backing in HERMES today (building it as an honest UI
  metaphor, not a literal claim — same discipline as the Brain Scan's honesty
  rule), and the Lyrics Editor's violet accent vs. the Studio Kit's cyan/magenta
  (treating as same token set, different section accent, until told otherwise).
  Phase 1 (Council redesign + new logo) is in progress now.
  - **Phase 1 outcome — shipped as an interim step (founder's call, 2026-07-04).**
    Two independent
    design agents proposed the redesign (converged closely on a glowing avatar-
    ringed card language, filled+glowing seat chips, a diamond-mark "WiFi DJ"
    logo lockup in the panel header, a violet-tinted verdict card) — implemented,
    then put through 5 build→screenshot→independent-review rounds against the
    mockup: **6 → 8 → 8 → 8 → 8/10**, including a dedicated desktop-specialist
    polish pass (real per-card ambient glow, filled chips) and a mobile-
    specialist pass (tap targets, glow-radius/density tuning at ≤640px) between
    rounds 2 and 3, plus a targeted gradient-opacity fix in round 4→5 after a
    review specifically said the fix was "present in the CSS but doesn't land
    visually." Never reached the founder's 9/10 bar. Per his own instruction —
    "after the fifth attempt then you stop and then ask me for help" — stopped
    rather than keep spending attempts blind. Final review's precise gaps: a
    green/teal hue reads as present in the Challenges bench + default chips
    alongside the mockup's cyan/magenta/amber trio (this is the pre-existing
    `--cyan` token used everywhere else in the app, not a new hue introduced by
    the redesign — noting the reviewer's read, not asserting it's a confirmed
    defect); amber has only one foothold (Agent Pack chips) instead of
    appearing throughout like the mockup; the mockup's Council Card blends both
    hemisphere hues within one card face, while this implementation splits them
    across two different card *types* (one bench per hue) instead. Fully gated
    (tsc/tests/build/mobile-matrix/eval green) on `claude/github-pr-review-z0zjwi`,
    screenshots at `assets/concept-art/council-redesign-attempts/`. Founder's
    call after escalation: "ship 8/10 as interim" — merged as a real, tested
    improvement over the starting point (round 1 was 6/10), not a claim of
    hitting the 9/10 bar. Further palette-balance polish stays open as future
    work (a candidate for a later `hermes-ui` dispatch) rather than blocking
    the rest of the redesign.
  - **Self-expanding UI-agent infrastructure + first de-gray sweep — shipped.**
    Founder: "I don't want you actually doing work you're handing any work
    off... if you see something that needs to be done and there's not an agent
    created for it then you create that gap and the knowledge that you create,
    it's logged in the memory layer." Built a persistent `hermes-ui` subagent
    charter (`.claude/agents/hermes-ui.md`) backed by a new memory layer
    (`brain/uiDesignLanguage.json` — hard rules + a gaps backlog it reads
    before every change, an agent-learnings log it appends after) instead of
    doing the "no grey ingredients" work directly. First dispatch shipped all
    3 queued gaps: header nav split into a primary gradient-pill tier and a
    calmer single-hue utility tier (replacing one undifferentiated flat
    button); the 6 real `<select>` dropdowns (corrected down from an earlier
    "~15" guess) got a dark-fill/glowing-border/custom-chevron treatment
    matched to the mockup's actual dropdown tiles rather than a forced
    gradient; `BottomNav.tsx` got a real active-state matching the Council's
    picked-rank-badge glow. Logged a new gap (a custom listbox component —
    native `<select>` popups can't be restyled past the trigger) and a design
    refinement (not every element should be a bright gradient; some are
    deliberately a calmer single-hue glow) straight into the memory layer for
    the next dispatch to read. See `brain/roadmap.json` 8.12.
- 📊 **Claude Code session-cost characteristics (educational, 2026-07-04)** — a usage
  breakdown of the agent sessions building HERMES, captured so we tune how we work, not the
  product. Observed: **100%** of usage came from *subagent-heavy* sessions (each subagent
  runs its own requests, so spawning them is the main cost lever); **36%** of usage happened
  at **>150k context** (long sessions stay expensive even when cached); **14%** came from
  `general-purpose` subagents specifically; the `/batch` skill was ~2%. Takeaways for future
  work in this repo: (1) be deliberate about spawning subagents and give simpler ones a
  **cheaper model** + tighter prompts; (2) `/compact` mid-task and `/clear` when switching
  tasks to keep context (and cost) down; (3) prefer scoped, single-purpose subagents over
  broad `general-purpose` ones. Not a product feature — a workflow note; no code impact.
- ✅ **Agent Network codenames — from the "sneak peek" box-art** *(founder-supplied concept
  image, 2026-07-03)* — a game-console-style splash for WIFI DJ / Kudbee Studios visualized
  the whole brain metaphor already in this repo (HERMES Core, Crossroads Board, Shared
  Learning, Agent Memory, community feed) plus something new: 7 named "Agent Network"
  companions (Synapse, Vylo, Rhythmix, Lumi, Echo, Harmony, Drifter) with role flavor text
  (Melodic Architect, Vocal Alchemist, Beat Engineer, Sound Designer, Mixing Sage, Harmony
  Weaver, Genre Explorer). Confirmed via `AskUserQuestion` this should reskin the **real
  10-agent pipeline** (`lib/hermes/agents.ts`), not the 6 lyric personas
  (`brain/personas.json`) or the actual `Council.tsx` (which renders agents/guest
  judges/agent packs, not personas). Research found agent `name` strings are baked verbatim
  into committed example fixtures (`examples/*/song.json`, e.g. `"name": "Hooksmith"`) and
  into generated `suggestedNextAction` text — renaming `name` outright would break the
  determinism contract's byte-identical guarantee for existing fixtures. **Shipped instead as
  a display-only `codename` field** (zero determinism-contract risk): Nexus (Conductor),
  Synapse (Hooksmith), Vylo (Lyric Chemist), Rhythmix (Beat Oracle), Echo (Emotion Scanner),
  Sentinel (Originality Auditor), Harmony (A&R Judge), Lumi (Visual Director), Drifter (Viral
  Clip Scout), Beacon (Rights & Release Guard) — shown in `Council.tsx` alongside the
  original functional name. Founder decided the art itself is concept/pitch only, not
  production-ready — saved as reference at `assets/concept-art/` rather than wired into the
  live hero/OG card. Feeds `docs/runway-plan.md` Phase 3 (agent avatars → living characters),
  which was blocked on exactly this naming decision.
  - **Follow-on, same session: `AgentAvatar.tsx` — a $0 SVG glyph per codename.** The literal
    next TODO item (real avatar portraits) is founder-gated on Grok/Gen-4-image generation +
    `RUNWAY_API_KEY` for animation — neither available in this session. Rather than stall,
    shipped the buildable-now piece: a small deterministic line-art glyph per codename (same
    stroke-only SVG style as `BrainScan.tsx`, tinted by hemisphere via `currentColor`, zero
    image assets/API keys/network calls). `AgentCodename` moved to `types.ts` so
    `AgentDefinition.codename` and the glyph map share one type — `tsc` itself now guarantees
    every codename has a glyph. Wired into `Council.tsx`, screenshot-verified live (all 10
    render distinctly, correctly tinted, no console errors).
- 🔨 **`/goal`: per-user Claude brain + real accounts + own memory layer + own launchable
  agent (Lightning)** *(founder directive, 2026-07-03, set as a session `/goal`)* — the
  founder's words: "the Claude API should be tied in and actually generate the lyrics for the
  individual the user and their account they should be logged in and this information should be
  saved then they should have their own memory layer. I actually would like to set up the
  lightning AI and try to get that working... if somebody unlocks their own agent. It would
  allow them to have their own brain. I don't know maybe we can do that with documents locally
  right now and using HERMES like the user can launch their own HERMES Music mobile agent."
  Decomposed honestly into buildable-now ($0/local, no founder decision) vs. genuinely blocked
  (needs the founder's infra/keys — never faked, per the iron laws):
  - **(A) Claude generates the user's real lyrics** — *largely already shipped*: the BYOK
    Claude Engine (`lib/hermes/claudeKey.ts` + `providers/claudeLyricsProvider.ts` + `Rack.tsx`)
    already does real client-side generation from the visitor's own Anthropic key, no server.
    Remaining $0 slice: make it the persistent per-profile default so a signed-in user's brain
    always uses their key. Not yet built.
  - **(B) Their own memory layer / their own brain as documents / launch their own agent** —
    the founder's own $0 escape hatch ("maybe we can do that with documents locally"). ✅
    **First slice shipped this session**: `storage.ts` `exportBrain()`/`importBrain()` +
    `identity.ts` `restoreProfile()` — the WHOLE portable agent as one `hermes-brain` document
    (identity + vault + taste + learned exclusions + alias + notes + favorites), export/import
    from the Vault drawer. Take it to another device or reinstall the PWA and "launch your
    agent as yourself." The BYOK Claude key is deliberately excluded (a downloadable doc with a
    secret in it is a leak — re-enter it on the new device). Playwright-verified the full
    export→wipe-localStorage→import round-trip restores identity + catalog + learned memory.
    This is the local, no-decision-needed version of "their own brain" and pairs with the
    already-shipped PWA install (their HERMES Music *mobile* agent).
  - **(C) Real cross-device accounts (logged in, saved server-side)** — **founder chose
    Supabase** (2026-07-03, via AskUserQuestion — one service gives both auth and a Postgres
    DB for the saved brain). *Still needs the founder's project to go live* (can't be built
    blind — OAuth redirect + RLS can't be tested without a real project + registered redirect
    URI, and unverified auth is the one place "looks done" is worse than "honestly not yet").
    ✅ **Safe scaffold shipped this session**: `lib/hermes/cloudBrain.ts` — the config seam
    (`cloudConfig()`/`cloudEnabled()`, 5 unit tests) that reads `NEXT_PUBLIC_SUPABASE_URL` +
    `NEXT_PUBLIC_SUPABASE_ANON_KEY` and stays a graceful no-op until they're set (same opt-in
    discipline as `vectorMemory.ts`), plus a concrete **5-minute founder checklist** in
    `docs/accounts.md` (create project → enable Google → the `brains` table + RLS SQL → hand
    me the two client-safe values). The moment the founder finishes steps 1–3, the live
    `beginOAuth()` (Supabase redirect) + a Brain-Pack sync layer (`exportBrain`/`importBrain`
    → the `brains` row on sign-in/save) is a small, testable PR — "saved server-side, restored
    on any device" becomes a thin layer over the #171 Brain Pack, not a rewrite. Security: the
    anon key is publishable (RLS is the guard); the `service_role` secret must never touch the
    client. **Update (founder connected the project + gave the publishable key):** a live
    connection check confirmed the key works but found the `brains` table missing + only email
    auth on (Google off, email-confirm on) — see docs/accounts.md. The real auth + sync ENGINE
    is now built + fully unit-tested: `lib/hermes/cloudSync.ts` (raw `fetch` against Supabase's
    GoTrue + PostgREST APIs — no SDK, no new dep, same $0 discipline as Claude BYOK):
    `signUp`/`signIn`/`signOut`/`refresh` + session persistence, and `pushBrain`/`pullBrain`
    upsert/read of the #171 Brain Pack to an RLS-guarded `brains` row, all inert behind the
    config seam. 11 tests cover every request shape against a mocked fetch. Remaining before
    UI-wiring + live test: the two founder dashboard steps (create the `brains` table; turn off
    email-confirmation or enable Google).
  - **(D) Lightning AI — "unlock your own agent / your own brain"** — *live-tested
    2026-07-04*: the founder stood up a Lightning Studio (Qwen2.5-14B-Instruct behind a
    LitServe HTTPS endpoint) and both `--ping` and a real `--prompt` call round-tripped
    end-to-end (already tracked in TODO "Lightning AI spike"). The security laws still
    forbid routing a key through our infra or shipping unattended code-write-and-push, so
    this stays a founder-paced, opt-in provider behind the same adapter seam the
    Claude/Runway engines use — the remaining piece is the visitor-facing BYOK slot, not
    the founder's own endpoint. Not fakeable locally — but (B)'s exportable Brain Pack is
    the "documents locally" stand-in the founder themselves proposed for now.
  Next $0 slices toward the goal (loop will work these): (A) persist the Claude Engine per
  profile; extend the Brain Pack to optionally carry a "bring your key on the new device"
  reminder; a clearer "this is your agent" surface tying identity + brain + PWA-install into
  one "launch your HERMES agent" flow.
  - **✅ "Your Agent" surface shipped this session** (`components/hermes/YourAgent.tsx`): the
    "launch your own HERMES Music mobile agent" framing made real by tying the already-shipped
    pieces into one panel — who you're signed in as, whether your own Claude brain is
    generating (reads `claudeEngineReady()`), your memory stats (vault + badge counts), and the
    two ways to take your agent with you: **Export my Brain** (the #171 Brain Pack) and
    **📲 Install to your phone** (a real `beforeinstallprompt` PWA install button, with an
    honest iOS "Share → Add to Home Screen" hint where that event doesn't fire, and an
    "Installed" chip when already standalone). Crucially, the two founder-gated pieces are shown
    as **honest locked-upgrade rows** — "☁️ Cross-device account sync" (needs a hosted account)
    and "⚡ Lightning-powered agent" (needs a connected Lightning endpoint) — the same
    "never fake it" seam the OAuth buttons and the Rack's Lightning slot already hold, so the
    path is visible without pretending it's live. Additive (new panel in the Keep-stage
    column), zero persistence risk. **Still genuinely blocked on the founder** (unchanged, and
    now clearly surfaced in-app as "soon"): real cross-device account sync + Lightning both need
    the founder's infra/decision; the local-first agent is the honest today-state.
  - **✅ Up-front BYOK Claude key entry (founder request, same session)** — the founder wanted
    to test with their own Anthropic key immediately and hit real friction: the key field lived
    only in the Engine Rack, which appears in studio mode *after* generating a throwaway song.
    Fixed by folding the exact Rack BYOK flow (`setClaudeKey`/`setClaudeEngineActive`/
    `clearClaudeKey`/`testClaudeKey`) directly into the "Your Agent" panel AND rendering that
    panel in **compose mode** — so on the very first screen you can paste your key, "🔌 Test key"
    (one real call to api.anthropic.com), and your first generation uses your own Claude brain,
    no throwaway song. Same security boundary throughout: the key lives only in that browser's
    localStorage and the browser calls Anthropic directly — never a server of ours (Playwright-
    verified with a FAKE key that it's stored only in localStorage and Forget clears it). This
    is the concrete delivery of goal part (A), "Claude API tied in and actually generate the
    lyrics for the individual user," made reachable up front.
- 💭 **Two mobile mockup sets — a structural fix plan + a gamification pass** *(founder
  directive, 2026-07-03, three attachments: a PDF export of the current live app as ground
  truth, plus two mockup images)* — asked for an architecture agent + a design agent to turn
  these into an implementation plan (running as of this capture; outcome to follow in TODO.md
  once synthesized). Two distinct mockups, deliberately not conflated:
  1. **"Mobile Layout Fix Plan"** — a grounded, non-gamified mobile restructuring: sticky top
     app bar, sticky Review/Refine/Keep/Release stepper, an accordion-collapsed Song Lab
     (~15 fields down to key fields + a prominent "Surprise me"), a sticky bottom action bar,
     the Agent Board as tabs (Proposes/Challenges/Judges) instead of one dense grid, Brain
     Recommendations as a swipeable one-card carousel, the Song Package as tabs, a bottom nav
     (Lab/Agents/Brain/Package), plus concrete spacing/typography specs. Mostly CSS/structural
     work on already-shipped components — the lower-risk, more buildable half.
  2. **"HERMES Hit Factory Mobile Upgrade Series"** — a gamification pass: a dashboard with
     XP/energy/streak meters, a quest/chapter "journey" view, the Agent Board as character
     avatars around a "YOU — THE ARTIST" hub, a stepped Song Lab flow, a bracket-style "Hook
     Battle" for picking the lead hook, achievement badges, a collectible-rewards grid, a
     leaderboard + community challenge, and a full-screen confetti "BANGER CONFIRMED" moment.
     Overlaps a lot with the already-queued **"'Becoming You' gamified onboarding — badges +
     the Mogul story arc"** idea above (`lib/hermes/story.ts` chapters already exist) — the two
     agents are checking how much of this is new UI over already-computed data vs. genuinely
     new tracking, and flagging anything that would need a new npm dependency (confetti/carousel/
     gauge libraries) against the $0-core no-new-deps rule.
  **Plan delivered** (architecture agent + design agent, both read the mockups and the real
  code, no edits made): **Phase A (Mockup B, build now)** — 6 same-day PRs in the mockup's own
  order: ① ✅ **shipped this session** — a sticky top app bar, phone-only
  (`device.ui.singleColumn`), hiding the decorative subtitle/mode-badge lines to stay
  compact while pinned; deliberately not the full "logo | hamburger menu" redesign the
  mockup shows — that needs Crossroads/Albums/New/Sign-out collapsed into a real menu,
  scoped as a follow-up, not blocking this PR's real value (Crossroads/Albums/Sign-out
  stay reachable without scrolling back up). ② ✅ **shipped this session** — the Studio Flow
  rail (Review/Refine/Keep/Release/Studio) is now sticky too, flush under the sticky top app
  bar (a `ResizeObserver`-measured header height feeds the rail's inline `top` offset, so it
  doesn't drift if the header's wrap height changes) — matches the mockup's "Progress Steps
  (sticky)" step, distinct from the bottom nav (this shows/switches which *stage* you're in;
  the bottom nav jumps between different *panels*). Correction to the original plan text:
  ended up reusing `device.ui.singleColumn` (the same flag the header and bottom nav use),
  not `stickyPrimaryAction`/`bottomSheets` — those two remain genuinely unused, a real
  follow-up if a future PR wants a sticky primary CTA above the keyboard or bottom-sheet-style
  drawers. ③ ✅ **shipped this session** — `SongLabForm.tsx`'s ~10 secondary fields
  (tempo/occasion, voice/audience/references/do-not-use, pattern-pack/structure/rhyme) now
  collapse into three named accordion sections on phone, reusing the exact `showAvoid`
  disclosure pattern (a clickable `panelTitle` row + `+`/`–`); the four key fields
  (title/theme/mood/genre) plus Surprise-me/Load-example stay always visible above them,
  matching the mockup's "show only key fields first." Desktop is a pure passthrough — the
  `Section` wrapper renders its children directly with no toggle UI when `!accordion`, so
  desktop's layout is byte-identical to before. ④ ✅ **shipped this session, risk handled
  as flagged** — Agent Board Proposes/Challenges/Judges tabs (a third bucket pulled out of
  Council.tsx's Proposes/Challenges hemisphere split, for the two agents whose role is a
  verdict — A&R Judge/Rights & Release Guard — not a critique). Read `AgentBoard.tsx`'s
  connector-line logic first, as instructed: it measures BOTH endpoint cards via
  `cardRefs`/`getBoundingClientRect()`, and the single most interesting connector case (a
  signal crossing hemispheres) is exactly the case that would span two different tabs — so
  went with the "keep all cards mounted, only change visual density" option, not a drawing
  fallback. All 10 cards stay mounted on every tab; a non-active-bucket card collapses to a
  real, positioned one-line chip (`data-collapsed`, CSS-only) instead of unmounting, so
  `cardRefs` stays fully populated and the connector math is completely unchanged.
  Playwright-verified structurally, not just visually: read every card's
  `getBoundingClientRect()` while the Judges tab was active and confirmed all 10 have
  non-zero width/height and are still `document.contains()`-true — the 8.2 "it's literally
  them thinking" feature keeps working across every tab combination. ⑤ ✅ **shipped this
  session** — a bottom nav (`BottomNav.tsx`: Lab/Council/Studio/
  Package/Vault, scrolling to anchors that already existed via the Studio Flow rail's own
  `focusFlowStage`/`FLOW_ANCHOR` mechanism — also closes the Suno-idea "Council globally
  wired" ask above in the same PR), ⑥ a spacing/typography audit (mostly already shipped,
  closing small gaps, still open — the only unshipped Phase A step). **Phase A ①-⑤ all
  shipped this session** (5 PRs: HERMES Studio was actually 3.4/piece-3 above, then bottom
  nav, sticky header, sticky rail, Song Lab accordion, Agent Board tabs). **Phase B
  (Mockup A, mixed verdict)** — the design agent's real opinion: decline the neon-trophy-
  confetti visual language outright (a genuine identity clash with the shipped "brain, not a
  game" aesthetic — see `BangerScoreCard.tsx`'s own "not a market or A&R prediction" copy) but
  build the retention *mechanics* underneath it, because nearly all of them already have a
  home: Hook Battle is a reskin of `rankHooksByCouncil()` (zero new logic — build first) — ✅
  **shipped this session**: `components/hermes/HookBattle.tsx`, a single-elimination bracket
  over the same top 2-4 council-ranked hooks Council.tsx already shows as a flat list
  (`rankHooksByCouncil(pkg.hookOptions, pkg.inputs, pkg.sections)`, no taste-personalization
  wiring needed to keep the change self-contained). Sits alongside the existing flat list in
  `SongPackageView.tsx` (a "⚔️ Hook Battle" / "☰ Show as a list" toggle), not a replacement —
  the simple picker still works standalone. Picking the bracket's final winner calls the
  exact same `onChooseHook` the flat list already used, so it's wired into the real
  re-scoring pipeline, not a UI-only mockup. Playwright-verified live: a real 4-seed bracket
  round rendered with correct stickiness metadata, picked both round-1 winners, the final
  round correctly narrowed to 2, picked the champion, confirmed the 🏆 Winner card rendered
  with the right hook text, and confirmed the song package genuinely re-scored (v1→v2, the
  Council's deliberation panel flipped to "✓ true to the brief ✓ original ✓ earn it") —
  proof this reuses the real pipeline, not a fake win screen. XP/levels reads
  `becomingYou.youPercent` + `pkg.score`'s 7 subcategories (new presentation
  only), streaks extend `heat.ts`, quests/chapters extend `story.ts` (a new `hermes.quests.v1`
  key for session-scoped counters, same `.bak`-mirror shape as every other store), confetti is
  a hand-rolled canvas particle burst same house pattern as `BrainScan.tsx` (no library — the
  $0-core no-new-deps rule holds). This is explicitly the SAME arc as the already-queued
  "'Becoming You' gamified onboarding — badges + the Mogul story arc" idea above — treat as one
  arc, not two. **Parked, not built**: a real leaderboard/community-challenge — needs
  cross-visitor data aggregation the static $0 core structurally can't provide, same blocker
  already logged twice (Live Multiplayer Council, the WIFI-radio jukebox). Cross-cutting risk
  flagged by both agents: `FLOW_ANCHOR`'s five DOM ids (`stage-review`/`song-lyrics`/
  `stage-keep`/`song-toolbar`/`stage-studio`) are literal scroll targets — any restructuring PR
  must keep them wired or update the map in the same PR. Founder to pick a starting PR; full
  reasoning in the two agents' reports (not persisted verbatim — available on request).
- 💭 **Suno-inspired global nav + Council "wired everywhere" + dream-big Studio + wallet/fiat
  sign-up** *(founder idea, 2026-07-03, five Suno reference screenshots — continuing a
  session that ran out of Fable 5 credits mid-conversation; no code was left in progress,
  `main`/this branch were identical and TODO/IDEAS were already current, so this is a fresh
  capture, not a resume)* — four related asks from the reference images:
  1. **A persistent bottom nav bar** (mobile) that switches between top-level areas the way
     Suno's app does (Home / Explore / Create / Library / Profile icons pinned to the bottom
     of every screen). ✅ **shipped this session**: `components/hermes/BottomNav.tsx` —
     Lab/Council/Studio/Package/Vault, phone-only (`device.ui.singleColumn`, the first real
     consumer of that computed-but-previously-unused device flag), Lab/Vault always active,
     the other three disabled until a song exists. Not a cross-*route* nav (that would need
     the separate `/`, `/crossroads`, `/hit-factory` pages to share state they don't have) —
     scoped to a within-`/hermes` quick-jump, which is what both the Suno reference and the
     mobile-mockup-plan artifact's Phase A step ⑤ actually called for.
  2. **The Council "globally wired"** — the founder read Suno Studio's single integrated
     workspace (audio, lyrics, styles, timeline, cover art all visible + linked together at
     once, screenshot 1) as a model for how the Council should feel: reachable from
     anywhere, not buried inside the Studio Flow rail (8.1) as one panel among many. ✅
     **shipped this session, same PR as piece 1**: Council is now a bottom-nav destination
     (`focusFlowStage('review')`, the exact mechanism the Studio Flow rail's own Review tab
     already used) — one tap from anywhere on a phone, not conditional on which flow stage
     you happened to be in.
  3. **"Studio" — dream big** (screenshot 3, Suno's own Studio upsell modal: "Your complete
     creative workspace") — ✅ **shipped this session**: `components/hermes/Studio.tsx`, a
     read-only arrangement timeline (the song's real sections as clips, sized off the
     existing runtime-estimate rule) + a "meter bridge" reading the real 11-region brain
     state, wired as a 5th Studio Flow rail tab that ring-highlights alongside the
     already-existing Brain Scan and Engine Rack rather than duplicating either. See
     TODO.md Shipped ("HERMES Studio workspace — the arrangement timeline, roadmap 3.4").
     Clip editing stays a later step, per the original scope note.
  4. **Sign-up: wallet OR any other account, plus a currency conversion** (screenshots 4-5,
     Suno's own sign-up modal: Google/Apple/Phone + Discord/Facebook/Microsoft) — founder
     wants two paths: sign up with a **Blockchain wallet** (this repo already plans Solana —
     see the Living Brain dNFT entry + the landing page's parked wallet-connect slot), or
     sign up with **any other account** (email/Google/etc.) — and whichever path someone
     *didn't* pick, offer a **currency conversion** between crypto and fiat (e.g. show a
     wallet user their balance in USD, or a fiat user what their subscription costs in
     SOL/USDC). Real tension with the iron laws worth flagging before building: this needs a
     **live exchange-rate lookup**, which is a network call — the same category of decision
     already flagged as blocked on the founder in the "Accounts / sign-in" TODO item (needs a
     real hosted-auth provider + OAuth app registration) and the Solana wallet-connect slot in
     `Landing.tsx`. A **BYOK-style pattern** (the visitor's own browser calling a public
     exchange-rate API directly, same shape as `lib/hermes/claudeKey.ts` — no founder server,
     no founder key) could keep a *display-only* conversion inside the $0 rules; real wallet
     auth + real account auth both still need the founder's hosted-auth decision first.
  Pieces 1-3 shipped this session (see above). Piece 4 splits into a buildable-now UI (the
  sign-up modal itself, wallet-or-account choice, BYOK-style display conversion) and a
  founder-blocked piece (real wallet connect + real account auth), same shape as the existing
  "Accounts / sign-in" item. Not started.
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
  - ✅ **📋 Copy JSON to clipboard** — a "📋 Copy JSON" button next to the existing
    Export JSON download, mirroring the Copy lyrics/Copy Suno prompt pattern
    exactly. Download stays for backup/re-import; copy is for a quick paste
    elsewhere. See TODO.md Shipped.
  - ✅ **/ jumps to the Vault search box** — a window-level `/` shortcut
    (GitHub/Slack convention) focuses the Vault search box, guarded so it never
    hijacks a literal `/` typed into a rename box or note field. See TODO.md
    Shipped.
  - ✅ **🔽 Vault sort toggle** — a "Sort the vault" dropdown (Newest first /
    Oldest first / Title A–Z), reorders under the existing favorites-first
    sort rather than replacing it. Dropped a stale queued candidate in the
    same round: "share link" copy button turned out to already be shipped
    (`SongPackageView.tsx`'s 🔗 Share button). See TODO.md Shipped.
  - ✅ **📋 Copy all lyrics — bulk vault export** — one clipboard copy of every
    song's title + lyrics, `---`-separated, for archiving the whole catalog at
    once instead of one song's "Copy lyrics" at a time. See TODO.md Shipped.
  - ✅ **🔀 Duplicate + rename in one motion** — the duplicate button now opens
    the fork's rename box immediately, pre-filled with its "(copy)" title,
    instead of leaving the artist to hunt for the new row and click rename
    separately. See TODO.md Shipped.
  - ✅ **📅 "N songs today" stat in the Vault header** — a momentum stat next to
    the flat total count, hidden on days with nothing generated yet. See
    TODO.md Shipped.
  - ✅ **📄 Copy all as Markdown — bulk vault export, richer format** — reuses
    the same per-song `songMarkdown()` formatter Export Markdown already uses,
    across the whole vault at once, `---`-separated. See TODO.md Shipped.
  - ✅ **🗑 Clear all vault notes** — a confirm-gated one-click reset for the
    per-song notes list, mirroring 7.17's clear-all-avoid-words pattern. See
    TODO.md Shipped.
  **Cadence paused here at 7.25** *(founder directive, 2026-07-03 — "finish up
  your last little feature and then stop... let's come up with medium sized
  features that are more focused on application flow, UI integration, also
  utilizing the API more")*. Remaining un-shipped candidates left parked for
  whenever tiny-feature work resumes: a "longest streak" stat alongside "songs
  today" (consecutive days with at least one song saved), a per-song
  "download as .txt" button for plain-text-only lyrics (today it's
  Markdown/JSON download or clipboard-only for plain text).
- 🔨 **Medium-feature plan (post-tiny-cadence)** *(founder directive, 2026-07-03 —
  "come up with a plan instead of having and creating little features")* — a
  research agent (drafted on Fable 5, per founder's model preference) audited
  the codebase and proposed six coherent, multi-PR capabilities, each checked
  against the iron laws (no determinism-contract changes, no new $0-core
  runtime deps, BYOK key stays browser-only): **Producer's Chair** (AI review
  of a finished song via the Engine Rack), **Talk to the Brain** (conversational
  natural-language lyric editing), **Brief Interpreter** (one messy sentence →
  a full Song Lab brief), **Artist HQ** (unifying the app's scattered taste/
  voice/identity learning into one steering surface — works with no key),
  **Council load-bearing** (the four already-designed queued Council/Crossroads
  steps, roadmap 2.6, packaged as one arc), and **Studio Flow** (a Review →
  Refine → Keep → Release rail staging studio mode's ~10 panels into one
  journey). Full plan text delivered to the founder in-conversation. Founder
  picked **Studio Flow** to start — tracked as its own roadmap phase
  (`brain/roadmap.json` phase 8, "Medium features — the planned arc") rather
  than folded into the closed phase 7. PR1 (the rail + stage state, item 8.1)
  shipped. PR2 (Release-desk regroup) and PR3 (mobile pass) queued next. The
  other five proposals stay parked here as candidates for whenever the founder
  wants to pick the next arc.
  - ✅ **8.2 — Agent Board upgrade: live connection lines + terminal signal
    ticker** *(founder: "it's literally them thinking")* — surfaces
    `nervousSystem.ts`'s already-computed `Signal` bus (previously invisible)
    as animated connector lines between agent cards + a retro-terminal-styled
    live transcript. See TODO.md Shipped.
- 🔨 **The Council as a real plug-in architecture** *(founder directive,
  2026-07-03 — "if we were to connect another panel or another council into
  this, that would alter... the outcome... come up with three ideas that
  would make this take #1 on the App Store")* — audited the code: `AgentId`
  (`lib/hermes/types.ts`) is a closed 10-agent union and `COUNCIL_WEIGHTS`
  (`lib/hermes/council.ts`) is a hardcoded 3–4-voice object — today there is
  no real extension point, despite the app's own "rack" metaphor (the Engine
  Rack already proves swappable engines work). Proposed making the Council's
  voices an open, weighted registry (`CouncilVoice[]`, renormalized to 100 as
  voices are added/removed) as the prerequisite, then three ideas built on it:
  **Guest Judges** (selectable persona voices — "the A&R exec," "the TikTok
  algorithm," "your mom" — each a pluggable scoring lens), **Agent Packs**
  (genre/culture bundles that each register a new agent + Council voice,
  reusing the patternPacks/occasionPacks precedent — an "app store inside the
  app"), and **Live Multiplayer Council** (friends/fans vote live on hooks via
  a share link, becoming a real-time "Crowd" voice). Founder approved all
  three ("implement all of that"). **Live Multiplayer Council is genuinely
  blocked**: it needs real-time cross-device vote aggregation, which needs a
  backend the $0 static-export core doesn't have — same blocker already
  documented for the WIFI-radio jukebox idea (`crossroadsBoard`'s unbuilt
  stage-4 opt-in backend). Not faking a local approximation; parked here until
  that backend exists.
  - ✅ **8.3 — Council-voice-registry refactor shipped.** `rankHooksByCouncil()`
    now takes an optional `guestVoices: CouncilVoice[]` parameter, each voice a
    `{id, label, weight, score(ctx)}` plug-in capped at 50% combined share of
    the final score. Byte-identical to the pre-existing computation when no
    guest voices are supplied (+6 tests prove it, all 15 pre-existing tests
    pass unchanged).
  - ✅ **8.4 — Guest Judges shipped.** Three deterministic personas (The A&R
    Exec, The TikTok Algorithm, Your Mom) built on real `lexicon.ts` data,
    toggleable as chips in `Council.tsx`, seated per-session only. See TODO.md
    Shipped.
  - ✅ **8.5 — Agent Packs MVP shipped.** Scoped down from "new agent + new
    voice" to genre/scene Council voices only (a new pipeline agent would mean
    extending the closed `AgentId` union through the deterministic core — too
    big/risky for an MVP). Three packs (Boom-Bap Traditionalist, Pop Radio,
    Poetry Slam), same registry mechanism as Guest Judges, combine freely with
    them. See TODO.md Shipped.
  - This closes out the Council plug-in arc for now (8.3-8.5 shipped; Live
    Multiplayer Council stays blocked per above). A genuinely new pipeline
    agent (extending `AgentId`) remains a bigger, separately-scoped idea if
    the founder wants it later.
- 🔨 **"Becoming You" gamified onboarding — badges + the Mogul story arc**
  *(founder idea, 2026-07-03 — "people earn badges like you want to become
  the next Mogul... create the next hit, the greatest number one on the
  Billboard charts... we can almost create a story out of it")* — this isn't
  a from-scratch ask: `lib/hermes/story.ts` already has exactly this shape,
  just not surfaced as a real onboarding experience. `CHAPTERS` is a real
  progression system today — First Spark → Finding Your Voice → First Banger
  → The Album — each with an explicit unlock condition (`unlockedChapters()`,
  `currentChapter()`, `nextUnlock()`) driven by song count, best banger score,
  and `becomingYou` percentage; `deriveArtist()` (`artist.ts`) already reads
  the current chapter into the artist bio shown on `ArtistCard`. The founder's
  ask is the natural extension: (1) more chapters carrying the arc further —
  a "Certified Banger" tier, a "Chart Contender" tier tied to a Billboard-style
  framing, maybe a "Mogul" capstone; (2) a real **badge** system — discrete,
  named achievements (first 90+ banger, first Council-flipped ranking via a
  Guest Judge, first shared gift, first Story-Mode chapter unlock) rendered
  as a collectible strip, not just the single current-chapter line it is
  today; (3) an onboarding surface that actually walks a new visitor through
  it instead of it living quietly inside `ArtistCard`. Founder separately
  noted Runway API access is already configured (~1000 credits — see the
  "Runway Gen-4 world/video" entry below) as a possible resource, e.g. a
  short cinematic moment rendered on a badge unlock. Needs real design before
  building the full arc (more chapters, a real onboarding surface, Runway
  moments) — but item (2), a real **badge system**, is a well-scoped medium
  slice on its own, and its own first step ("map every badge-worthy moment
  already computable from existing data before inventing new tracking") is
  now ✅ **done, this session**: new `lib/hermes/badges.ts` `computeBadges()`
  — a pure, unit-tested function (9 tests) awarding discrete badges purely
  from data that already exists, zero new tracking: one badge per unlocked
  Story chapter beyond the trivial "First Spark" (reuses `unlockedChapters()`
  as-is), 🌟 Certified Banger (any vault song scoring 90+), 🎯 Sharp Ear (any
  song at 100/100 uniqueness), 🎁 Gift Giver (used an Occasion Pack), ✂️
  Editor (`taste.edits > 0`), 🗃️ Prolific (10+ vault songs). Rendered as the
  actual "collectible strip" the founder's ask called for, replacing
  `ArtistCard`'s single current-chapter line: a "🏅 Badges (N)" chip row.
  Playwright-verified live on the demo song ("Cold Hard Gold," 99/100,
  100/100 unique): correctly earned exactly 3 badges (First Banger chapter,
  Certified Banger, Sharp Ear), zero console errors. **Deferred, still
  genuinely uncomputable from existing per-song data**: a "first Council-
  flipped ranking via a Guest Judge" badge — seating a Guest Judge and
  seeing it change the top hook is a live Council-panel interaction, not
  something persisted onto the saved `SongPackage`, so it can't be
  retroactively detected from vault data the way the other badges are; would
  need new tracking (e.g. a flag recorded at save time), which is exactly
  the "don't invent new tracking yet" line this pass was scoped to respect.
  Still open from the fuller vision: more chapters, the onboarding-surface
  walkthrough, Runway moments — all bigger, separately-scoped work.
- 🔨 **Agent personality plug-ins** *(founder idea, 2026-07-03 — "some sort of
  personality feature... some sort of plug-in people could select for each
  agent")* — related to but distinct from the Council-voice-registry above:
  that one is pluggable *scoring/ranking* voices, this is pluggable
  *generation-time behavior* per agent (e.g. Hooksmith running an "aggressive"
  vs. "gentle" mode). Same underlying registry pattern, applied one layer
  earlier in the pipeline. Design queued behind the voice-registry PR so it
  can reuse the same plug-in shape once that lands.
- 🔨 **Lyric editing polish — inline thesaurus + live re-scoring** *(founder
  directive, 2026-07-03 — "polishing off the lyric area and editing... an
  inline dictionary/thesaurus... really easy edit ability, and then that
  needs to be recognized throughout... globally")* — two related gaps:
  (1) a synonym/definition popup while editing, parallel to the existing
  click-a-word rhyme helper in `SongPackageView.tsx` (which already does
  click-a-word → `rhymesWith()`) — same interaction, a thesaurus lookup
  instead of a rhyme lookup; (2) today a saved lyric edit likely only updates
  the raw text without re-running the Banger Score / Uniqueness Report /
  Council ranking against the new words, so the rest of the studio view goes
  stale after an edit. Needs investigating `saveLyricEdit` in
  `HermesHitFactory.tsx` to confirm the exact gap, then a deterministic,
  no-network re-score-on-edit path so editing a lyric visibly ripples through
  the whole panel, not just the text box. Two separate PRs queued.
  - ✅ **8.6 — Word ideas popup shipped.** New `lexicon.ts` `similarWords()` +
    a double-click popup in `ScribeEditor.tsx`. Honestly framed as
    "similar in feel" (imagery + affect), not a claimed thesaurus — the
    lexicon has no synonym data. See TODO.md Shipped.
  - ✅ **8.7 — live re-scoring on edit shipped.** Confirmed the gap (Banger
    Score/Uniqueness/clips did go stale after a saved edit; Council's ranking
    did not, since it already reads `pkg.sections` fresh). Fixed via the same
    pure pipeline functions replayed against the edit. This closes out the
    lyric-editing-polish arc (8.6-8.7). See TODO.md Shipped.
- ✅ **"SCRIBE... completely copy how this application functions... apply it to
  our lyrical area"** *(founder directive, 2026-07-03)* — researched Scribe
  (scribehow.com/scribe.com): it auto-converts a recorded real-world workflow
  into an annotated step-by-step guide (screenshots + text per step), not a
  songwriting app — no dedicated lyric-writing "Scribe" product exists. Asked
  via `AskUserQuestion` which interpretation to build: an auto-generated
  "how this song was written" replay, or a guided onboarding tour of the
  editor itself. Founder picked **the guided tour**. Shipped as item 8.8 (new
  `GuidedTour.tsx` + 5 coach-mark steps in `ScribeEditor.tsx`). The "replay
  how a song was written" interpretation stays parked here as a genuinely
  different, bigger idea if wanted later — it would build on the existing
  version-history + brain-trace explainer (`buildTrace()`/`renderTraceHtml()`)
  to auto-capture each meaningful edit/hook-choice as a "step" with a
  before/after snapshot, closer to Scribe's actual mechanic than the
  onboarding tour is.
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
