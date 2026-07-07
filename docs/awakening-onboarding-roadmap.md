# The Awakening — a Council-driven onboarding, and the Lego data layer under it

**What this is / who reads it:** the founder's own words, made concrete: *"the brain having
a really cool interactive startup where it asked the person a series of questions... taking
me into a council that doesn't have everything in it... things should be able to unlock...
build on top of what we currently have."* This is the roadmap for that — five features,
five sub-items each, every recommendation grounded in a real, verified file in this repo
(not invented). Read this before building any part of the new onboarding flow.

**The one-sentence finding that reframes everything:** this isn't a new feature. `IDEAS.md`
(2026-07-03, the "Becoming You" gamified-onboarding capture) already names *"an onboarding
surface that actually walks a new visitor through it"* as the still-open third piece of an
arc whose first two pieces (chapters, badges) already shipped. This roadmap finishes that
arc — it doesn't start a parallel one.

---

## What's already true (so this doesn't reinvent anything)

Verified by reading the actual code, not assumed:

| Exists today | Where | State |
|---|---|---|
| Progressive-unlock chapters | `lib/hermes/story.ts` — `CHAPTERS`, `unlockedChapters()`, `nextUnlock()` | ✅ live, 4 chapters |
| A "feeling of ownership" artist identity | `lib/hermes/artist.ts` — `deriveArtist()`, `components/hermes/ArtistCard.tsx` | ✅ live |
| A scoped-down-Council seam | `lib/hermes/council.ts`'s `CouncilVoice` interface (already used by Guest Judges + Agent Packs) | ✅ live, proven pattern |
| A step-by-step question wizard | `components/hermes/LyricLab.tsx` — step rail, commit/undo, back-nav | ✅ live (hardwired to lyric-writing) |
| A locked→unlocked visual pattern | `components/hermes/Rack.tsx` (Claude slot only) | ✅ live for Claude; **Lightning's version is dead code** |
| A generic coach-mark tour | `components/hermes/GuidedTour.tsx` | ✅ live, but scoped to `ScribeEditor.tsx` only — was meant to cover onboarding per IDEAS.md |
| 8 real plugins, tier-gated | `lib/hermes/plugins.ts` | ✅ built |
| A plugin marketplace UI | `components/hermes/PluginMarketplace.tsx` | 🔌 **built but never imported anywhere — orphaned** |
| Real subscription tiers + feature flags | `lib/hermes/subscription.ts` — `hasFeature()` | ✅ live (no payment processing yet) |
| Per-agent contribution tracking | `lib/hermes/agentLifecycle.ts` | 🔌 **built, zero UI, no test file** |
| A "not everything is available yet" UI language | `components/tde/SafetyGatePanel.tsx` + `docs/kudbee-tde-backend-bridge.md` | ✅ live (philosophy/tone reference, not a reusable component) |
| Per-visitor unlock state on the brain map | `lib/hermes/brainMap.ts` | ❌ does not exist — `REGIONS`/`SUBREGIONS` are visitor-agnostic today |

The pattern across every 🔌 row: **built, unused.** Before this roadmap adds anything new,
it should wire up what's already sitting finished in the repo.

---

## Architecture — the "Lego" data layer (worked in as requested)

