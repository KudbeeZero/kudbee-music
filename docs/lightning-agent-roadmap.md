# Lightning AI agent roadmap — training the KUDBEE model family

**Who reads this:** the Claude Code agent running inside the founder's Lightning AI
Studio (the GPU side), plus the founder. This is the cross-repo work order: what to
train, convert, evaluate, and deploy — in what order, on what hardware — for every
model in the family. The kudbee-music side of each hookup lives in
[`scribe-training-next-steps.md`](scribe-training-next-steps.md) and
[`lightning-plan.md`](lightning-plan.md).

**Governed by the Librarian** ([`lightning-librarian.md`](lightning-librarian.md)) —
the standing overseer layer above these phases. Model-family **state** lives in
[`brain/modelFamily.json`](../brain/modelFamily.json) (the card catalog: per-model
status, dataset lineage, evals with run counts, gate state, budgets, train order);
this doc is the **work order** executed against that state. Promotion for every model
follows **KUDBEE-GATE** (G0-dataset → G6-promote, defined in the Librarian doc);
per-phase budgets below are mirrored in the catalog and are hard ceilings, not vibes.

**Last synced:** 2026-07-07 (kudbee-code-v0 master at `330e387`)

---

## You are the Lightning AI agent. Read this first.

Ground rules that apply to every phase below:

1. **Never commit a token or key.** Bearer tokens go in gitignored `.env.local`
   (kudbee-music side) or Lightning Studio env config — never a tracked file, a
   commit message, a PR body, or a log you paste anywhere.
2. **Large artifacts stay out of git.** Checkpoints, adapters, datasets live under
   `/teamspace/studios/this_studio/` — only *documentation of results* gets committed.
3. **Document every run.** Each training/eval run gets a dated notes file in
   `kudbee-code-v0/training-notes/` with: exact command, dataset size, wall-clock,
   val loss, and a verdict. A run that isn't written down didn't happen.
4. **One unconfirmed eval is not a result.** Repeat evals at least once before
   claiming a pass rate (the KUDBEECODEV0 40% number is currently single-run).
5. **GPU discipline.** Conversion and 14B inference need an RTX 6000 (20GB+ VRAM
   for 4-bit inference; conversion of the 56GB litgpt checkpoint needs the big
   disk + RAM, not a T4). Do CPU-safe prep (dataset checks, script review) before
   the GPU clock starts.
6. **Safety contract carries into every model.** Original-only, no living-artist
   mimicry, banned-word respect — the `CRAFT_RULES` block stays in every training
   prompt and every serving prompt. See `scribe-training.md` §6.
7. **You have SSH access across the studios/pods** (Lightning's `ssh.lightning.ai`
   path). Use it to inspect the second (MiniMax) studio, check GPU/disk state
   before committing to a run, and move adapters between studios — but the
   no-secrets rule rides along: never copy a token/key into a tracked file or
   paste one into a log, on either end of the SSH session.
8. **Wear the Librarian role, both ends of the session.** Session start: pull
   kudbee-music, read `brain/modelFamily.json`, run the stall check, confirm the
   planned work is first in `trainOrder.queue` and fits the phase budget. Session
   end: update the touched models (status, evals **with run counts**, gate stage,
   spent budget, `lastTouched`, `nextAction`, a history event), run
   `npx vitest run modelFamily`, commit on a fresh branch off `origin/main`, push,
   PR. A session that trained something but didn't update the catalog is not done.
   Full protocol + the never-do list: [`lightning-librarian.md`](lightning-librarian.md).

---

## The model family (current state)

> **Source of truth: [`brain/modelFamily.json`](../brain/modelFamily.json).** This
> table is the human summary; when they disagree, the catalog wins and this table
> gets corrected. Update the catalog, not just this table.

