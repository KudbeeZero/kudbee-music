// A one-time "seen it" flag for the Engine Rack's first-visit explainer — same idiom
// as storage.ts's scribeTourSeen (a plain browser-global UI hint, not per-account
// memory), but colocated with the Rack rather than the vault module since nothing
// else in storage.ts concerns the Rack. See docs/plugin-rack-architecture.md.

const RACK_TOUR_KEY = 'hermes.rackTourSeen.v1';

interface KV {
  getItem(k: string): string | null;
  setItem(k: string, v: string): void;
  removeItem(k: string): void;
}

const memory = new Map<string, string>();
const memoryKV: KV = {
  getItem: (k) => (memory.has(k) ? memory.get(k)! : null),
  setItem: (k, v) => void memory.set(k, v),
  removeItem: (k) => void memory.delete(k),
};

function kv(): KV {
  if (typeof window !== 'undefined' && window.localStorage) return window.localStorage;
  return memoryKV;
}

/** Has this browser already dismissed the Rack's first-visit explainer? */
export function hasSeenRackTour(): boolean {
  try {
    return kv().getItem(RACK_TOUR_KEY) === '1';
  } catch {
    return false;
  }
}

export function markRackTourSeen(): void {
  try {
    kv().setItem(RACK_TOUR_KEY, '1');
  } catch {
    /* ignore */
  }
}

/** test-only reset */
export function __clearRackTourState(): void {
  memory.clear();
  try {
    kv().removeItem(RACK_TOUR_KEY);
  } catch {
    /* ignore */
  }
}
