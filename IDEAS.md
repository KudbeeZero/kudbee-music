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

### 1. The Brain Scan — a living brain that lights up as it thinks  💭
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

### 2. The Council — the agents as a deliberating board  💭
Render the 10 agents as a **council** around the brain (the "Crossroads Board"): right
hemisphere proposes, left hemisphere challenges, the artist decides. Show the
back-and-forth, not just final outputs.

### 3. Cognitive model — first thought → second thought → decision  ✏️
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

---

## 🌐 Platform / ecosystem
- 💭 **wifidj.xyz as the front door** — point the (Cloudflare-fronted) domain at the
  Vercel deploy / docs site once we're ready to go public.
- 💭 **Crossroads Board / Solana / token / NFT** — the Web3 governance layer integrates
  with this engine **via API**; kept out of the core so the brain stays free + local.
- 💭 **Durable cloud brain** — optional Notion / Google Drive backing so a cleared
  browser never loses the vault (fixes the localStorage weakness).
- 💭 **Reference study (opt-in)** — Spotify to study a *described* sound (never names),
  feeding the persona match.

## 🧬 Brain / engine
- ✏️ **Rhyme architect + syllabic constraint layer** (framework Part 2) — real rhyme
  scheme + meter in the generation engine.
- ✏️ **Real LLM provider** behind the adapter (opt-in, behind a key; mock stays default).
- 💭 **Influence Studio** — describe a feel → thematic cartography + architectural
  blueprint → craft parameters (original-only).

## 🎨 Visual / UX
- 🔨 **Lyric Lab UI** — the Writers-Room + persona picker, made visible (next build).
- 💭 **Brain-scan boot sequence** on song start (see flagship #1).
- 💭 **"It's becoming you"** — surface, over time, how much of the current song came
  from the artist's own learned voice vs fresh suggestion.

---

## ✅ Captured → shipped
- ✅ **Belief system** (the brain's values) → `brain/beliefs.json` _(#13)_
- ✅ **Writers-Room** (step-by-step craft, assistant not autopilot) → `process.ts` _(#13)_
- ✅ **Persona craft-DNA** (map the mind, never the name) → `brain/personas.json` _(#14)_
- ✅ **Flagship example + Suno handoff** → `examples/cold-hard-gold/` _(#12)_
