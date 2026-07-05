// Singability/meter scoring — a scoped slice of the "Meter/stress + rap-flow
// parameters" backlog item (docs/pattern-packs.md → "Deliberately out of scope for this
// pass"). Grounded in Condit-Schultz's MCFlow corpus (the "speed" dial: syllables per
// line/beat) and Adams' flow decomposition, per a deep-research pass — see
// docs/pattern-packs.md for the full citation trail. Deliberately NOT full metric-
// position flow (aligning stresses/rhymes to a beat grid): that needs a beat grid
// HERMES doesn't have. This module only answers "is this line's syllable count close to
// a target range" — a $0, deterministic, testable slice of the real research.
import { syllableCount } from './lexicon';

/** Sum of heuristic per-word syllable counts across a line (punctuation-agnostic). */
export function lineSyllables(line: string): number {
  const words = line.toLowerCase().match(/[a-z']+/g) ?? [];
  return words.reduce((sum, w) => sum + syllableCount(w), 0);
}

/** 1.0 when `count` falls inside `[lo,hi]`; decays smoothly outside it (never 0). */
export function syllableFit(count: number, target: [number, number]): number {
  const [lo, hi] = target;
  if (count >= lo && count <= hi) return 1;
  const dist = count < lo ? lo - count : count - hi;
  return 1 / (1 + dist);
}

/** Validates an untrusted syllableTarget the way pipeline.ts validates tempo/rhymeScheme:
 *  a malformed value is dropped (generation defaults to today's unconstrained behavior),
 *  never trusted. Clamped to a sane per-line range (1-40 syllables). */
export function sanitizeSyllableTarget(raw: unknown): [number, number] | undefined {
  if (!Array.isArray(raw) || raw.length !== 2) return undefined;
  const [a, b] = raw;
  if (typeof a !== 'number' || typeof b !== 'number' || !Number.isFinite(a) || !Number.isFinite(b)) return undefined;
  const lo = Math.max(1, Math.min(40, Math.round(Math.min(a, b))));
  const hi = Math.max(1, Math.min(40, Math.round(Math.max(a, b))));
  return [lo, hi];
}
