// TDE integration contracts — Branch 09 (docs/kudbee-tde-roadmap.md).
// TypeScript types ONLY for the future read-only integrations: GitHub PR
// state, hermes-lyric-server health, Lightning GPU jobs, memory index,
// training evals, SCRIBE endpoint. Nothing in this file (or anywhere in v1)
// fetches, polls, or connects — these are the shapes the Branch 12 backend
// bridge must produce before any panel goes live. Keeping them typed now
// means the mock panels and the future live feeds can share one vocabulary.

/** Where a value on screen came from. Every live integration must say. */
export type TdeDataSource = 'mock' | 'snapshot' | 'live-readonly';

export interface RepoStatus {
  name: string;
  origin: 'this repo' | 'external';
  canonicalBranch: string;
  protectedPaths: string[];
  /** e.g. 'active', 'archived', 'training — hands off' */
  status: string;
  openPrCount?: number;
  source: TdeDataSource;
}

export interface AgentStatus {
  name: string;
  state: 'active' | 'standby' | 'planned' | 'blocked';
  role: string;
  allowed: string[];
  forbidden: string[];
  spawnedBy: string;
  risk: 'low' | 'medium' | 'high';
  /** Depth in the spawn tree; the TDE contract caps this at 1. */
  depth: 0 | 1;
  source: TdeDataSource;
}

export interface ModelStatus {
  name: string;
  lane: string;
  origin: 'this repo' | 'external';
  /** e.g. 'shipping default', 'LoRA trained · eval pending', 'planned' */
  status: string;
  baseModel?: string;
  source: TdeDataSource;
}

export interface GPUJobStatus {
  id: string;
  what: string;
  gpu: 'T4' | 'RTX 6000';
  state: 'queued' | 'running' | 'done' | 'failed' | 'cancelled';
  /** ISO timestamp supplied by the feed (never generated client-side). */
  updatedAt?: string;
  approvalRequired: boolean;
  source: TdeDataSource;
}

export interface MemoryState {
  file: string;
  what: string;
  /** ISO timestamp of the snapshot the panel is showing. */
  asOf?: string;
  source: TdeDataSource;
}

export interface TrainingEvalSummary {
  model: string;
  trainingRows: number;
  evalPassed: number;
  evalTotal: number;
  /** evalPassed / evalTotal, precomputed by the feed so the UI stays dumb. */
  passRate: number;
  dropQueueDepth: number;
  nextDataTarget: string;
  source: TdeDataSource;
}

export interface PRStatus {
  repo: string;
  number: number;
  title: string;
  state: 'open' | 'draft' | 'merged' | 'closed';
  checks: 'pending' | 'green' | 'red';
  branch: string;
  source: TdeDataSource;
}

export interface ScribeStatus {
  /** Health of the future SCRIBE serving endpoint (hermes-lyric-server). */
  reachable: boolean;
  model: string;
  /** e.g. 'POST /predict — Bearer auth' per docs/scribe-training.md §4. */
  contract: string;
  lastEval?: TrainingEvalSummary;
  source: TdeDataSource;
}
