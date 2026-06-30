// The nervous system — the brain's signalling layer. A tiny pub/sub bus that
// carries a Signal from one region to another as the agents fire. The Brain Scan
// subscribes to pulse its nerves; working memory subscribes to record what just
// happened. One source of truth for "what the brain is doing right now."
import type { AgentId } from './types';
import type { RegionId } from './brainMap';
import { agentRegion, PATHWAYS } from './brainMap';

export interface Signal {
  /** the region that fired */
  region: RegionId;
  /** the agent behind it, if any */
  agentId?: AgentId;
  /** monotonically increasing tick (sequence), not wall-clock (keeps it pure) */
  seq: number;
  /** a short human label for logs / working memory */
  note: string;
}

export type SignalListener = (s: Signal) => void;

export interface NervousSystem {
  fire(s: Omit<Signal, 'seq'>): Signal;
  subscribe(fn: SignalListener): () => void;
  history(): Signal[];
}

/** Create an isolated nervous system (one per song session). */
export function createNervousSystem(): NervousSystem {
  const listeners = new Set<SignalListener>();
  const log: Signal[] = [];
  let seq = 0;
  return {
    fire(partial) {
      const s: Signal = { ...partial, seq: seq++ };
      log.push(s);
      for (const fn of listeners) fn(s);
      return s;
    },
    subscribe(fn) { listeners.add(fn); return () => listeners.delete(fn); },
    history() { return log.slice(); },
  };
}

/** Turn an agent firing into the signal for its region (used by the run loop). */
export function signalForAgent(agentId: AgentId, note: string): Omit<Signal, 'seq'> | null {
  const r = agentRegion(agentId);
  if (!r) return null;
  return { region: r.id, agentId, note };
}

/** The nerves leaving a region — used to animate outgoing pulses. */
export function outgoingPathways(regionId: RegionId): [RegionId, RegionId][] {
  return PATHWAYS.filter(([a]) => a === regionId);
}
