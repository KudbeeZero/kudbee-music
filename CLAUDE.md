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
- **No branch goes quiet.** Every pushed branch is tracked in `brain/branches.json` against
  its PR + merge status (`node scripts/branch-ledger.mjs` refreshes the git-derived fields;
  PR/status comes from a periodic branch audit). Old branches are routinely left undeleted
  after a squash-merge — that's expected and harmless as long as the ledger shows the PR
  merged; an entry with no PR or an open/unmerged one is the thing to chase down.
- **Recurring noise is never skipped silently.** The FIRST time anything repeats (a failing
  check, a bot comment, a flaky step), it gets a spine/TODO item with a root cause and a fix
  path — dispatch a research agent if needed. "Known, ignorable" is only acceptable WITH a
  tracked deletion/fix item attached. (Founder directive, 2026-07-02 — the Workers Builds
  check was skipped 30+ times before being tracked. Once is enough.)
- **Two agents, one repo — coordinate or collide.** Two agents work this program in
  parallel: the **kudbee-music session** (this repo — the app + the shared living-state
  files) and the **Lightning GPU agent** (`hermes-lyric-server` — training/GPU + the
  checkpoints). **Lane ownership:** the kudbee-music session owns the app and the shared
  living-state files (`TODO.md` · `IDEAS.md` · `brain/roadmap.json` · `brain/modelFamily.json`);
  the Lightning agent owns training/GPU + `hermes-lyric-server`. **Before either edits a
  shared kudbee-music living-state file, it CLAIMS the work in `brain/handoffs.json`**
  (append-only, so it never conflicts) and does not edit those files concurrently — the
  Lightning agent updates `modelFamily.json` at session end behind a handoffs claim, not in
  a race. The Lightning agent does not pick up kudbee-music app features unprompted; further
  app work routes through the kudbee-music session. (Learned 2026-07-07 — both agents
  independently edited `TODO.md` + `IDEAS.md` + `handoffs.json` in the same window →
  merge conflicts + duplicate entries. Once is enough.) See `docs/agent-autonomy.md` and the
  protocol inside `brain/handoffs.json`.
- **Status lives ONLY in `brain/roadmap.json`.** Every status table (STATUS.md + the
  STATUS-marker blocks in this file, README.md, BUILD_LOG.md) is GENERATED from the spine —
  never hand-edit between `STATUS:BEGIN`/`STATUS:END` markers, never add a hand checklist to
  a doc. Flip the status in the spine, then `GEN_DOCS=1 npx vitest run status`.
  `statusBoard.test.ts` fails CI on drift and bans unchecked `- [ ]` boxes outside the
  allowlist (TODO.md, LAUNCH.md pre-flight, .github templates).
- Respect `.github/PULL_REQUEST_TEMPLATE.md`; commits carry the harness's
  `Co-Authored-By` + session-link footer.
- Start-of-session orientation: the `resume` skill (`.claude/skills/resume/SKILL.md`).
- **Automated so it can't rely on memory**: `.claude/settings.json` carries a SessionStart
  hook (reminds every session to read the living-state files + keep them synced) and a
  non-blocking Stop hook (nudges if product code changed without a `TODO.md`/`IDEAS.md`/
  `brain/roadmap.json` sync). Plus the autonomy allowlist (safe commands run without
  asking). The hard enforcement is still CI (`statusBoard.test.ts` fails on drift). See
  `docs/agent-autonomy.md`.

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

## Command generation and verification (learned 2026-07-07)

When generating CLI commands (especially for external tools like litgpt, Lightning Studio, or custom
workflows), **always verify the command structure against the tool's actual behavior before relying on it:**

- For tools with `--help`, ask Claude to run `<tool> --help` and confirm the exact flags/syntax work
- For unfamiliar environments (a Lightning Studio, a container, a remote GPU setup), provide your **environment
  details upfront** (tool version, directory structure, runtime setup) so Claude gets it right the first pass
  instead of needing screenshot corrections
