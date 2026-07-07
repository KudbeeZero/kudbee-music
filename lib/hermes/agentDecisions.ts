// The agent-trajectory dataset — capturing the *process* of the KUDBEE training program
// (what was decided, on what evidence, and why) as fine-tuning rows for the repo/coding
// agent model (KUDBEECODEV0). This is the sibling of trainingData.ts: that module turns
// SONGS into rows for the songwriting models; this one turns DECISIONS into rows for the
// agent that runs the pipeline.
//
// The honest scope (see docs/agent-trajectory-dataset.md): we capture the *externalized*
// decision trail — the reasoning that got written down in commits, PR bodies, training-
// notes, and the Librarian catalog's per-model history[] — NOT a model's hidden chain of
// thought (not reliably capturable, and not ours to take). That externalized trail is the
// higher-quality signal anyway: it's the reasoning that survived review. And it needs no
// always-on server — the KUDBEE "write it down or it didn't happen" discipline already
// records it durably in git; this module just harvests it.
//
// Pure, node/CLI-only (like trainingData.ts / vectorMemory.ts) — never imported by the
// client bundle. Reads brain/modelFamily.json as the proven backfill source.
import family from '../../brain/modelFamily.json';

export type DecisionSource = 'model-family-history' | 'pr' | 'training-notes' | 'manual';

/** One captured decision — the structured, forward-going record an agent writes as it
 *  works (and the shape the backfill harvesters normalize existing artifacts into). */
export interface DecisionRecord {
  date: string; // YYYY-MM-DD
  modelId?: string; // the model the decision was about, if any
  task?: string; // one-line description of that model's job (stable framing context)
  situation: string; // the state/evidence faced
  decision: string; // what was decided/done, and why
  source: DecisionSource;
}

/** An Alpaca-shaped training row (instruction/input/output) — reuses the same JSONL the
 *  song tasks emit, so the Lightning side ingests it with zero new tooling. */
export interface DecisionExample {
  instruction: string;
  input: string;
  output: string;
  meta: { date: string; modelId: string; source: DecisionSource };
}

/** The task instruction — teaches the model the KUDBEE-GATE discipline, not just the fact
 *  of a decision. Every row shares it (same convention as trainingData.ts INSTRUCTIONS). */
export const DECISION_INSTRUCTION =
  'You are a KUDBEE model-training-ops agent (the Librarian). Given the state of a model in ' +
  'the family and what was observed, state the decision and next action, following the ' +
  'KUDBEE-GATE discipline: never advance a gate stage that did not actually happen, never ' +
  'mark an eval confirmed under three runs, never spend past a budget cap, and never write a ' +
  'secret anywhere in git.';

// Redact anything token/secret-shaped before a decision ever becomes a training row — the
// same patterns modelFamily.test.ts lints the catalog for. Belt-and-suspenders: the sources
// should never contain a secret, but a row that will be shipped to a GPU box must be scrubbed
// regardless. Never throw — sanitize and move on (the hostile-input iron law).
const SECRET_PATTERNS: RegExp[] = [
  /key_[A-Za-z0-9]{6,}/g,
  /sk-[A-Za-z0-9]{8,}/g,
  /Bearer\s+[A-Za-z0-9._-]{8,}/g,
  /token_[A-Za-z0-9]{8,}/g,
];
export function scrubSecrets(text: string): string {
  return SECRET_PATTERNS.reduce((s, re) => s.replace(re, '[redacted]'), text);
}

/** A captured decision → an Alpaca training row. Pure + deterministic. */
export function decisionToExample(r: DecisionRecord): DecisionExample {
  const frame = r.modelId
    ? `Model: ${r.modelId}${r.task ? ` — ${r.task}` : ''}.`
    : 'KUDBEE training program.';
  return {
    instruction: DECISION_INSTRUCTION,
    input: scrubSecrets(`${frame}\nObserved (${r.date}): ${r.situation}`),
    output: scrubSecrets(r.decision),
    meta: { date: r.date, modelId: r.modelId ?? '', source: r.source },
  };
}

const spine = family as unknown as {
  models: { id: string; task: string; history: { date: string; event: string }[] }[];
};

/**
 * Backfill: the Librarian catalog's per-model history[] is already a dated decision log —
 * every "conversion complete", "blocker moved to X", "dropped the bogus schemes, added a
 * guard test" entry is a real training-ops decision. Normalize them into DecisionRecords.
 * The situation is framed from the stable fields (id + task); the event text is the
 * decision. This is a lossy-but-real seed — richer rows come from forward structured
 * capture (agents writing DecisionRecords at decision time), documented in the doc.
 */
export function harvestModelFamilyDecisions(): DecisionRecord[] {
  const out: DecisionRecord[] = [];
  for (const m of spine.models) {
    for (const h of m.history ?? []) {
      out.push({
        date: h.date,
        modelId: m.id,
        task: m.task,
        situation: `a training-ops event was recorded for this model`,
        decision: h.event,
        source: 'model-family-history',
      });
    }
  }
  return out;
}

/** Alpaca JSONL for the decision rows — the exact shape toAlpacaJsonl emits for song tasks,
 *  so `cat` them together into one multi-domain fine-tuning file if desired. */
export function decisionsToAlpacaJsonl(examples: DecisionExample[]): string {
  return (
    examples
      .map((e) => JSON.stringify({ instruction: e.instruction, input: e.input, output: e.output }))
      .join('\n') + '\n'
  );
}

/** Drop exact-duplicate decisions (same date + modelId + decision text). */
export function dedupeDecisions(records: DecisionRecord[]): DecisionRecord[] {
  const seen = new Set<string>();
  const out: DecisionRecord[] = [];
  for (const r of records) {
    const k = `${r.date}::${r.modelId ?? ''}::${r.decision}`;
    if (seen.has(k)) continue;
    seen.add(k);
    out.push(r);
  }
  return out;
}
