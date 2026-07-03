# Runway Gen-4 rollout plan

The adapter (`studio/runway.mjs`, `hermes runway`) is built and live-tested — this
is the plan for spending the founder's remaining credits on it deliberately,
instead of all at once.

## What's confirmed working
- `hermes runway --image <path> --prompt "..." --duration 5|10 --out <path>`
  submits a Gen-4 Turbo `image_to_video` task, polls it, downloads the clip.
- `hermes runway --balance` checks the remaining credit balance without spending any.
- **Real cost, measured directly**: a 10-second Gen-4 Turbo clip = **50 credits**.
  Starting balance was 1000; one test clip (animating the landing-page hero
  still) brought it to 950. A 5-second clip should run ~25 credits (untested —
  worth confirming with one throwaway run before budgeting around it).
- **Budget at 950 credits remaining**: ~19 more 10-second clips, or roughly
  double that if 5-second clips prove sufficient for a given use case.

## Why image-to-video, not text-to-video
Runway's Gen-4 API only exposes `image_to_video` for the core Gen-4 Turbo model —
there's no plain text-to-video endpoint at this tier. So every clip needs a
starting image. That's not a limitation for HERMES: the whole point is to animate
things we already have (agent glyphs, brain-scan renders, the hero still), not
generate footage from nothing.

## Phased order (highest leverage first)

**Phase 1 — Landing-page hero (spend: ~1-2 clips, ~50-100 credits)**
Already proven this session: `assets/hero-still.png` → a 10s ambient push-in.
Next step is founder taste: pick the best of 1-2 prompt variations, then wire
the winning MP4 into the (not-yet-built) landing page as the hero background.
Highest visible payoff per credit — first thing anyone sees.

**Phase 2 — HERMES "office/world" scene (spend: ~2-4 clips, ~100-200 credits)**
Needs a source image first: a still of the HERMES brain-scan/council UI, or a
new illustrated "agent office" concept image (Gen-4's `text_to_image` endpoint,
`gen4_image`, is separate from video credits and much cheaper per generation —
worth generating 2-3 still candidates before spending video credits animating
one). Then animate the chosen still into a looping ambient scene for the
in-app Council/brain-scan view.

**Phase 3 — Agent avatars → living characters (spend: ~4-8 clips, ~200-400 credits)**
The **who** is now decided: the founder's "sneak peek" box-art
(`assets/concept-art/wifi-dj-agent-network-sneak-peek.png`) introduced companion
identities for the Agent Network, now wired as the `codename` field on each
`AGENT_DEFINITIONS` entry (`lib/hermes/agents.ts`, cosmetic-only — see
`docs/hit-factory.md`'s codename table): Nexus (Conductor), Synapse (Hooksmith),
Vylo (Lyric Chemist), Rhythmix (Beat Oracle), Echo (Emotion Scanner), Sentinel
(Originality Auditor), Harmony (A&R Judge), Lumi (Visual Director), Drifter
(Viral Clip Scout), Beacon (Rights & Release Guard). Still **blocked** on the
actual still portraits existing (`TODO.md`'s "Agent images → avatars" item —
per-codename Grok/Gen-4-image stills aren't generated yet). Once each has a
still, animate the highest-visibility ones first (Synapse/Hooksmith,
Harmony/A&R Judge — the ones users see most in the trace explorer) rather than
all 10 at once. Reuse `--seed` for reproducible re-runs if a prompt needs tuning
before committing more credits.

**Phase 4 — Real video-studio clips (spend: remainder, opportunistic)**
The original CLI video studio (`bin/hermes build`) already composites hero
footage procedurally; Gen-4 clips could replace or supplement a scene pack's
stock B-roll. Lowest priority — the procedural scene packs already work at $0,
so this is a quality upgrade, not a gap-filler. Revisit once phases 1-3 prove
out the workflow and credits allow.

## Guardrails carried forward
- `RUNWAY_API_KEY` lives only in `.env.local` (gitignored) — never committed,
  never referenced by the web app (Next.js loads `.env.local` automatically but
  nothing in `components/`/`app/` reads this var, so it can't leak into a
  client bundle).
- `--duration` is capped to `5` or `10` (Runway's own constraint, and a natural
  guardrail against an accidental expensive long-form request).
- Check `hermes runway --balance` before any batch of generations — it's free.
- Every clip attempt should get a real prompt review pass first (reuse a still,
  vary the prompt, not the credits) — Gen-4 Turbo doesn't retry failed/bad
  results for free.

## Spend log
- **2026-07-01 · Phase-1 (landing/brand asset) · 10s Gen-4 Turbo · 50 credits (950 → 900):**
  the **Crossroads Board launch teaser** (`media/crossroads-teaser.mp4`, 1280×720, 24fps),
  animating `media/crossroads-still.png` (a $0 in-repo title card in the locked palette).
  One generation, `--seed 7`. Committed for a public link.