- If a command fails, don't iterate on the command structure alone — include the actual error output
  (stdout/stderr) so Claude can diagnose root causes and fix them, not just guess syntax
- For critical commands (test runners, training jobs, deployment steps), ask Claude to include a **dry-run or
  validation pass** before the real invocation

**Template for command generation requests:**
```
Generate [command type]. My environment:
- Tool: [name + version]
- Location: [directory/path]
- Runtime: [studio type / container / GPU setup]
- Constraints: [packing disabled? no quantization? etc.]

Before finalizing: validate against --help and show me the exact flags you're using.
If the command fails when I run it, I'll send you the error output, and you iterate until exit 0.
```

## Agent handoff completion (learned 2026-07-07)

Every agent handoff (entries in `brain/handoffs.json` or structured docs) must include an **explicit
verification step** so the receiving agent knows exactly what "done" means:

- Handoff entries from `kudbee-music-session` to `lightning-agent` must include: what to run, what success looks like
  (exit codes, output shape, file locations), and what to update/report back on completion
- Handoff receiving agent confirms: (1) command runs to completion (exit 0), (2) output shape matches spec,
  (3) any files/artifacts created are in the expected locations, (4) side-effect updates (modelFamily.json, etc.)
  are applied correctly
- Handoff is complete only when the receiving agent appends a resolved entry with the actual output/results
  and confirmation of side effects

**Do NOT ship a handoff without:**
- Exact command(s) the agent should run (not pseudocode)
- Expected output format or success criteria
- File/artifact paths that should exist after completion
- Any living-state updates the agent should apply (e.g., "set gate.G2.status = 'cleared'")
- A note asking the agent to append a resolved handoff entry with results

## Environment details capture (learned 2026-07-07)

Share your environment context early, not as late corrections:

- **Studio setup**: tool version (litgpt@X.Y.Z), runtime (H100/CPU/RTX 6000), OS, available packages
- **Directory structure**: where litgpt is installed, where checkpoints live, where temp files should go
- **Known constraints**: packing disabled for small datasets, quantization disabled for Blackwell, etc.
- **Previous successful runs**: "the smoke test used this exact command structure and worked"

This lets Claude generate the right command upfront instead of learning via trial-and-error screenshots.

## Deploy facts

- Cloudflare Pages project **`wifi-dj-meme`** → https://wifi-dj-meme.pages.dev (auto-deploys
  on merge to main).
- **Every branch** gets a preview at `<branch-with-dashes>.wifi-dj-meme.pages.dev` — this is
  the phone-testing workflow (`docs/mobile.md`): push, open on a real phone, thumb-test
  before merging.

## Status board

<!-- STATUS:BEGIN generated: edit brain/roadmap.json, then GEN_DOCS=1 npx vitest run status -->
**📊 Status board:** ✅ 97 shipped · 🔨 3 in build · 💤 9 queued (109 tracked) — full tables in [`STATUS.md`](STATUS.md), source of truth [`brain/roadmap.json`](brain/roadmap.json).
<!-- STATUS:END -->

## Memory layers — where the brain keeps things