Everything in Features 2–5 below is a **brick**: a plugin, a Council voice, an engine slot,
an onboarding module, a future model. Today each of those has its *own* one-off gating logic
(`plugins.ts`'s `tierCanAccessPlugin`, `Rack.tsx`'s hand-rolled `hasClaudeKey` check,
`story.ts`'s `CHAPTERS.unlock()`). The founder's ask — *"tie in to a Lego system... worked
into the architecture"* — means collapsing that into **one shared contract** every brick
implements, so a new plugin, a new Council voice, or a new model slot all snap into the same
unlock/registry/gating machinery instead of each inventing its own.

```ts
// lib/hermes/bricks.ts (new)
export type BrickKind = 'plugin' | 'council-voice' | 'engine-slot' | 'onboarding-module' | 'model';

export interface Brick {
  id: string;
  kind: BrickKind;
  label: string;
  minTier: SubscriptionTier;              // reuses subscription.ts's existing enum
  unlock: (progress: StoryProgress) => boolean;  // reuses story.ts's existing shape
  unlockHint: string;                     // same field name Rack.tsx's ENGINE_UNITS already uses
}
```

This is additive, not a rewrite: `plugins.ts`'s `FIRST_PARTY_PLUGINS`, `council.ts`'s
`CouncilVoice`s, and `engines.ts`'s `ENGINE_UNITS` all already carry 90% of these fields
under different names — the work is a thin adapter layer + one central registry, not
re-architecting three working systems.

### 1. The Lego Data Layer

1. **`Brick` contract** (`lib/hermes/bricks.ts`) — the shape above. One TypeScript interface,
   zero runtime behavior of its own.
2. **Generalize `StoryProgress`/`CHAPTERS` into a reusable unlock-condition engine** — today
   `unlock: (p: StoryProgress) => boolean` is hardwired to 4 chapters; extract it as the
   generic unlock-predicate type every `Brick.unlock` uses, so a plugin and a chapter check
   "have you unlocked this" the exact same way.
3. **A central brick registry** (`allBricks()`) mirroring `plugins.ts`'s `FIRST_PARTY_PLUGINS`
   pattern — one array combining adapted views of `FIRST_PARTY_PLUGINS`, `SEATABLE`
   (Council voices), and `ENGINE_UNITS`, so "what can this visitor unlock next" is one query,
   not three.
4. **`hasFeature()` as the single tier-gate** every brick's `minTier` check calls — already
   built in `subscription.ts`, just needs to be the *one* place tier logic lives instead of
   being re-implemented per-system (`tierCanAccessPlugin` currently duplicates this).
5. **Persistence**: `hermes.unlocks.v1` — a new localStorage key, `.bak`-mirrored and
   profile-namespaced exactly like every other vault key (`storage.ts`'s existing
   convention), storing which bricks *this* visitor has unlocked. This is the missing piece
   `brainMap.ts` flagged as absent — the first real per-visitor unlock state in the app.

---

## Feature 2 — The Awakening (the onboarding sequence itself)

The actual "brain asks you questions, animations, feels like ownership" experience.

1. **Entry point** — branch inside `WelcomeGate.tsx`'s existing `onEnter(profile)` callback,
   *before* `HermesHitFactory.tsx` lands the visitor in `mode === 'compose'`. This is the
   literal, already-identified insertion point — today `onEnter` goes straight to compose.
2. **Scripted brain-boot intro** — a canned variant of `BrainScan.tsx`'s scanline + `HeatField`
   particle animation. Today that animation is *live-tied* to real `AgentOutput` status
   (`running` prop) — it needs a scripted-sequence mode that fires a canned wake-up pattern
   instead of reacting to a real pipeline run. Same component, new prop, not a rewrite.
3. **The mini-Council** — 2–3 `CouncilVoice`-shaped seats (built the same way Guest Judges /
   Agent Packs already are: `{id, label, weight, score}`) ask the onboarding questions. This
   satisfies *"a council that doesn't have everything in it"* precisely — it reuses the real
   plug-in interface without touching the actual 10-agent `AgentId` pipeline, the same
   deliberate scoping choice already made for 8.3–8.5.
4. **The step wizard shell** — reuse `LyricLab.tsx`'s step-rail / commit / undo / back-nav
   state machine wholesale (it's the closest existing match to "a series of questions with
   animations between them, not linear-only"). Needs one new thing: an onboarding-specific
   `guideOnboardingStep()` (a sibling of `process.ts`'s `guideStep()`, not a replacement —
   that one stays hardwired to lyric-writing on purpose).
5. **The reveal** — lands the visitor **formally into the existing Story Mode Chapter 1,
   "First Spark"** (`unlock: () => true`, already always-unlocked) with `ArtistCard`
   populated and 1–2 starter bricks unlocked via the Feature 1 registry. No new reveal UI
   needed — `ArtistCard.tsx` already renders exactly this.

---

## Feature 3 — Finish what's already built (prerequisite / parallel wiring)

Every 🔌 row from the table above, made real. This can run in parallel with Feature 2 — none
of it blocks the other, and some of it (3.3) directly serves what this session already built.

1. **Wire `PluginMarketplace.tsx` into the app.** It's a complete component with zero
   importers — add it as a real route/panel (Studio Flow tab, or its own nav entry).
2. **Build a UI for `agentLifecycle.ts`.** `selectTopAgentsByContribution()` and
   `selectAgentByIdWithCollaborators()` already produce exactly the shape a "meet your
   agents" panel needs — a genuinely $0 UI-only PR on top of a finished data layer. Note: for
   a brand-new visitor with 0 songs, this returns the all-zero baseline — useful for
   *introducing* the roster, not for showing earned history on day one.
3. **Actually build the Lightning key unlock UI in `Rack.tsx`.** `lightningKey.ts`'s
   `setLightningEndpoint`/`setLightningApiKey` are dead code today — mirror the Claude slot's
   working unlock flow exactly. This is the same UI the free-CPU Ollama stand-in endpoint
   (this session's other active thread) needs in order to be paste-able on the live site —
   building it here serves both efforts at once.
4. **Extend `GuidedTour` beyond `ScribeEditor`.** Already founder-documented intent
   (IDEAS.md) that got scope-cut to one editor. `GuidedTour`'s `{selector,title,body}` shape
   is generic and selector-driven — reusable as-is for a coach-mark layer over Feature 2's
   flow, or over the main app immediately after onboarding.
5. **Extend `brainMap.ts` with per-visitor unlock state.** Currently `REGIONS`/`SUBREGIONS`
   are the same for every visitor. Add a parallel "which regions has this visitor unlocked"
   set (reads from Feature 1's `hermes.unlocks.v1`), rendered as a dimmed/undiscovered state
   on regions not yet reached — the brain literally grows as onboarding + real usage unlock
   more of it.

---

## Feature 4 — Progressive unlock content (what actually unlocks, and when)

Once Features 1–3 exist, this is the ongoing content work — never finished, always growing.

1. **More Story Mode chapters** beyond the existing 4, tied to onboarding completion +
   real usage milestones (extends `CHAPTERS`, same shape, no new engine).
2. **Plugin unlocks** tied to tier + onboarding choices, surfaced through Feature 1's
   registry and Feature 3.1's now-visible Marketplace.
3. **Council voice unlocks** — start a fresh visitor with fewer seatable Guest Judges/Agent
   Packs, earn more over time (reuses the existing `SEATABLE`/`MAX_GUEST_SHARE` mechanism
   exactly — just gates which entries appear in the seatable list).
4. **Engine/model slot unlocks** — Rack slot visibility gated behind onboarding milestones
   (e.g., the Lightning slot from 3.3 stays hidden until a visitor reaches a certain chapter).
5. **Identity/cosmetic unlocks** — alias customization flourishes, more `badges.ts` entries,
   brain heat-map color themes (`heat.ts` already computes a temperature; new visual skins on
   top of it are pure UI).

---

## Feature 5 — The testable button (build this first)

The founder's explicit ask: *"a button for now I click on it and I wanna test it."* This is
the smallest real slice that proves Features 1 and 2 work, without waiting on Feature 3 or 4.

1. **One feature-flagged entry point** — a "🧪 Try the new onboarding" link (not the default
   `WelcomeGate` path yet), so this ships and is testable without touching the live first-run
   experience for real visitors.
2. **A minimal 3-question flow** using Feature 2.4's step-wizard shell + exactly **one**
   scoped Council voice (not the full mini-Council from 2.3 — prove the mechanism with one
   seat first).
3. **Ends in the existing `ArtistCard`** — zero new reveal UI required for v1.
4. **One real unlock, demonstrated end-to-end** — recommend the **Claude Rack slot**
   specifically, because per this session's research it's the *only* engine slot with a
   fully working unlock flow today (Lightning's is still dead code per Feature 3.3). Onboarding
   completion highlights/reveals it. Zero new unlock UI needed for the MVP.
5. **Registers through Feature 1's brick registry from day one** — even this minimal slice
   writes its one unlock via `hermes.unlocks.v1`, so the "Lego" architecture is proven with
   real usage immediately, not left theoretical until Feature 4.

---

## Build order (recommended)

1. **Feature 1, minimal** — just the `Brick` contract + registry (skip the full `StoryProgress`
   generalization at first; adapt the 3 existing systems as read-only views).
2. **Feature 5** — the testable button, using the Claude Rack slot as the one demonstrated
   unlock and the existing `ArtistCard` as the reveal. This is the smallest deliverable that
   makes the whole idea real and clickable.
3. **Feature 2, full** — once 5 is validated, expand into the complete Awakening sequence
   (brain-boot intro, the full mini-Council, the formal Chapter-1 landing).
4. **Feature 3** — wire up the orphaned systems, opportunistically, in parallel with 2.
5. **Feature 4** — ongoing content work, no real end state.

## What this must not do

- **Not touch the real 10-agent pipeline or `AgentId` union** — every reuse above (Council
  voices, brain regions, Rack slots) goes through an existing plug-in seam, mirroring the
  already-established discipline from Agent Packs (8.3–8.5) of scoping down rather than
  extending the closed pipeline.
- **Not invent a second unlock engine** — Feature 1 generalizes `StoryProgress`/`CHAPTERS`;
  it does not replace it or run alongside a competing system.
- **Not silently replace `WelcomeGate`** — Feature 5 ships behind a flag; the live first-run
  experience only changes once the founder explicitly approves flipping the default.
- **Not fabricate payment/subscription behavior** — `subscription.ts` has no Stripe wired;
  tier gates stay local-flag-based until that's built separately.

## See also

- [`lib/hermes/story.ts`](../lib/hermes/story.ts) + [`badges.ts`](../lib/hermes/badges.ts) —
  the existing progressive-unlock arc this roadmap completes
- [`lib/hermes/council.ts`](../lib/hermes/council.ts) — the `CouncilVoice` plug-in seam
- [`components/hermes/LyricLab.tsx`](../components/hermes/LyricLab.tsx) — the step-wizard
  shell Feature 2.4 reuses
- [`components/hermes/Rack.tsx`](../components/hermes/Rack.tsx) — the unlock visual pattern
- [`lib/hermes/plugins.ts`](../lib/hermes/plugins.ts) +
  [`PluginMarketplace.tsx`](../components/hermes/PluginMarketplace.tsx) — the orphaned system
  Feature 3.1 wires in
