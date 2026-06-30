// Small deterministic text utilities shared by the engine. No randomness that
// isn't seedable — same inputs always produce the same song, which keeps tests
// stable and makes the vault's uniqueness comparisons meaningful.

/** Mulberry32 — tiny deterministic PRNG. */
export function makeRng(seed: number) {
  let a = seed >>> 0;
  return function rng() {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Stable 32-bit string hash (FNV-1a-ish). */
export function hashString(s: string): number {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

export function pick<T>(arr: T[], rng: () => number): T {
  return arr[Math.floor(rng() * arr.length) % arr.length];
}

/** Seeded Fisher–Yates shuffle — a true unbiased permutation (returns a copy). */
export function shuffle<T>(arr: T[], rng: () => number): T[] {
  const out = arr.slice();
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

/** Lowercase, strip punctuation, collapse whitespace. */
export function normalizeLine(line: string): string {
  return line
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s']/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function tokenize(text: string): string[] {
  return normalizeLine(text).split(' ').filter(Boolean);
}

/** Contiguous word n-grams across the whole text. */
export function ngrams(tokens: string[], n: number): string[] {
  const out: string[] = [];
  for (let i = 0; i + n <= tokens.length; i++) out.push(tokens.slice(i, i + n).join(' '));
  return out;
}

/** Jaccard similarity over token-bigram sets (0–1) — order-sensitive. */
export function lineSimilarity(a: string, b: string): number {
  const A = new Set(ngrams(tokenize(a), 2));
  const B = new Set(ngrams(tokenize(b), 2));
  if (!A.size && !B.size) return a.trim() === b.trim() ? 1 : 0;
  let inter = 0;
  for (const g of A) if (B.has(g)) inter++;
  const union = A.size + B.size - inter;
  return union ? inter / union : 0;
}

/** Jaccard over the word SET (0–1) — order-insensitive, so it catches a line
 *  that was reworded/reordered but reuses the same vocabulary (a paraphrase the
 *  bigram check misses). */
export function tokenSetSimilarity(a: string, b: string): number {
  const A = new Set(tokenize(a));
  const B = new Set(tokenize(b));
  if (!A.size || !B.size) return 0;
  let inter = 0;
  for (const t of A) if (B.has(t)) inter++;
  return inter / (A.size + B.size - inter);
}

/** Clean a generated line: collapse spaces, fix a/an agreement, capitalize. */
export function tidyLine(s: string): string {
  let out = s.replace(/\s+/g, ' ').trim();
  out = out.replace(/\b([Aa])\s+([aeiou])/g, (_m, a, v) => `${a}n ${v}`);   // a apple -> an apple
  out = out.replace(/\b([Aa])n\s+([^aeiou\s])/g, (_m, a, c) => `${a} ${c}`); // an dog -> a dog
  return out.charAt(0).toUpperCase() + out.slice(1);
}

export function titleCase(s: string): string {
  return s.replace(/\b\w/g, (c) => c.toUpperCase());
}

/** Pull meaningful keywords from a free-text field (drops stopwords). */
const STOP = new Set([
  'the', 'a', 'an', 'and', 'or', 'but', 'for', 'to', 'of', 'in', 'on', 'my',
  'me', 'i', 'we', 'you', 'it', 'with', 'not', 'is', 'be', 'so', 'that', 'this',
]);
export function keywords(text: string, max = 8): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const t of tokenize(text)) {
    if (t.length < 3 || STOP.has(t) || seen.has(t)) continue;
    seen.add(t);
    out.push(t);
    if (out.length >= max) break;
  }
  return out;
}