**Start with the folder head pages** — [`brain/README.md`](brain/README.md) indexes
every file in the vault (what it is, who reads it, status); [`docs/index.md`](docs/index.md)
does the same for every doc. Both are guard-tested (`memoryIndexes.test.ts`) so they
can't silently rot, and every file inside carries its own one-line `"note"`
(JSON) or opening paragraph (Markdown) saying the same thing — so landing directly
on a file or starting from its folder's index both orient you immediately. This
table is the top-level index across *all* memory tiers, folder pages included.

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
| WIFI DJ UI design language (Hit Factory web-UI visual rules, gaps backlog, agent learnings log) | `brain/uiDesignLanguage.json` → read/updated by the `hermes-ui` agent (`.claude/agents/hermes-ui.md`) |
| Living-state spine (machine-readable) | `brain/roadmap.json` |
| Branch ledger (every branch, cross-referenced against its PR + merge status) | `brain/branches.json` ← `scripts/branch-ledger.mjs` refreshes git-derived fields; PR/status filled in by a periodic branch audit |
| Model-family card catalog (the Librarian's ledger — training-program state, KUDBEE-GATE promotion, dataset lineage, budgets) | `brain/modelFamily.json` → `lib/hermes/modelFamily.ts` (gate invariants CI-enforced by `modelFamily.test.ts`); protocol + never-do list: `docs/lightning-librarian.md` |
| Cross-agent handoff log (async comms between the kudbee-music session + the Lightning GPU agent) | `brain/handoffs.json` — read at session start, append at session end; broader than the model catalog (GPU status, blockers, review asks). Autonomy context: `docs/agent-autonomy.md` |
| Agent-decision training source (the program's own process → KUDBEECODEV0 rows) | `lib/hermes/agentDecisions.ts` (harvests `brain/modelFamily.json` history[]); design: `docs/agent-trajectory-dataset.md` |
| Vector memory (generated, gitignored) | `brain/vector-memory.json` → `lib/hermes/vectorMemory.ts` / `vectorRecall.ts` (node-only) |
| Working list / idea inbox / build log | `TODO.md` · `IDEAS.md` · `BUILD_LOG.md` |
| Per-user vault (browser) | localStorage `hermes.vault.v1`, `hermes.albums.v1`, `hermes.taste.v1`, `hermes.bannedWords.v1`, `hermes.artistAlias.v1`, `hermes.favorites.v1`, `hermes.songNotes.v1`, `hermes.recentlyViewed.v1` (each mirrored to a `.bak` key), `hermes.scribeTourSeen.v1` (a plain one-time "seen it" flag, not `.bak`-mirrored) via `lib/hermes/storage.ts`. Each of these keys is **namespaced per signed-in profile** (`<key>::<profileId>`) so every account has its own saved memory; the first profile "adopts" the un-namespaced legacy keys (no migration), tracked by `hermes.primaryProfile.v1` |
| Audio clip vault (browser, voice/riff takes) | IndexedDB `hermes.audioVault.v1` via `lib/hermes/audioVault.ts` — binary, so it lives outside the JSON localStorage vault; falls back to an in-memory store with no IndexedDB (SSR/tests). Pure attachment, never fed into generation. |
| TDE mock mission queue (browser) | localStorage `hermes.tdeMissions.v1` (+ `.bak` mirror) via `components/tde/tdeStorage.ts` — the visitor’s own suggest-only mission cards on `/tde`; sanitized on load, mock state only, never executed |
| Identity / dev door (browser) | localStorage `hermes.profile.v1`, `hermes.devDoor.v1` via `lib/hermes/identity.ts` |
| Claude Engine BYOK key (browser, visitor's own) | localStorage `hermes.claudeKey.v1`, `hermes.claudeEngineActive.v1` via `lib/hermes/claudeKey.ts` — never sent to any server we control |
| Session RAM | `lib/hermes/workingMemory.ts` (decays + consolidates, in-memory) |
| Docs index | `docs/` — hit-factory, brain-wiring (generated from brainMap — regen `GEN_DOCS=1 npx vitest run wiring`), mobile, share, og-unfurl, accounts, nft-standard, claude-engine, runway-plan, lightning-plan, pattern-packs, watchdog |

## Maintenance

This file is load-bearing: `lib/hermes/__tests__/claudeMd.test.ts` fails if the routes
above rot. When you add a memory layer, a rule, or a convention — update this file in the
same PR, and extend the guard test if it's a new route.

**Adding a file to `brain/` or `docs/`?** Give it a one-line `"note"` (JSON, top-level
key) or opening paragraph (Markdown) saying what it is and who reads it, add a row to
that folder's head page (`brain/README.md` / `docs/index.md`), and add it here if it's
a new memory *layer* (not every doc needs a CLAUDE.md row — the folder head page is the
right level of detail for most). `memoryIndexes.test.ts` enforces the folder-page half
of this; nothing currently enforces the in-file note, so hold the line by hand.
