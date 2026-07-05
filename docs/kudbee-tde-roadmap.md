# Kudbee TDE / HERMES Workbench — the roadmap

The branch-by-branch build plan for the **Kudbee TDE** (Task-Driven Environment) — a
side cockpit inside the WIFI DJ app for Kudbee agents, repos, memory, models, GPU jobs,
training rows, PRs, SCRIBE, and (eventually) local Claude-Code-style agent execution.
Read by anyone building a `feat/tde-*` branch; status for every branch lives in
`brain/roadmap.json` (phase 9), never here. Everything in v1 is **suggest-only /
mock-state / read-only** — no live APIs, no execution, no keys.

---

## What the TDE is

A single isolated route (planned: `/tde`) that renders five panels:

| Panel | Shows |
| --- | --- |
| **Mission** | Mission input + type selector; suggest-only queue of mock missions |
| **Repos** | kudbee-music, hermes-lyric-server, kudbee-engine — canonical branch, role, protected paths, status |
| **Agents** | Main Agent + sub-agent roster, allowed/forbidden actions, depth-1 spawn rule |
| **Models / GPU** | Model router cards, T4 vs RTX 6000 hardware modes, mock GPU job queue |
| **Memory / Training** | Project state files, training row counts, eval pass rate, drop queue, next GPU action |

It is a **window, not a lever**: v1 renders state and suggests actions; it never
executes anything. The live-execution gate (see below) defines what must exist before
any panel gets a real button.

**External names, labeled honestly:** `hermes-lyric-server`, `kudbee-engine`, and the
KUDBEE model family (KUDBEECODEV0-MINI/14B, KUDBEESCRIBEV1, KUDBEEV1) live outside this
repo (separate repos / Lightning AI training work) — the TDE describes them from
founder-supplied facts and marks them `external` in every mock. What this repo *does*
know first-hand: the SCRIBE LoRA lane (Qwen2.5-14B-Instruct base, 212-row real-format
dataset, RTX PRO 6000 Blackwell / T4 Lightning Studios — `docs/scribe-training.md`,
`docs/scribe-real-training-v1.md`, `docs/lightning-plan.md`).

## Scope guarantees (what v1 will never do)

- No live Claude / OpenAI / Anthropic / GitHub / Lightning API calls.
- No user API-key requirement and no secrets anywhere (no keys in code, state, or docs).
- No real agent execution, no real GitHub write automation, no real GPU job launches.
- No changes to existing routes, auth, payments, or production-sensitive code.
- No edits to hermes-lyric-server, Lightning AI training outputs, or model
  files/checkpoints/adapters — the TDE only *describes* them.

---

## Branch order

One active implementation branch at a time; each branch is small, isolated, and merges
before the next begins. All branch from a fresh `origin/main` SHA.

| # | Branch | Delivers |
| --- | --- | --- |
| 00 | `feat/tde-00-roadmap` | This roadmap + spine sync. Docs only, no UI. |
| 01 | `feat/tde-01-shell` | Isolated `/tde` route: title, "Suggest-only prototype" badge, empty slots for the five panels, safety note. No live APIs. |
| 02 | `feat/tde-02-mission-panel` | Mission input + type selector (Code, SCRIBE, Training, GPU Eval, Memory, GitHub PR, Visual/Creative), mock submit, mock queued-mission cards. |
| 03 | `feat/tde-03-repo-panel` | Mock repo cards for kudbee-music (app/frontend/studio), hermes-lyric-server (backend/model/training), kudbee-engine (archived planning / possible future control-plane): canonical branch, role, protected paths, status, integration status. |
| 04 | `feat/tde-04-agent-map` | Agent map: Main Agent, Training Scribe, Safety Reviewer, Eval Runner, Memory Agent, Future Integration Scout — status, role, allowed/forbidden actions, spawned_by, risk level, mock trace. Visible rule: "Sub-agent depth 1 only. Recursive spawning blocked." |
| 05 | `feat/tde-05-model-gpu-panel` | Model router cards (KUDBEECODEV0-MINI, KUDBEECODEV0-14B, KUDBEESCRIBEV1, KUDBEEV1, HERMES, embedding model, Mistral 7B legacy lane), hardware mode cards (T4 vs RTX 6000), mock GPU job queue, next-GPU-action card. |
| 06 | `feat/tde-06-memory-training-panel` | Memory/state cards (PROJECT_STATE.md, ARCHITECTURE_TRUTH.md, agent-state-tracker, repo atlas), training row count, eval pass rate, drop queue, next data target, next RTX command placeholder. Mock values seeded from real project facts. |
| 07 | `feat/tde-07-safety-gates` | Safety Gate UI: the visible blocked-actions list (see safety checklist below). |
| 08 | `feat/tde-08-model-router` | Typed mock model router: task type → recommended model/tool, reason, risk level, approval-required flag. No live calls. |
| 09 | `feat/tde-09-integration-contracts` | TypeScript types only for future integrations: RepoStatus, AgentStatus, ModelStatus, GPUJobStatus, MemoryState, TrainingEvalSummary, PRStatus, ScribeStatus. No fetching. |
| 10 | `feat/tde-10-local-mock-state` | Local mock-mission persistence via the app's existing localStorage patterns (`lib/hermes/storage.ts` conventions: sanitized imports, `.bak` mirroring where appropriate). No secrets, no credentials. |
| 11 | `feat/tde-11-polish-nav` | Navigation link (only if safe), responsive/mobile stacking, empty/loading states, visual polish in the WIFI DJ design language. |
| 12 | `feat/tde-12-backend-bridge-plan` | Docs only: `docs/kudbee-tde-backend-bridge.md` — the permission layer required before anything goes live. |

