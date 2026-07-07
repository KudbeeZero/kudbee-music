// The Librarian's reader — typed access + mechanical invariants over
// brain/modelFamily.json, the model-family card catalog. Same pattern as
// roadmap.json → statusBoard.ts: the JSON is the single place training-program
// state lives; this module makes its rules checkable so CI (modelFamily.test.ts)
// fails the moment the catalog claims something the KUDBEE-GATE forbids —
// a promotion without the gate cleared, a "confirmed" eval with too few runs,
// a budget line spent past its cap. Pure + deterministic: no Date.now() —
// stall detection takes an injected `nowIso`, the same opts.now discipline as
// the generation path. Ops-side only; nothing in components/ or app/ imports it.
import family from '../../brain/modelFamily.json';

export const MODEL_STATUSES = [
  'planned', 'dataset-ready', 'training', 'trained-unconverted',
  'converted-unverified', 'evaluating', 'candidate', 'promoted', 'retired', 'teacher',
] as const;
export type ModelStatus = (typeof MODEL_STATUSES)[number];

export interface EvalRecord {
  metric: string;
  value: number;
  runs: number;
  confirmed: boolean;
  date: string;
  cases?: number;
  note?: string | null;
}

export interface GateState {
  stage: string | null;
  cleared: boolean;
  blockedOn: string | null;
}

export interface ModelEntry {
  id: string;
  family: string;
  task: string;
  status: string;
  baseModel: string;
  recipe: string;
  dataset: { id: string | null; rows: number | null; sources: string[]; generator: string };
  training: { valLoss: number | null; date: string | null; note: string | null };
  artifacts: { checkpoint: string | null; adapter: string | null };
  evals: EvalRecord[];
  gate: GateState;
  endpoint: { served: boolean; url: string | null; note: string | null };
  trainingNotes: string[];
  nextAction: string;
  lastTouched: string;
  staleAfterDays: number;
  history: { date: string; event: string }[];
}

export interface BudgetPhase {
  id: string;
  gpuHoursCap: number;
  usdCap: number;
  spentGpuHours: number;
  spentUsd: number;
  covers: string;
}

const spine = family as unknown as {
  note: string;
  updated: string;
  promotionGate: { name: string; confirmRuns: number };
  trainOrder: { queue: string[] };
  budget: { monthlyUsdCap: number; phases: BudgetPhase[] };
  models: ModelEntry[];
};

/** Eval runs required before a score counts as confirmed (KUDBEE-GATE G3). */
export const CONFIRM_RUNS = spine.promotionGate.confirmRuns;

export function models(): ModelEntry[] {
  return spine.models;
}

export function modelById(id: string): ModelEntry | undefined {
  return spine.models.find((m) => m.id === id);
}

export function budgetPhases(): BudgetPhase[] {
  return spine.budget.phases;
}

export function trainOrder(): string[] {
  return spine.trainOrder.queue;
}

const isIsoDate = (s: string): boolean => /^\d{4}-\d{2}-\d{2}$/.test(s) && !Number.isNaN(Date.parse(s));

/**
 * Every way the catalog can contradict the Librarian's own rules, as strings.
 * Empty array = the catalog is internally honest. CI asserts empty.
 */
export function catalogViolations(): string[] {
  const out: string[] = [];
  const seen = new Set<string>();

  for (const m of spine.models) {
    const tag = m.id || '(missing id)';
    if (!m.id) out.push('a model entry is missing an id');
    if (seen.has(m.id)) out.push(`${tag}: duplicate model id`);
    seen.add(m.id);

    if (!(MODEL_STATUSES as readonly string[]).includes(m.status)) {
      out.push(`${tag}: unknown status "${m.status}"`);
    }
    if (!m.nextAction?.trim()) out.push(`${tag}: no nextAction — the Librarian never leaves a model without one`);
    if (!isIsoDate(m.lastTouched)) out.push(`${tag}: lastTouched "${m.lastTouched}" is not a YYYY-MM-DD date`);
    if (!(m.staleAfterDays > 0)) out.push(`${tag}: staleAfterDays must be a positive number of days`);

    for (const e of m.evals) {
      if (e.confirmed && e.runs < CONFIRM_RUNS) {
        out.push(`${tag}: eval "${e.metric}" marked confirmed with ${e.runs} run(s) — confirmed requires ${CONFIRM_RUNS} (a single run is never settled)`);
      }
    }

    const hasConfirmedEval = m.evals.some((e) => e.confirmed && e.runs >= CONFIRM_RUNS);
    if (m.gate.cleared && !hasConfirmedEval) {
      out.push(`${tag}: gate marked cleared without a confirmed eval (G3 not actually passed)`);
    }
    if (m.gate.cleared && !m.endpoint.served) {
      out.push(`${tag}: gate marked cleared without a served endpoint (G5 not actually passed)`);
    }
    if (m.status === 'promoted' && !m.gate.cleared) {
      out.push(`${tag}: status "promoted" without KUDBEE-GATE cleared — promotion is gated, not declared`);
    }
    if (m.status === 'teacher' && m.gate.cleared) {
      out.push(`${tag}: a teacher model can never clear the promotion gate (teachers are never promoted)`);
    }
    if (m.endpoint.served && !m.endpoint.url?.trim()) {
      out.push(`${tag}: endpoint marked served with no URL recorded`);
    }
  }

  for (const id of spine.trainOrder.queue) {
    const m = modelById(id);
    if (!m) out.push(`trainOrder names unknown model "${id}"`);
    else if (m.status === 'teacher') out.push(`trainOrder includes teacher "${id}" — teachers are never trained`);
  }

  for (const p of spine.budget.phases) {
    if (p.spentUsd > p.usdCap) {
      out.push(`budget ${p.id}: spentUsd ${p.spentUsd} exceeds usdCap ${p.usdCap} — an overrun must be resolved by the founder raising the cap`);
    }
    if (p.spentGpuHours > p.gpuHoursCap && p.gpuHoursCap > 0) {
      out.push(`budget ${p.id}: spentGpuHours ${p.spentGpuHours} exceeds gpuHoursCap ${p.gpuHoursCap}`);
    }
  }

  return out;
}

