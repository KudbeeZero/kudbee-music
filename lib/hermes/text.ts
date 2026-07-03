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

/** s-ending words that are NOT plurals — never "singularize" these. */
const NON_PLURAL_S = new Set(['news', 'chaos', 'blues', 'kudos', 'lens', 'bliss', 'brass', 'glass', 'grass', 'class', 'canvas', 'atlas', 'alias']);

/** Conservative plural test for a word (theme words are arbitrary user text). */
function looksPlural(w: string): boolean {
  const lw = w.toLowerCase();
  if (lw.length < 4 || NON_PLURAL_S.has(lw)) return false;
  return /[^sui]s$/.test(lw); // winters/records/pockets — but not loss/chorus/basis
}

/** Conservative singular form — only shapes we can strip safely. */
function singularize(w: string): string {
  if (/ies$/i.test(w)) return w.replace(/ies$/i, 'y').replace(/IES$/, 'Y');
  if (/(ch|sh|x|z|ss)es$/i.test(w)) return w.slice(0, -2);
  return w.slice(0, -1);
}

/** Singularize a word only if it conservatively reads as a plural. Used by the
 *  combinator's slot filler when a template puts a noun slot right after a singular
 *  determiner ("took that {noun}") — the TEMPLATE guarantees determiner context, so
 *  this never touches relative-pronoun "that" ("the hook that lifts"). The noun is
 *  singularized (not the determiner flexed) so any downstream singular pronoun in the
 *  frame stays correct ("took that record and turned IT to an art"). */
export function singularizeIfPlural(w: string): string {
  return looksPlural(w) ? singularize(w) : w;
}

/** Determiner–noun number-agreement violations, for the eval regression guard.
 *  Deliberately limited to `a/an/every` — words that are ALWAYS determiners — because
 *  "this/that" are ambiguous in free text ("proof that pockets turn to gold" is
 *  grammatical); the generation-side fix (slot-level, template context known) covers
 *  this/that, while the metric only asserts what free text can prove. */
export function determinerAgreementViolations(text: string): string[] {
  const out: string[] = [];
  for (const m of text.matchAll(/\b(a|an|every)\s+([a-z]+s)\b/gi)) {
    if (looksPlural(m[2])) out.push(m[0]);
  }
  return out;
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

/** The share of all content words taken by the single most-repeated one (0–1).
 *  The eval harness's repetition budget: a song where one word dominates every
 *  section reads as thin, and nothing measured it before (the hook line alone
 *  repeats by design — this watches whether repetition gets WORSE, song-wide). */
export function maxContentWordShare(text: string): number {
  const words = tokenize(text).filter((w) => w.length >= 4 && !STOP.has(w));
  if (!words.length) return 0;
  const counts = new Map<string, number>();
  for (const w of words) counts.set(w, (counts.get(w) ?? 0) + 1);
  return Math.max(...counts.values()) / words.length;
}

/** Pull meaningful keywords from a free-text field (drops stopwords). */
const STOP = new Set([
  'the', 'a', 'an', 'and', 'or', 'but', 'for', 'to', 'of', 'in', 'on', 'my',
  'me', 'i', 'we', 'you', 'it', 'with', 'not', 'is', 'be', 'so', 'that', 'this',
  // Third-person pronouns — never a meaningful keyword, and disastrous as a noun-slot
  // filler ("through the she"). Found via an Occasion Pack theme naturally written as
  // "everything SHE gave" (a Mother's/Father's Day dedication); themeNouns() needs
  // these gone before nounable() ever sees them, since they'd pass its checks.
  'she', 'her', 'hers', 'herself', 'he', 'him', 'his', 'himself',
  'they', 'them', 'their', 'theirs', 'themselves', 'us', 'our', 'ours',
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

/**
 * A line's structural "skeleton" — its first two words + last word, lowercased.
 * Two lines built from the same frame template share a skeleton even when the
 * filler words differ ("still climb my way up out the road" ≈ "still grind my way
 * up out the gold"). Used to detect a song leaning on one template.
 */
export function lineSkeleton(line: string): string {
  const w = tokenize(line);
  if (!w.length) return '';
  return [w[0], w[1] ?? '', w[w.length - 1]].join(' ');
}

/**
 * Self-similarity of a set of lines, 0..1 — the fraction of lines that repeat a
 * skeleton already seen. 0 = every line is structurally distinct; higher = the
 * writing keeps reusing the same shape. The inverse is a diversity signal.
 */
export function selfSimilarity(lines: string[]): number {
  const real = lines.filter((l) => l.trim());
  if (real.length < 2) return 0;
  const seen = new Set<string>();
  let repeats = 0;
  for (const l of real) {
    const s = lineSkeleton(l);
    if (seen.has(s)) repeats++;
    else seen.add(s);
  }
  return +(repeats / real.length).toFixed(2);
}
