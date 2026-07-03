# CLAUDE.md — the memory spine

Instructions for any agent (or human) working in this repo. This file is the team's
accumulated conventions: every time an instruction gets repeated, a convention gets agreed,
or the same mistake happens twice — **save it here**. Deeper detail lives in the routed
docs below; this file is the index and the law.

## What this is

HERMES — a $0, local, **deterministic** songwriting brain (plus an agent-driven music-video
studio). Static Next.js export served by Cloudflare Pages; **no server, no API keys, no
network** in the core path. The user's songs live in their browser's localStorage vault.
The flagship conceit: the brain's regions are real modules you can watch think.

## Iron laws (non-negotiable, see ARCHITECTURE.md)

1. **Determinism contract** — same `inputs` + same `opts.seed` ⇒ byte-identical
   `SongPackage`. Ids/timestamps enter only via `opts.id` / `opts.now`. Never `Date.now()`,
   `Math.random()`, or unseeded RNG anywhere in the generation path.
2. **$0 core stays light** — no new runtime npm deps for core features. Heavy/optional deps
   (embeddings etc.) are lazy-loaded, opt-in, and server/CLI-only; the client bundle never
   pulls Node built-ins.
3. **Original-only** — no living-artist mimicry; the famous-phrase safety screen stays
   wired. "Culture" means the artist describing themselves, never a group profile.

## Gates — run ALL before any PR

```
npm run test:web          # vitest engine + web suite
npm test                  # node --test (video studio)
npx tsc --noEmit
npm run lint:check
STATIC_EXPORT=1 npm run web:build
npm run eval              # golden-set regression
node scripts/mobile-matrix.mjs   # anything touching layout (build the export first)
```

- Playwright chromium is preinstalled at `/opt/pw-browsers` — **never** `playwright install`.
- Serve `out/` with a Range-capable static server for browser walkthroughs (video seeks).
- CI gates = **check / web / smoke** — nothing else gates a merge. (History: a stray
  Cloudflare "Workers Builds" check failed every push for ~30 PRs until it was tracked (#111)
  and the founder deleted the stray Worker, 2026-07-02. If a stray check reappears, track it
  immediately — `brain/beliefs.json` → known-nonblocking-checks.)

## Workflow (the repeated instructions, saved)

- **Green loop**: one PR at a time; when CI goes green, mark ready and **merge the same
  turn** — never park drafts. Screenshot-verify every UI change before merging.
- **Fresh branch per change, based on an explicit `origin/main` SHA** — the local `main`
  ref goes stale; never branch from it, never stack on merged history.
- **Living-state sync**: every behavior PR updates `TODO.md` + `IDEAS.md` +
  `brain/roadmap.json` (+ `README.md` when user-facing) together. *A PR that skips this is
  not done.* Tests move TODO items to Shipped.
- **Capture every idea immediately** into `IDEAS.md` — it's the capture net.
- **Recurring noise is never skipped silently.** The FIRST time anything repeats (a failing
  check, a bot comment, a flaky step), it gets a spine/TODO item with a root cause and a fix
  path — dispatch a research agent if needed. "Known, ignorable" is only acceptable WITH a
  tracked deletion/fix item attached. (Founder directive, 2026-07-02 — the Workers Builds
  check was skipped 30+ times before being tracked. Once is enough.)
- **Status lives ONLY in `brain/roadmap.json`.** Every status table (STATUS.md + the
  STATUS-marker blocks in this file, README.md, BUILD_LOG.md) is GENERATED from the spine —
  never hand-edit between `STATUS:BEGIN`/`STATUS:END` markers, never add a hand checklist to
  a doc. Flip the status in the spine, then `GEN_DOCS=1 npx vitest run status`.
  `statusBoard.test.ts` fails CI on drift and bans unchecked `- [ ]` boxes outside the
  allowlist (TODO.md, LAUNCH.md pre-flight, .github templates).
- Respect `.github/PULL_REQUEST_TEMPLATE.md`; commits carry the harness's
  `Co-Authored-By` + session-link footer.
- Start-of-session orientation: the `resume` skill (`.claude/skills/resume/SKILL.md`).

## Security rules (learned the hard way)

- Secrets go **only** in gitignored `.env.local` — never a tracked file, commit, PR body,
  or log. **Grep every staged diff for `key_` before committing.** (A leaked Runway key
  once had to be rotated + scrubbed from history. Once is enough.)
- The one approved **remote** home for a *founder-controlled* key: **GitHub Actions
  repository secrets** (e.g. `ANTHROPIC_API_KEY` → the `claude-compare` and
  `claude-watchdog` workflows). Every workflow reading a secret holds the minimum
  permissions the job needs (`contents: read`, plus `issues: write` only for
  `claude-watchdog`, which needs it to file its report — no write access to
  contents, ever); CI proper uses zero secrets. Never put a founder key in
  Cloudflare Pages env — the static client must never need one.
  **`workflow_dispatch`-only is the default; a `schedule:` trigger is a named,
  one-at-a-time exception** (unattended spend is a deliberate policy decision, not
  a routine code change) **and only safe when the workflow is structurally unable
  to write to the repo** — `claude-watchdog` earns its weekly schedule specifically
  because `issues: write` is its ceiling, not because it's trusted more generally.
  A findings-only Claude review that also drafts+pushes fix PRs was built and then
  deliberately reverted — the platform's safety tooling flagged unattended
  code-write-and-push (no human click between generation and a pushed branch) as
  a real boundary, not a formality. See SECURITY.md + docs/watchdog.md.
- A third, distinct location: **the Engine Rack's bring-your-own-key slot**
  (`lib/hermes/claudeKey.ts`) — a *visitor's own* Anthropic key, pasted client-side, stored
  only in that visitor's `localStorage`, calling `api.anthropic.com` directly from their
  browser with their own money. This is not a Cloudflare-env exception — it's a visitor
  key that never touches our infra at all, which is why it's allowed. See SECURITY.md
  → "Rules for paid providers" for the exact boundary (the moment a visitor's key would
  route through server-side code, the exemption ends).
- The `?dev=1` developer door is build-gated (`NEXT_PUBLIC_DEV_DOOR`, dev builds only).
  Never ship a public backdoor, even a convenience one.
- **Every URL/import payload is hostile.** Sanitize at the boundary like
  `shareLink.decodeShare` and `storage.importVault` do: length caps, field coercion,
  prototype-pollution key stripping, never throw.
- The OG unfurl Pages Function stays env-gated (`OG_UNFURL=1`) and inert until the founder
  activates it — merging server-side code must not change live behavior.
- `IDEAS.md` founder-narrative privacy rule: never publish personal/medical specifics.

## Deploy facts

- Cloudflare Pages project **`wifi-dj-meme`** → https://wifi-dj-meme.pages.dev (auto-deploys
  on merge to main).
