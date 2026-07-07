# The Librarian — overseer of the KUDBEE model family

**What this is / who reads it:** the standing governance layer for the model-training
program. Conductor routes one song's agents; **the Librarian oversees the model family
itself** — SCRIBE v1/v2, KUDBEECODEV0, the four HERMES-family models, and the MiniMax
teacher sidecar. Read by the Lightning agent (GPU side) at every session start, by
kudbee-music sessions doing training-adjacent work, and by the founder. The *live work
order* (what to do next, phase by phase, with budgets) — **originally authored by
Fable 5** — stays in [`lightning-agent-roadmap.md`](lightning-agent-roadmap.md); this
doc adds the rules that outlive any one phase on top of Fable 5's phase structure, it
doesn't replace it. Split deliberately: the work order churns every GPU session, the
governance layer shouldn't churn with it — the same split
[`lightning-plan.md`](lightning-plan.md) (policy) already draws against the roadmap
(work order).

**The state file:** [`brain/modelFamily.json`](../brain/modelFamily.json) — the card
catalog. **The enforcement:** `lib/hermes/modelFamily.ts` + `modelFamily.test.ts`,
which fail CI the moment the catalog claims something these rules forbid.

---

## 1. Why a Librarian, and what it owns

The training roadmap was a flat 4-phase list with no standing "who's in charge" layer:
nothing tracked model-family state as a first-class memory object, nothing decided
train order when priorities conflicted, and a phase could stall silently — the exact
failure mode CLAUDE.md's "recurring noise is never skipped silently" rule exists to
prevent for CI, unhandled for training. The Librarian closes that gap.

It is a **role, not a process**: whichever agent touches the training program that
session — the Lightning agent on the GPU side, or a kudbee-music session on this side —
puts the role on, which means reading the catalog first and leaving it true afterward.

The Librarian owns exactly seven things (mirrored machine-readably in the catalog's
`librarian.owns` block):

1. **The model registry.** Every model's status, checkpoint/adapter version, dataset
   lineage, eval scores *with run counts*, and next action live in
   `brain/modelFamily.json` and nowhere else. Training-notes files in `kudbee-code-v0`
   remain the per-run receipts; the catalog is the cross-repo index that points at them
   — the same relationship `brain/roadmap.json` has to individual PRs.
2. **KUDBEE-GATE enforcement** (§4). Promotion is gated, not declared. This is
   CI-mechanical: `modelFamily.test.ts` fails if a model is marked `promoted` without
   the gate cleared, or an eval is `confirmed` off fewer than 3 runs.
3. **Dataset lineage.** Which dataset id + recipe produced which adapter, pinned at
   train time (§5). "Which data was v1 actually trained on?" must never require
   archaeology.
4. **Train order when GPU time is scarce.** The `trainOrder.queue` in the catalog,
   with tie-break rules: unblock served baselines first, confirm unconfirmed evals
   before new spend, richest-dataset/clearest-eval first. The founder reorders by
   editing the queue; the agent never reorders silently.
5. **Stall detection.** Every model carries `lastTouched` + `staleAfterDays`.
   `staleModels(nowIso)` (pure, injected now) runs at every session start; anything it
   returns gets escalated to the founder with a diagnosis, never skipped. This is
   deliberately a *session-protocol* check, not a CI assertion — a quiet fortnight
   should fail a session checklist, not turn an unrelated commit red.
6. **Budget watch** (§3). Flag at 80% of any cap, hard-stop at 100%.
7. **Drift audits** on promoted models (§7).

## 2. Where the state lives — the catalog, field by field

`brain/modelFamily.json` follows every `brain/` convention: a top-level one-line
`"note"`, a row in `brain/README.md`, a row in CLAUDE.md's memory-layers table, and a
reader module in `lib/hermes/` (`modelFamily.ts`, the `roadmap.json → statusBoard.ts`
pattern). Per model:

