# The agent-trajectory dataset — capturing our own process as training data

**What this is / who reads it:** the design for turning the *process* of the KUDBEE
training program — every decision, correction, and gate transition the agents make — into
a fine-tuning dataset for the repo/coding-agent model (KUDBEECODEV0). Read this if you want
to understand what "capture the thinking as a dataset" actually means here, honestly, and
what's already built ([`lib/hermes/agentDecisions.ts`](../lib/hermes/agentDecisions.ts)).

## The founder's insight, and the honest version of it

The instinct is right: **a huge amount of valuable signal is generated while these agents
work** — the reasoning, the wrong turns, the corrections, the "keep G2 uncleared because no
round-trip happened" judgment calls. Throwing that away to only keep the final code is a
waste. It *is* a great dataset. Two honest refinements to the mechanism, though:

1. **We capture the *externalized* decision trail, not a model's hidden chain of thought.**
   You cannot reliably harvest Claude's (or any model's) private reasoning tokens, and it
   wouldn't be ours to take if you could. What you *can* capture — and what's actually the
   higher-quality signal — is the reasoning that got **written down**: the commit messages,
   the PR bodies, the training-notes files, and the Librarian catalog's per-model
   `history[]`. That's the reasoning that survived review. It's ours, it's clean of
   provenance problems (our repo, our decisions), and it's already in git.

2. **You don't need an always-on server capturing live sessions.** That would fight the
   repo's `$0`/no-server iron law, and it would mostly capture noise. The durable record
   already exists — because the Librarian discipline ("a run that isn't written down didn't
   happen") *forced* every decision into a committed artifact. The server you imagined is
   unnecessary: the capture already happened. What was missing is the **harvester** that
   turns those artifacts into training rows. That's what's now built.

So the architecture is: **externalized decisions (already in git) → harvester → Alpaca rows
→ KUDBEECODEV0 training set.** No server, no CoT scraping, no provenance risk.

## What's built now (`lib/hermes/agentDecisions.ts`)

The sibling of `trainingData.ts` — that module turns *songs* into rows for the songwriting
models; this one turns *decisions* into rows for the agent that runs the pipeline.

- **`DecisionRecord`** — the structured capture: `{ date, modelId?, task?, situation,
  decision, source }`. The forward-going shape an agent writes as it works, and the shape
  backfill harvesters normalize existing artifacts into.
- **`decisionToExample()`** — a record → an Alpaca `{instruction, input, output}` row. The
  `instruction` teaches the KUDBEE-GATE discipline itself (never advance a gate that didn't
  happen, never confirm an eval under 3 runs, never write a secret), so the model learns the
  *rules*, not just the facts.
- **`harvestModelFamilyDecisions()`** — the proof-of-concept backfill: reads
  `brain/modelFamily.json`'s per-model `history[]` (already a dated decision log) into
  records. Today's catalog alone yields a dozen+ real training-ops decisions — conversion
  completing, the blocker moving to the identity gate, the bogus-scheme correction.
- **`scrubSecrets()`** — every row is scrubbed of token/secret-shaped substrings before it
  can ship, the same patterns `modelFamily.test.ts` lints the catalog for. Belt-and-braces:
  the sources shouldn't contain secrets, but a row bound for a GPU box gets scrubbed anyway.
- **`decisionsToAlpacaJsonl()`** — emits the exact JSONL shape the song tasks use, so a
  multi-domain fine-tune can `cat` them together.

Everything is pure and node/CLI-only (never in the client bundle), like `trainingData.ts`.

## Why this feeds KUDBEECODEV0 specifically

The four HERMES models and SCRIBE learn *songwriting* from `trainingData.ts`. KUDBEECODEV0
is the **repo/coding-agent** model — its job is exactly this kind of ops judgment: read a
state, weigh evidence, decide the next action, respect the guardrails. The decision trail is
process-supervision data for precisely that behavior. It's the one model in the family whose
training set is the *work itself*.

## The capture pipeline, end to end

1. **Agents externalize decisions as they work** (already the discipline): commit messages,
   PR bodies, training-notes, and — the richest, most structured source — appending a
   `history[]` event to the model in `brain/modelFamily.json` at every gate transition.
2. **Harvest** ($0, local, deterministic): `harvestModelFamilyDecisions()` today; PR-body
   and training-notes harvesters are the natural next sources (same `DecisionRecord` shape,
   `source: 'pr' | 'training-notes'`).
3. **Scrub + dedupe + serialize** → `out/training-data/agent-decision.alpaca.jsonl`
   (gitignored, regenerated — same rule as every other training file).
4. **Train** KUDBEECODEV0 on it (its own KUDBEE-GATE run), or blend into the multi-task set.

## The safety boundary (what this must never do)

- **Never ship a secret in a row.** `scrubSecrets()` runs on every input and output; the
  test asserts the whole harvested set is clean. Endpoint URLs may appear (they're
  recordable per the Librarian rules); bearer tokens never.
- **Never capture hidden model reasoning** — only the externalized, written-down trail.
- **Never stand up a server for this** — it violates the `$0`/no-server law and isn't
  needed; the harvester reads the durable git record.
- **Original-only carries over** — a decision row is our own ops history, not anyone's
  copyrighted work; the safety contract rides along like every other KUDBEE dataset.

## Next steps (not in this PR — captured so they aren't lost)

- PR-body + training-notes harvesters (`source: 'pr' | 'training-notes'`).
- A thin `hermes decisions` CLI to regenerate the JSONL alongside `prepare-training-data`.
- Once KUDBEECODEV0 clears its gate, a head-to-head: does training on the decision trail
  measurably improve its 47-case repo-agent pass rate?

## See also

- [`lib/hermes/agentDecisions.ts`](../lib/hermes/agentDecisions.ts) — the harvester + row builder
- [`lib/hermes/trainingData.ts`](../lib/hermes/trainingData.ts) — the songwriting sibling
- [`lightning-librarian.md`](lightning-librarian.md) — where the `history[]` decision log lives
- [`lightning-plan.md`](lightning-plan.md) — the `$0`/local training-data-prep boundary