/**
 * Models whose lastTouched is older than their staleAfterDays as of `nowIso`
 * (YYYY-MM-DD, injected — never Date.now()). The Librarian's session protocol
 * runs this at every GPU-session start and escalates anything it returns;
 * it is deliberately NOT a CI assertion, so a quiet fortnight fails a session
 * checklist instead of making an unrelated commit go red.
 */
export function staleModels(nowIso: string): { id: string; daysSinceTouch: number }[] {
  const now = Date.parse(nowIso);
  return spine.models
    .map((m) => ({ id: m.id, daysSinceTouch: Math.floor((now - Date.parse(m.lastTouched)) / 86_400_000), staleAfterDays: m.staleAfterDays }))
    .filter((m) => m.daysSinceTouch > m.staleAfterDays)
    .map(({ id, daysSinceTouch }) => ({ id, daysSinceTouch }));
}

// ---- training-progress metrics (the dashboard data source) -------------------------
// "How much has each model been trained?" — a pure projection of the catalog into the
// numbers a dashboard renders (docs/agent-trajectory-dataset.md + the /tde cockpit).
// Deterministic: same catalog ⇒ same metrics, no clock. The gate stages are the KUDBEE-
// GATE pipeline in order, so an index over them is an honest "how far through" measure.

/** The KUDBEE-GATE stages in pipeline order — G0 → G6. */
export const GATE_STAGES = [
  'G0-dataset', 'G1-train', 'G2-verify', 'G3-eval', 'G4-head-to-head', 'G5-serve', 'G6-promote',
] as const;
export type GateStage = (typeof GATE_STAGES)[number];

export interface TrainingProgress {
  id: string;
  family: string;
  status: string;
  gateStage: string | null;
  /** Index into GATE_STAGES, or -1 if not started. */
  gateIndex: number;
  /** How far through the 7-stage pipeline, 0–100 (0 when not started). */
  gatePercent: number;
  gateCleared: boolean;
  /** Training-set size — the clearest "how much data it was trained on". */
  datasetRows: number | null;
  valLoss: number | null;
  /** Most-repeated eval's run count (0 if never evaluated) and its pass rate. */
  evalRuns: number;
  evalPassRate: number | null;
  evalConfirmed: boolean;
  /** Recorded training-ops iterations — the length of the decision trail. */
  iterations: number;
  served: boolean;
  nextAction: string;
}

/** One model's training progress. Returns null for an unknown id. */
export function trainingProgress(id: string): TrainingProgress | null {
  const m = modelById(id);
  if (!m) return null;
  const gateIndex = m.gate.stage ? GATE_STAGES.indexOf(m.gate.stage as GateStage) : -1;
  // The eval that carries the most runs is the most-settled signal for this model.
  const topEval = m.evals.length
    ? m.evals.reduce((best, e) => (e.runs > best.runs ? e : best), m.evals[0])
    : null;
  return {
    id: m.id,
    family: m.family,
    status: m.status,
    gateStage: m.gate.stage,
    gateIndex,
    gatePercent: gateIndex < 0 ? 0 : Math.round((gateIndex / (GATE_STAGES.length - 1)) * 100),
    gateCleared: m.gate.cleared,
    datasetRows: m.dataset.rows,
    valLoss: m.training.valLoss,
    evalRuns: topEval?.runs ?? 0,
    evalPassRate: topEval?.value ?? null,
    evalConfirmed: m.evals.some((e) => e.confirmed && e.runs >= CONFIRM_RUNS),
    iterations: m.history?.length ?? 0,
    served: m.endpoint.served,
    nextAction: m.nextAction,
  };
}

/** Training progress for the whole family, in catalog order — the dashboard's row set. */
export function familyTrainingProgress(): TrainingProgress[] {
  return spine.models.map((m) => trainingProgress(m.id)!);
}