| Field | What it holds |
| --- | --- |
| `id` / `family` / `task` | `KUDBEE<TASK>V<major>` id (§5), family grouping, one-line task statement |
| `status` | closed vocabulary: `planned · dataset-ready · training · trained-unconverted · evaluating · candidate · promoted · retired · teacher` |
| `baseModel` / `recipe` | the exact base + LoRA config — recorded verbatim, never "same as before" |
| `dataset` | pinned dataset id (`<task>@<date>+r<rows>`), row count, sources, generator command |
| `training` | val loss, date, blockers — the headline numbers; the notes file has the rest |
| `artifacts` | checkpoint/adapter *paths on the Lightning side* — the artifacts themselves never enter git |
| `evals[]` | each: metric, value, **runs**, `confirmed` (CI-invalid below 3 runs), date |
| `gate` | last KUDBEE-GATE stage reached, `cleared`, and what it's `blockedOn` |
| `endpoint` | `served` + URL once live — **the URL is recordable, the bearer token never** |
| `trainingNotes[]` | the receipts: paths into `kudbee-code-v0/training-notes/` |
| `nextAction` | never empty — a model without a next action is a stall in waiting |
| `lastTouched` / `staleAfterDays` | the stall tripwire (§1.5) |
| `history[]` | dated one-line events: trained, evaluated, promoted, rolled back |

## 3. Budgets

The catalog's `budget` block carries per-phase `gpuHoursCap`/`usdCap` and running
`spent` fields (concrete numbers live in the roadmap's phase sections, mirrored in the
catalog). Rules:

- The $/hour figure is an **estimate** (`budget.assumptions`); correct it in the
  catalog the first time a real bill disagrees.
- At **80%** of any cap: flag it in the session-end report and keep going only if the
  remaining work fits.
- At **100%**: stop. `spentUsd > usdCap` fails CI *on purpose* — an overrun can only be
  resolved by the founder raising the cap, never by the agent running on.
- The MiniMax sidecar's line is capped at **$0**: idle time on the second studio only.
  A paid session that exists solely for the sidecar is out of policy.
- Do CPU-safe prep (dataset checks, script review) before the GPU clock starts —
  standing rule from the roadmap, restated because it's the main budget lever.

## 4. KUDBEE-GATE — the promotion pipeline, generalized

The pattern SCRIBE v1→v2 already follows, named and made reusable. **Every model in
the family clears every stage, in order, before it serves kudbee-music.** Skipping a
stage isn't a shortcut; it's a violation the catalog can't express without failing CI.

| Stage | What must be true | SCRIBE worked example |
| --- | --- | --- |
| **G0-dataset** | Dataset regenerated fresh, $0, locally; row floor met; `REPORT.md` checked for dupes; dataset id + rows pinned in the catalog | `GEN_TRAINING_DATA=1 npx vitest run trainingData` → `scribe-line-rewrite@2026-07-05+r212`; v2's floor is 500–2000 rows |
| **G1-train** | Recipe recorded verbatim; val loss beats the family baseline or the miss is explained in the run's notes file | Qwen2.5-14B + LoRA r=8/α=16, 5 epochs, bf16-mixed → val loss 0.082; v2 must beat 0.082 or explain |
| **G2-verify** | Checkpoint in a servable format; one real contract prompt round-trips with valid output | litgpt → HF/PEFT conversion, then the `buildLightningLineRewritePrompt()` format returning `{"alternatives":[...]}` — 3 strings, meaning/meter kept, no banned words |
| **G3-eval** | Task eval suite run **≥ 3 times**; all pass rates recorded with run counts; variance past ±10% → diagnose (sampling seed/temperature, harness, model) before anything else | the held-out golden examples + the three scenario tests in [`scribe-evaluation-prompts.md`](scribe-evaluation-prompts.md) |
| **G4-head-to-head** | Beats the currently promoted model of its family on held-out goldens (or the base model if nothing is promoted). A loss → grow the dataset, return to G0 | v2 adapter vs v1 adapter vs base, promote only if v2 wins |
| **G5-serve** | Endpoint live behind LitServe; ping + one real round-trip via `studio/lightning.mjs`; URL recorded in the catalog — token never | `/scribe/rewrite` live; `node studio/lightning.mjs --ping` then a real `--prompt` |
| **G6-promote** | Founder ack; endpoint + key into kudbee-music's gitignored `.env.local` **by the founder's hand**; status → `promoted`; previous adapter path retained for rollback | `LIGHTNING_ENDPOINT`/`LIGHTNING_API_KEY` in `.env.local`, then `--ping` + `npm test test/lightning.test.mjs` |

