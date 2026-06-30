// Short-term (working) memory — the brain's RAM. Holds the most recent moves of
// the CURRENT session: the signals firing, the choices, the live draft. It's small
// and it decays — old items fall out as new ones arrive. When a song is finished,
// it CONSOLIDATES: the session's salient words move into long-term memory (the
// taste model / vault). Short-term feels the moment; long-term keeps what mattered.

export interface MemoryItem {
  kind: 'signal' | 'choice' | 'draft';
  text: string;
  /** sequence tick (not wall-clock — keeps it deterministic/testable) */
  seq: number;
}

export interface WorkingMemory {
  note(item: Omit<MemoryItem, 'seq'>): void;
  recent(n?: number): MemoryItem[];
  size(): number;
  clear(): void;
  /** Consolidate the session into long-term signals: the salient words to keep. */
  consolidate(): { keep: string[]; items: MemoryItem[] };
}

const STOP = new Set(['the', 'and', 'for', 'with', 'this', 'that', 'into', 'your', 'from', 'a', 'an', 'of', 'to', 'it']);

/** A decaying ring buffer. capacity = how many recent items it can hold. */
export function createWorkingMemory(capacity = 12): WorkingMemory {
  let buf: MemoryItem[] = [];
  let seq = 0;
  return {
    note(item) {
      buf.push({ ...item, seq: seq++ });
      if (buf.length > capacity) buf = buf.slice(buf.length - capacity); // decay: oldest falls out
    },
    recent(n = capacity) { return buf.slice(Math.max(0, buf.length - n)); },
    size() { return buf.length; },
    clear() { buf = []; },
    consolidate() {
      // the words that recurred across the session's choices/drafts are what's worth
      // keeping in long-term memory (the artist's voice for this session).
      const counts = new Map<string, number>();
      for (const it of buf) {
        if (it.kind === 'signal') continue; // signals are transient nerve traffic
        for (const w of it.text.toLowerCase().split(/[^a-z0-9']+/)) {
          if (w.length > 3 && !STOP.has(w)) counts.set(w, (counts.get(w) ?? 0) + 1);
        }
      }
      const keep = [...counts.entries()].filter(([, c]) => c >= 1).sort((a, b) => b[1] - a[1]).slice(0, 12).map(([w]) => w);
      return { keep, items: buf.slice() };
    },
  };
}
