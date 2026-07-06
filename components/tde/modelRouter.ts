// TDE mock model router — Branch 08 (docs/kudbee-tde-roadmap.md). The routing
// policy as typed data: task type → recommended model/tool, why, risk, and
// whether founder approval is required. Pure data + one pure lookup — no I/O,
// no network, nothing executes. The Model Router panel renders this table.

export type TdeTaskType =
  | 'architecture'
  | 'coding'
  | 'risky-review'
  | 'cheap-labeling'
  | 'training'
  | 'gpu-eval'
  | 'local-coding-agent'
  | 'lyric-rewrite'
  | 'song-generation'
  | 'deterministic-lyrics';

export type TdeRiskLevel = 'low' | 'medium' | 'high';

export interface TdeRouteRule {
  task: TdeTaskType;
  label: string;
  routeTo: string;
  reason: string;
  risk: TdeRiskLevel;
  approvalRequired: boolean;
}

export const TDE_ROUTE_RULES: readonly TdeRouteRule[] = [
  {
    task: 'architecture',
    label: 'Architecture / design',
    routeTo: 'Fable-class advisor',
    reason: 'Highest-judgment calls; used sparingly, one consult per decision.',
    risk: 'medium',
    approvalRequired: false,
  },
  {
    task: 'coding',
    label: 'Coding',
    routeTo: 'Sonnet-class executor',
    reason: 'The workhorse — implements one branch at a time inside the safety envelope.',
    risk: 'low',
    approvalRequired: false,
  },
  {
    task: 'risky-review',
    label: 'Risky-change review',
    routeTo: 'Opus-class advisor',
    reason: 'Second set of eyes before anything sensitive merges.',
    risk: 'medium',
    approvalRequired: false,
  },
  {
    task: 'cheap-labeling',
    label: 'Cheap labeling / triage',
    routeTo: 'Haiku-class',
    reason: 'Volume work where per-item cost dominates quality ceiling.',
    risk: 'low',
    approvalRequired: false,
  },
  {
    task: 'training',
    label: 'Training run',
    routeTo: 'Lightning GPU — RTX 6000 lane',
    reason: '14B fine-tunes and dense rehearsal need the 97GB card.',
    risk: 'high',
    approvalRequired: true,
  },
  {
    task: 'gpu-eval',
    label: 'GPU eval',
    routeTo: 'Lightning GPU — T4 lane',
    reason: 'Light eval and MINI runs fit the cheap card; escalate only when they do not.',
    risk: 'medium',
    approvalRequired: true,
  },
  {
    task: 'local-coding-agent',
    label: 'Local coding-agent behavior',
    routeTo: 'KUDBEECODEV0 (MINI / 14B)',
    reason: 'The future local Claude-Code-style lane; suggest-only until it clears evals.',
    risk: 'medium',
    approvalRequired: true,
  },
  {
    task: 'lyric-rewrite',
    label: 'Lyric line rewrite',
    routeTo: 'KUDBEESCRIBEV1',
    reason: "SCRIBE's fine-tuned lane (Qwen2.5-14B LoRA); HERMES rhyme engine stays the guarantee.",
    risk: 'low',
    approvalRequired: false,
  },
  {
    task: 'song-generation',
    label: 'Song generation',
    routeTo: 'KUDBEEV1',
    reason: 'The trained song-brain lane once it exists; HERMES is the deterministic fallback.',
    risk: 'medium',
    approvalRequired: true,
  },
  {
    task: 'deterministic-lyrics',
    label: 'Deterministic lyric engine',
    routeTo: 'HERMES (this repo)',
    reason: '$0, local, seeded, original-only — the shipping default; never needs approval.',
    risk: 'low',
    approvalRequired: false,
  },
] as const;

/** Pure lookup — the only "router" behavior that exists in v1. */
export function routeTask(task: TdeTaskType): TdeRouteRule {
  const rule = TDE_ROUTE_RULES.find((r) => r.task === task);
  // Every TdeTaskType has a rule above; the fallback keeps the function total.
  return rule ?? TDE_ROUTE_RULES[TDE_ROUTE_RULES.length - 1];
}