Per-task G3 eval suites (from the roadmap, unchanged): *lyrics* — structure compliance,
rhyme-scheme adherence, banned-word respect, originality screen; *production* — field
completeness + genre-plausible values; *cover/video* — prompt usability (5 outputs fed
downstream, judged usable without hand-editing); *code* — the 47-case repo-agent suite
with zero destructive-command failures as a hard floor.

## 5. Versioning — names that carry their own lineage

- **Model ids:** `KUDBEE<TASK>V<major>` (existing convention: `KUDBEESCRIBEV1`,
  `KUDBEECODEV0`); pre-v1 HERMES tasks go by `HERMES-<TASK>` until first promotion
  mints a major. A major bumps **only when dataset or recipe changes materially**; an
  identical-recipe re-run is a new run, not a new version.
- **Adapters:** one immutable directory per run —
  `/teamspace/studios/this_studio/<family>-runs/<modelId>-r<run>-<base-short>-lora` —
  never overwritten, never deleted (rollback depends on it).
- **Datasets:** `<task>@<YYYY-MM-DD>+r<rows>`, pinned from `out/training-data/REPORT.md`
  at G0. Regenerated-fresh is mandatory before every run: generator quality fixes only
  reach a model through a fresh export ([`lightning-plan.md`](lightning-plan.md)).
- **Training notes:** `kudbee-code-v0/training-notes/<YYYY-MM-DD>_<MODELID>_<what>.md`.
  Every notes file states the exact dataset id and the adapter directory it produced —
  the two ends of the lineage chain. A run that isn't written down didn't happen.

## 6. Rollback — when a promoted model regresses in production

**Who decides:** the founder — a rollback changes live product behavior and usually
costs a GPU session. The Librarian *detects, proposes, and executes after the ack*.
**One exception:** if a promoted model is violating the safety contract (living-artist
mimicry, famous-phrase hits, banned words in output), the agent reverts the endpoint
**immediately** and reports afterward — safety outranks the ack, the same way the
mock fallback already outranks a failing Claude call in the app.

**The revert path** (possible because adapters are immutable and never deleted):

1. Repoint the LitServe endpoint at the previous adapter directory (the path is in the
   demoted model's `artifacts` + `history`). No retraining, minutes not hours.
2. Flip the catalog: regressed model → `retired` (or back to `candidate` if it may
   return), predecessor → `promoted`; add `history` events to both; write a dated
   notes file with the regression evidence.
3. kudbee-music's side usually needs **no change** — `.env.local`'s endpoint URL stays
   the same when only the adapter behind it moved. If the URL itself changes, the
   founder updates `.env.local` by hand, as always.
4. The regression becomes the next version's G0: what drifted, which rows would have
   caught it, grow the dataset accordingly.

## 7. Drift watch — the formalized cadence

The existing docs gestured at this twice with two different frequencies
("spot-check quarterly", "monthly audit"); formalized here, owned by the Librarian,
tracked in the catalog's `driftWatch` block (`lastMonthly` / `lastQuarterly` dates —
an overdue check is a stall and gets escalated like one):

- **Monthly (light):** for every `promoted` model, pull ~20 logged outputs and screen
  them for banned words, famous-phrase hits (`lib/hermes/safety.ts`), and cliché drift.
  Verdict in a dated notes file + a `history` event.
- **Quarterly (deep):** re-run the model's full eval suite 3 times against the scores
  recorded at promotion. A significant regression triggers §6.

## 8. The MiniMax sidecar — teacher workflow, fully specified

MiniMax 2.5 on the second studio is **teacher and comparison provider, never student**
(MoE, far too large for single-RTX-6000 LoRA). Its catalog entry is `MINIMAX-TEACHER`,
status `teacher` — a status the gate invariants forbid from ever being promoted.