| Model | Task | Status | Next action |
| --- | --- | --- | --- |
| **KUDBEESCRIBEV1** | Lyric line rewrites (SCRIBE) | ✅ Trained (val loss 0.082) · ✅ converted to HF (loads on GPU) · blocked on a ~1-5 line server.py identity-gate fix | Phase 1: fix identity gate → verify → serve |
| **KUDBEECODEV0** | Code generation / repo-agent behavior | 🔨 `rehearsal_candidate` live on RTX 6000; 40% eval pass (single run, 47 cases) | Phase 2: re-run eval → wire into kudbee-music |
| **SCRIBE v2** | Line rewrites, bigger dataset | 💤 Planned | Phase 3: grow dataset to 500–2000 rows, retrain |
| **HERMES-LYRICS** | Full song generation (brief → finalLyrics) | 💤 Dataset pipeline ready, never trained | Phase 4 |
| **HERMES-PRODUCTION** | Brief+lyrics → tempo/drums/bass/arrangement/mix | 💤 Dataset pipeline ready, never trained | Phase 4 |
| **HERMES-COVER** | Album-cover prompt generation | 💤 Dataset pipeline ready, never trained | Phase 4 |
| **HERMES-VIDEO** | Video-treatment generation | 💤 Dataset pipeline ready, never trained | Phase 4 |

All four Phase-4 datasets come from the same $0 local generator in kudbee-music
(`GEN_TRAINING_DATA=1 npx vitest run trainingData` → `out/training-data/*.alpaca.jsonl`).

---

## Phase 1 — KUDBEESCRIBEV1: convert, verify, serve (DO THIS FIRST)

