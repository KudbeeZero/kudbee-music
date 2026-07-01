// The brain's anatomy — the single source of truth for what the brain is made of
// and how its parts connect. Each REGION is a functional area that maps to a real
// knowledge file (the file-system "vault"); each PATHWAY is a nerve along which the
// nervous system carries a signal. The Brain Scan renders this; the nervous system
// fires along it.
import type { AgentId, AgentOutput, AgentStatus } from './types';

export type RegionId =
  | 'intent' | 'language' | 'values' | 'generative' | 'analytical'
  | 'decision' | 'short-term' | 'long-term';

export type RegionState = 'idle' | 'running' | 'done' | 'soon';

export interface Region {
  id: RegionId;
  label: string;
  doc: string;                  // the knowledge file this region IS
  side: 'left' | 'right' | 'center';
  agents: AgentId[];            // lights when any of these fire
  x: number; y: number;         // position on the 440×300 brain
  soon?: boolean;               // not wired yet
}

// Functional areas. Memory is split into short-term (the live session) and
// long-term (the persisted vault/profile) — the two memory systems.
export const REGIONS: Region[] = [
  { id: 'intent', label: 'Intent', doc: 'the brief', side: 'center', agents: ['conductor'], x: 220, y: 54 },
  { id: 'language', label: 'Language & Culture', doc: 'lib/hermes/language.ts', side: 'left', agents: ['lyric-chemist'], x: 146, y: 96 },
  { id: 'values', label: 'Values', doc: 'brain/beliefs.json', side: 'center', agents: ['conductor'], x: 256, y: 104 },
  { id: 'generative', label: 'Generative (right)', doc: 'brain/personas.json', side: 'right', agents: ['hooksmith', 'lyric-chemist', 'visual-director', 'viral-clip-scout'], x: 338, y: 150 },
  { id: 'analytical', label: 'Analytical (left)', doc: 'originality + scoring', side: 'left', agents: ['beat-oracle', 'emotion-scanner', 'originality-auditor'], x: 102, y: 156 },
  { id: 'decision', label: 'Decision', doc: 'the Writers-Room (process.ts)', side: 'center', agents: ['ar-judge', 'rights-release-guard'], x: 220, y: 156 },
  { id: 'short-term', label: 'Short-term', doc: 'working memory (this session)', side: 'center', agents: ['hooksmith', 'lyric-chemist'], x: 172, y: 220 },
  { id: 'long-term', label: 'Long-term', doc: 'brain/memory.json + the vault', side: 'center', agents: ['originality-auditor'], x: 272, y: 222 },
];

// The nerves — directed signal pathways between regions.
export const PATHWAYS: [RegionId, RegionId][] = [
  ['intent', 'values'], ['intent', 'decision'], ['language', 'analytical'],
  ['values', 'decision'], ['decision', 'generative'], ['decision', 'analytical'],
  ['generative', 'short-term'], ['analytical', 'short-term'], ['analytical', 'long-term'],
  ['short-term', 'long-term'],
];

export function region(id: RegionId): Region | undefined {
  return REGIONS.find((r) => r.id === id);
}

/** Which region an agent belongs to (first match). */
export function agentRegion(agentId: AgentId): Region | undefined {
  return REGIONS.find((r) => r.agents.includes(agentId));
}

/** A region's live state from the per-agent outputs the pipeline emits. */
export function regionState(r: Region, outputs: Record<string, AgentOutput>): RegionState {
  if (r.soon) return 'soon';
  const states = r.agents.map((a) => outputs[a]?.status).filter(Boolean) as AgentStatus[];
  if (states.some((s) => s === 'running')) return 'running';
  if (states.length && states.every((s) => s === 'done' || s === 'warning')) return 'done';
  return 'idle';
}

/** The pathways currently carrying a signal — any nerve touching a running region. */
export function activePathways(outputs: Record<string, AgentOutput>): [RegionId, RegionId][] {
  const runningIds = new Set(
    REGIONS.filter((r) => regionState(r, outputs) === 'running').map((r) => r.id),
  );
  return PATHWAYS.filter(([a, b]) => runningIds.has(a) || runningIds.has(b));
}