**How teacher output becomes training data** — distinct from the two existing sources
in `lib/hermes/trainingData.ts` (the *golden* set: human-reviewed songs; the
*synthetic* set: the deterministic pipeline's own output):

1. **Generate candidates** against the exact serving contract (for SCRIBE: the
   `buildLineRewritePrompt()` context block), with the `CRAFT_RULES` safety block in
   every teacher prompt — the safety contract rides along, teacher or not.
2. **Screen every candidate row** before it can enter a set: contract parse (valid
   JSON, right shape), banned-words + famous-phrase screen (`safety.ts`), dedupe
   against golden + synthetic rows.
3. **Tag lineage:** teacher rows carry `source: "teacher-minimax"` in their meta, so
   any future quality question can isolate or ablate them in one filter.
4. **Quality bar to unlock the source:** the first 30 screened rows go to a founder
   spot-check; **≥ 80% approved** unlocks `teacher-minimax` as an allowed source for
   that task (it's listed in KUDBEESCRIBEV2's `dataset.sources` conditionally). Below
   the bar, the teacher stays comparison-only and the result is written down.
5. **Second lane:** eval judging — the teacher scores model outputs head-to-head at
   G3/G4 as a cheap second opinion. Advisory only; it never substitutes for the run
   counts.

Budget rule from §3 applies: idle time only, $0 line, never blocks Phases 1–2.

## 9. Cross-session protocol — how the Lightning agent reads/writes this

The Lightning agent has repo + SSH access, not live memory. The catalog is a file it
pulls, updates, and pushes — the same discipline as the training-notes files, with the
green-loop workflow on top:

**Session start:** `git pull` kudbee-music (main) → read `brain/modelFamily.json` →
run the stall check (`staleModels` with today's date; escalate anything returned) →
check budget headroom for the planned work → confirm the planned work is first in
`trainOrder.queue` (if not, say why or stop).

**During:** artifacts stay on `/teamspace/...`; only documentation of results is ever
committed. Every run gets its dated notes file in `kudbee-code-v0/training-notes/`.

**Session end (before the Studio shuts down):** update the touched models' fields —
`status`, `evals` (with honest run counts), `gate`, `artifacts`, `spent` budget
figures, `lastTouched`, `nextAction`, a `history` event — bump the top-level
`updated`, then `npx vitest run modelFamily` locally (the gate invariants catch a
malformed update before CI does). Commit on a fresh branch off `origin/main`, push,
open a PR (kudbee-music's normal green loop). The standing reporting loop from the
roadmap (status back to the founder) rides on top; if reality disagreed with the
roadmap or this doc, say so explicitly so the doc gets corrected.

A session that trained something but didn't update the catalog **is not done** — the
same living-state-sync rule every kudbee-music PR already lives under.

## 10. What the Librarian must NEVER do

Mirroring CLAUDE.md's security section, and mirrored machine-readably in the catalog's
`librarian.never` block:

- **Never spend past a cap unattended.** 80% flags, 100% stops; only the founder
  raises a cap. No paid session past `monthlyUsdCap`, ever.
- **Never promote without KUDBEE-GATE cleared.** Not "mostly cleared" — CI enforces
  the full chain (confirmed evals + served endpoint before `cleared`, `cleared` before
  `promoted`).
- **Never write a secret anywhere in git.** Endpoint URLs are recordable; bearer
  tokens live only in gitignored `.env.local` (kudbee-music side) or Studio env config
  (Lightning side). The SSH path between studios doesn't relax this. `modelFamily.test.ts`
  lints the catalog for token-shaped strings; the grep-the-staged-diff-for-`key_` rule
  applies to everything else.
- **Never treat one eval run as settled.** `confirmed` below 3 runs fails CI.
- **Never fine-tune the teacher.** MiniMax is inference-only.
- **Never delete an adapter.** Rollback (§6) depends on every promoted version staying
  on disk.
- **Never let the sidecar stall the main phases**, and never let a stalled phase go
  unescalated — "known, ignorable" only exists WITH a tracked item attached.

---

## See also

- [`lightning-agent-roadmap.md`](lightning-agent-roadmap.md) — the live work order the
  Librarian governs (phases, budgets, commands)
- [`brain/modelFamily.json`](../brain/modelFamily.json) — the card catalog itself
- [`lightning-plan.md`](lightning-plan.md) — provider/key boundary rules
- [`scribe-training.md`](scribe-training.md) — dataset strategy + the safety contract
- `lib/hermes/modelFamily.ts` + `lib/hermes/__tests__/modelFamily.test.ts` — the
  invariants, in code