**Budget: ≤ 6 GPU-hours / ≤ $15** (catalog line `P1-scribe-v1-serve`; ~$2/hr RTX 6000
estimate — correct the catalog if the real bill disagrees). Conversion + one verify
pass + serving setup fits comfortably; if you're past 80% with the endpoint not yet
live, stop and report instead of grinding. This phase is KUDBEE-GATE **G2-verify →
G5-serve** for SCRIBE v1 (G0/G1 already happened; G6-promote is the founder's hand).

Training is done. The blocker is format: the checkpoint is a 56GB litgpt
`lit_model.pth`; the serving loader needs HF/PEFT. Exact pre-staged commands are in
`kudbee-code-v0/training-notes/NEXT_RTX6000_SCRIBE_TEST.md` — follow that file if it
disagrees with this summary (it's closer to the metal).

**1. CPU-safe prep (do before switching on the RTX 6000):**
   review the conversion commands in `NEXT_RTX6000_SCRIBE_TEST.md`, confirm the
   checkpoint path exists and its size (~56GB), confirm target disk has ≥120GB free
   (source + converted copy coexist during conversion).

**2. Convert (RTX 6000 session):**
```bash
litgpt convert_from_litgpt \
  --checkpoint_path /path/to/KUDBEESCRIBEV1/lit_model.pth \
  --output_dir ./KUDBEESCRIBEV1-hf-peft
ls -lh KUDBEESCRIBEV1-hf-peft/   # expect adapter/config/tokenizer files, non-empty
```

**3. Verify with one real SCRIBE prompt** (the exact provider contract —
`buildLightningLineRewritePrompt()` format, `LINE TO REWRITE:` marker, JSON-only
output instruction). Pass criteria: valid `{"alternatives":[...]}` JSON, 3 strings,
meaning/meter preserved, no banned words. A worked example prompt lives in
[`scribe-training-next-steps.md`](scribe-training-next-steps.md) → "Test Inference
Locally".

**4. Serve it:** stand the converted adapter up behind the real `/scribe/rewrite`
endpoint (LitServe), confirm a live HTTP round-trip, and record the endpoint URL.

**5. Hand off to kudbee-music:** the founder drops `LIGHTNING_ENDPOINT` +
`LIGHTNING_API_KEY` into kudbee-music's gitignored `.env.local`, then:
```bash
node studio/lightning.mjs --ping
node studio/lightning.mjs --prompt "Rewrite: My brain wakes when the door opens"
```

**6. Write it down:** `training-notes/SCRIBE_V1_CONVERSION_RESULT.md` — conversion
wall-clock, adapter size, the verification prompt + raw output, endpoint URL
(never the token), verdict.

---

## Phase 2 — KUDBEECODEV0: confirm the eval, then wire it in

**Budget: ≤ 5 GPU-hours / ≤ $12** (catalog line `P2-codev0-confirm`) — that covers
eval runs and wiring only; a below-bar retrain is a separate, founder-acked spend.
This phase is KUDBEE-GATE **G3-eval → G4** for CODEV0.

The `kudbee-code-v0-rehearsal` deployment is already live on RTX 6000. The 40%
pass rate (47 test cases) is a single run — treat it as unconfirmed
(`confirmed: false` in the catalog until 3 total runs; the guard test enforces it).

**1. Re-run the 47-case eval suite twice more.** Report all three pass rates and
   the per-category breakdown. If variance is high (>±10%), diagnose before
   anything else: nondeterministic sampling (pin temperature/seed), flaky test
   harness, or genuinely unstable model.

**2. Decide against a promotion bar.** Suggested bar for wiring into kudbee-music
   as an *opt-in, suggest-only* provider: ≥40% confirmed across 3 runs AND zero
   destructive-command failures in the repo-agent behavior cases. Below the bar:
   grow the 376-row dataset (target 800–1500 rows) and retrain before wiring.

**3. Wire into kudbee-music (if promoted):** bearer token → kudbee-music
   `.env.local` (founder does this by hand; the token never appears in any repo),
   then verify through the same `studio/lightning.mjs` adapter path with
   `--field` set to whatever the deployment's `decode_request` reads.

**4. Write it down:** `training-notes/KUDBEECODEV0_EVAL_CONFIRMATION.md`.

---

## Phase 3 — SCRIBE v2: grow the dataset, retrain

**Budget: ≤ 8 GPU-hours / ≤ $20** (catalog line `P3-scribe-v2`) — dataset growth is
$0/local and spends none of it. This phase is the full KUDBEE-GATE **G0 → G6** for
KUDBEESCRIBEV2 and is the gate's worked example (Librarian doc §4).

Only start after Phase 1 ships (a served v1 is the baseline v2 must beat).

**1. Grow the dataset in kudbee-music ($0, local, before any GPU time):**
   - Expand the synthetic matrix in `lib/hermes/trainingData.ts`: 15–20 themes
     (up from 10), 8–10 rhyme schemes (up from 5), 3–5 seeds (up from 2) →
     target 500–2000 rows.
   - Founder exports real vault songs into `training-data-input/` (they're
     sanitized on load; see that folder's README).
   - Regenerate: `GEN_TRAINING_DATA=1 npx vitest run trainingData`; check
     `out/training-data/REPORT.md` for row counts and dupes.

**2. Retrain on the RTX 6000/Blackwell** with the v1 recipe as baseline
   (Qwen2.5-14B-Instruct base, LoRA r=8/α=16, 5 epochs, bf16-mixed, global batch 4).
   Hold out 10–20% for validation; beat v1's val loss 0.082 or explain why not.

**3. Evaluate head-to-head:** v1 adapter vs v2 adapter vs base model on the
   held-out golden examples + the three scenario tests in
   [`scribe-evaluation-prompts.md`](scribe-evaluation-prompts.md). Promote v2 to
   the endpoint only if it wins.

---

## Phase 4 — the rest of the HERMES family (lyrics, production, cover, video)

**Budget: ≤ 16 GPU-hours / ≤ $40 for the first pass** (catalog line
`P4-hermes-family`) — one multi-task LoRA + its evals; per-task splits (only on
demonstrated task interference) are a new founder-acked line, not an extension of
this one. Each model runs the full KUDBEE-GATE G0 → G6 individually.

Same playbook, four times. For each task, in this order:

**1. Dataset first, $0, in kudbee-music:** the generator already emits all four
   task files (`lyrics.alpaca.jsonl`, `production.alpaca.jsonl`,
   `album-cover-prompt.alpaca.jsonl`, `video-treatment.alpaca.jsonl`, plus
   `all-tasks.alpaca.jsonl` for multi-task). Regenerate fresh before every
   training run — generator quality fixes only reach the model through a fresh
   export.

**2. Pick single-task vs multi-task deliberately.** Default: train
   **one multi-task LoRA on `all-tasks.alpaca.jsonl`** first (cheapest way to
   find out if 14B + LoRA can hold all four surfaces), then split into per-task
   adapters only if the multi-task model shows task interference.

**3. Reuse the SCRIBE recipe** (same base model, LoRA config, precision) unless a
   run gives a reason to deviate — one variable at a time.

**4. Evaluation is task-specific:**
   - *lyrics:* structure compliance (section tags), rhyme-scheme adherence,
     banned-word respect, originality screen.
   - *production:* field completeness (tempo/drums/bass/arrangement/mix all
     present), genre-plausible values.
   - *cover / video:* prompt usability — feed 5 outputs to the downstream tool
     and judge whether they work without hand-editing.

**5. Serve behind the same LitServe pattern**, one endpoint per adapter (or one
   multi-task endpoint with a task field), and record the request/response
   contract so kudbee-music's provider seam (`studio/lightning.mjs`,
   `lightningLyricsProvider.ts`) can consume it.

**Priority order within Phase 4:** lyrics → production → video → cover
(lyrics has the richest dataset and the clearest eval; cover is the most
subjective, do it last).

---

## Sidecar: the MiniMax studio (investigate, don't block on it)

The founder has **MiniMax 2.5 running with a chat window on a second Lightning
Studio** (2026-07-07). This is a side quest — never let it stall Phases 1–2.
When you have idle time on that studio:

1. **Identify it precisely.** Which MiniMax build/size is actually installed, and
   is the chat window fronted by an HTTP API (LitServe? OpenAI-compatible server?
   something bespoke)? Record the answer in a training-notes file.
2. **If it has an HTTP API**, it plugs into kudbee-music's existing seam with zero
   new code: expose the endpoint, founder puts URL + token in `.env.local`, then
   `node studio/lightning.mjs --ping` and a real `--prompt` call (use `--field` if
   its request body key isn't `prompt`).
3. **Best use is teacher, not student.** MiniMax-class MoE models are far too
   large to LoRA-train on a single RTX 6000 — do not attempt. Its value is
   (a) an alternative inference provider to compare against the KUDBEE adapters,
   and (b) a teacher for synthetic training data (e.g. generating SCRIBE
   alternatives or judging eval outputs). Teacher-generated data inherits the
   full safety contract: original-only, no living-artist mimicry, banned-word
   screen — same as everything else. The full teacher workflow — per-row screening,
   `source: "teacher-minimax"` lineage tagging, and the 30-row / ≥80%-approved
   founder spot-check that must clear before any teacher row enters a training
   set — is specified in [`lightning-librarian.md`](lightning-librarian.md) §8.
   Budget rule: idle time on that studio only — the sidecar's catalog budget line
   is $0 and stays $0; never spin up a paid session solely for it.

## Standing reporting loop

At the end of every GPU session, before shutting the Studio down:

1. Update the dated notes file for whatever ran.
2. Update `brain/modelFamily.json` (the Librarian session-end step — ground
   rule 8): status, evals with run counts, gate stage, spent budget,
   `lastTouched`, `nextAction`, a history event; then `npx vitest run
   modelFamily` and push the catalog change as a kudbee-music PR.
3. Post a short status back to the founder: what completed, val loss / pass
   rate, budget spent vs cap, what's blocked, what the next GPU session should
   do first.
4. If anything in this roadmap turned out wrong (a command, a path, a bar),
   say so explicitly so this file gets corrected in kudbee-music — this doc is
   the shared map and it must not drift from reality.

---

## See also

- [`lightning-librarian.md`](lightning-librarian.md) — the Librarian: the standing
  overseer layer (KUDBEE-GATE, versioning, rollback, drift watch, the never-do list)
- [`brain/modelFamily.json`](../brain/modelFamily.json) — the model-family card
  catalog this work order executes against
- [`scribe-training-next-steps.md`](scribe-training-next-steps.md) — Phase 1 in
  step-by-step detail (conversion, verification prompt, endpoint wiring)
- [`scribe-real-training-v1.md`](scribe-real-training-v1.md) — how v1 was trained
- [`scribe-evaluation-prompts.md`](scribe-evaluation-prompts.md) — the eval cases
- [`scribe-training.md`](scribe-training.md) — dataset strategy + safety contract
- [`lightning-plan.md`](lightning-plan.md) — the provider/key boundary rules
- `kudbee-code-v0/training-notes/NEXT_RTX6000_SCRIBE_TEST.md` — the exact staged
  commands (other repo, GPU side)
