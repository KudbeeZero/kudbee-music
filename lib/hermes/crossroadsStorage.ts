// Crossroads Board — Stage 2 storage: this browser's own votes on each crossing,
// kept only in localStorage (same $0/local-first idiom as claudeKey.ts/identity.ts).
// Community-wide vote sync across visitors (stage 4, an API layer) is a later,
// separate service — this stage is honest that today's tally reflects only your
// own browser's vote layered on the seeded base, not a real community count.

import { recordTaste } from './storage';

const VOTES_KEY = 'hermes.crossroadsVotes.v1';

interface KV {
  getItem(k: string): string | null;
  setItem(k: string, v: string): void;
}

const memory = new Map<string, string>();
const memoryKV: KV = {
  getItem: (k) => (memory.has(k) ? memory.get(k)! : null),
  setItem: (k, v) => void memory.set(k, v),
};

function kv(): KV {
  if (typeof window !== 'undefined' && window.localStorage) return window.localStorage;
  return memoryKV;
}

/** crossingId -> the option id this browser voted for. */
export type CrossroadsVotes = Record<string, string>;

/** This browser's votes. Empty object if none cast yet, or if the stored value is corrupt. */
export function getMyVotes(): CrossroadsVotes {
  try {
    const raw = kv().getItem(VOTES_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {};
  } catch {
    return {};
  }
}

/** Cast (or change) this browser's vote for a crossing. Returns the updated vote map. */
export function castVote(crossingId: string, optionId: string): CrossroadsVotes {
  const next = { ...getMyVotes(), [crossingId]: optionId };
  try {
    kv().setItem(VOTES_KEY, JSON.stringify(next));
  } catch {
    /* quota / unavailable — the returned map still drives this render via component
       state; the vote just won't survive a reload (soft state, silently best-effort
       by design — see storage.ts's quota-reporting scope note) */
  }
  return next;
}

/** Stage 3 (signals feed the brain): cast a vote + record its taste signal.
 * Called when you vote on a crossing option that has a tasteSignal.
 * Wires into lib/hermes/storage.ts's recordTaste() so your taste updates
 * and the next song reflects your crossroads choice. */
export function castVoteAndRecordTaste(
  crossingId: string,
  optionId: string,
  tasteSignal?: { liked?: string[]; disliked?: string[] }
): CrossroadsVotes {
  const votes = castVote(crossingId, optionId);
  if (tasteSignal) {
    recordTaste(tasteSignal.liked ?? [], tasteSignal.disliked ?? []);
  }
  return votes;
}

/** test-only reset */
export function __clearCrossroadsVotesState(): void {
  memory.clear();
  try {
    kv().setItem(VOTES_KEY, '');
  } catch {
    /* ignore */
  }
}