### Branch naming convention

`feat/tde-NN-slug` — two-digit branch number, short kebab slug matching the table
above. Docs-only branches still use their table slug. Every branch is created from an
explicit fresh `origin/main` SHA (never local `main`, never stacked on merged history).

## PR checklist (every `feat/tde-*` PR)

1. Gates green: `npm run test:web`, `npm test`, `npx tsc --noEmit`,
   `npm run lint:check`, `STATIC_EXPORT=1 npm run web:build`, `npm run eval`
   (+ `node scripts/mobile-matrix.mjs` for anything touching layout).
2. Living-state sync in the same PR: `brain/roadmap.json` phase-9 item flipped,
   `TODO.md` + `IDEAS.md` updated, STATUS blocks regenerated
   (`GEN_DOCS=1 npx vitest run status`).
3. Safety review passed (checklist below) — recorded in the PR body.
4. Scope check: only files for the current branch number changed; no edits to future
   branches' surface, no unrelated refactors, no deleted pages.
5. PR follows `.github/PULL_REQUEST_TEMPLATE.md`; CI gates are check / web / smoke.

## Safety checklist (the blocked actions — Branch 07 renders these)

The TDE treats each of these as a visible, named gate. Any PR that would need one of
them is stopped, not merged:

- `git add -A` from the workspace root (stages unrelated work).
- Edits to the wrong repo (hermes-lyric-server, kudbee-engine) or pushes to the wrong branch.
- Deleting `final/` outputs, model caches, checkpoints, or adapters.
- Committing secrets (grep every staged diff for `key_` before committing) or model artifacts.
- CPU training fallback (silently burning hours when a GPU job misconfigures).
- Recursive sub-agent spawning (depth 1 only).
- Live API calls without explicit founder approval.
- Touching auth / payment / funds / production-sensitive code outside an explicitly approved branch.

## Model routing rules (mocked in Branch 08; the real policy)

| Task | Routed to | Why |
| --- | --- | --- |
| Architecture / risky design | Fable-class advisor | Highest-judgment calls, used sparingly |
| Coding | Sonnet-class executor | The workhorse |
| Risky-change review | Opus-class advisor | Second set of eyes before merge |
| Cheap labeling / triage | Haiku-class | Volume work |
| Training / eval runs | Lightning GPU (T4 or RTX 6000) | Real compute, never from this dashboard in v1 |
| Local coding-agent behavior | KUDBEECODEV0 (MINI / 14B) | The future local Claude-Code-style lane |
| Lyric line rewrite | KUDBEESCRIBEV1 | SCRIBE's fine-tuned lane |
| Song generation | KUDBEEV1 | The song brain's trained lane |
| Deterministic lyric engine | HERMES (this repo, $0/local) | The shipping default |

Hardware split: **T4** = prep, MINI runs, embeddings, light eval; **RTX 6000** = 14B
training/eval, real SCRIBE, dense rehearsal.

## Agent / sub-agent rules

- The main executor owns the current branch; sub-agents scout, review, and prepare notes.
- Sub-agent depth is 1 — sub-agents never spawn agents.
- Sub-agents never push, merge, delete branches, or run risky commands.
- While branch N is being implemented, scouts may prepare read-only notes for N+1 and
  N+2 only — likely files, risks, dependencies, test needs — and must state "no changes made".

## Memory / training capture rules

Every TDE branch decision is future KUDBEECODEV0 training material — captured in docs
and the spine, never in model outputs:

- Each branch's Asked / Done / Tests / Files changed / PR / Merge status report lands
  in the PR body (and BUILD_LOG.md when notable).
- Ideas surfaced mid-build go to `IDEAS.md` immediately; designed work graduates to `TODO.md`.
- Status flips happen only in `brain/roadmap.json`; STATUS.md and the README/CLAUDE.md
  status blocks are regenerated, never hand-edited.

## Live-execution gate (what must exist before anything goes live)

All of the following, in order, before any TDE button performs a real action —
Branch 12 designs this in full:

1. A backend permission layer with per-action approval (no browser-side credentials, ever).
2. Founder-controlled keys only in approved homes (GitHub Actions secrets; never
   Cloudflare Pages env, never the client).
3. An audit trail for every proposed → approved → executed action.
4. Read-only integrations proven first (health/status polling) before any write path.
5. A founder-approved PR that explicitly lifts a named gate — one gate at a time.

**Until then, everything stays mocked:** mission execution, GitHub writes, GPU job
launches, agent spawning, SCRIBE calls, memory writes. The only persistence allowed is
the visitor's own localStorage mock state (Branch 10).

## Auto-merge policy for this track

A `feat/tde-*` PR may merge without a human click only if it is isolated, low-risk
docs/UI/mock/types-only, introduces no live calls, credentials, or auth/payment/funds
changes, breaks no existing route, and all checks pass. Anything else stays open with
a report. When CI is green the PR merges the same turn — never parked as a draft.