- **Every branch** gets a preview at `<branch-with-dashes>.wifi-dj-meme.pages.dev` — this is
  the phone-testing workflow (`docs/mobile.md`): push, open on a real phone, thumb-test
  before merging.

## Status board

<!-- STATUS:BEGIN generated: edit brain/roadmap.json, then GEN_DOCS=1 npx vitest run status -->
**📊 Status board:** ✅ 33 shipped · 🔨 1 in build · 💤 9 queued (43 tracked) — full tables in [`STATUS.md`](STATUS.md), source of truth [`brain/roadmap.json`](brain/roadmap.json).
<!-- STATUS:END -->

## Memory layers — where the brain keeps things

| Layer | Route |
| --- | --- |
| Status board (generated, never hand-edited) | `STATUS.md` ← `brain/roadmap.json` via `lib/hermes/statusBoard.ts` |
| Brain anatomy (source of truth) | `lib/hermes/brainMap.ts` (regions + pathways; renders in BrainScan, trace, share card, OG card) |
| Two-hemisphere manifesto | `brain/brain.json` (+ `brain/hemispheres.md`, the metaphor doc) |
| Constitution / values | `brain/beliefs.json` → `lib/hermes/beliefs.ts` |
| Long-term semantic taste | `brain/memory.json` → `lib/hermes/memory.ts` |
| Craft-DNA archetypes | `brain/personas.json` → `lib/hermes/personas.ts` |
| Community steering | `brain/crossroads.json` → `lib/hermes/crossroads.ts` |
| Vocabulary cortex | `brain/lexicon/core.json` → `lib/hermes/lexicon.ts` |
| Pattern packs (form + rhyme-scheme presets) | `brain/patternPacks.json` → `lib/hermes/patternPacks.ts` — see `docs/pattern-packs.md` |
| Occasion packs (holiday/life-moment lexicon + dedication) | `brain/occasionPacks.json` → `lib/hermes/occasionPacks.ts` |
| Living-state spine (machine-readable) | `brain/roadmap.json` |
| Vector memory (generated, gitignored) | `brain/vector-memory.json` → `lib/hermes/vectorMemory.ts` / `vectorRecall.ts` (node-only) |
| Working list / idea inbox / build log | `TODO.md` · `IDEAS.md` · `BUILD_LOG.md` |
| Per-user vault (browser) | localStorage `hermes.vault.v1`, `hermes.albums.v1`, `hermes.taste.v1`, `hermes.bannedWords.v1`, `hermes.artistAlias.v1` (each mirrored to a `.bak` key) via `lib/hermes/storage.ts` |
| Identity / dev door (browser) | localStorage `hermes.profile.v1`, `hermes.devDoor.v1` via `lib/hermes/identity.ts` |
| Claude Engine BYOK key (browser, visitor's own) | localStorage `hermes.claudeKey.v1`, `hermes.claudeEngineActive.v1` via `lib/hermes/claudeKey.ts` — never sent to any server we control |
| Session RAM | `lib/hermes/workingMemory.ts` (decays + consolidates, in-memory) |
| Docs index | `docs/` — hit-factory, brain-wiring (generated from brainMap — regen `GEN_DOCS=1 npx vitest run wiring`), mobile, share, og-unfurl, accounts, nft-standard, claude-engine, runway-plan, pattern-packs, watchdog |

## Maintenance

This file is load-bearing: `lib/hermes/__tests__/claudeMd.test.ts` fails if the routes
above rot. When you add a memory layer, a rule, or a convention — update this file in the
same PR, and extend the guard test if it's a new route.
