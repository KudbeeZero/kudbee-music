// The rhyme + meter engine — turns the mental lexicon into actual craft: it detects
// rhyme, scores a set of lines, and hands the combinator rhyme "families" so verses
// land in real couplets. All local, zero tokens (built on lib/hermes/lexicon.ts).
import { LEXICON, doesRhyme, rhymeKey, slantKey, type LexEntry } from './lexicon';
import { shuffle } from './text';

/** Rhyme strictness the artist can dial: perfect only ↔ loose slant/near-rhyme. */
export type RhymeTemp = 'tight' | 'balanced' | 'loose';

const wordsOf = (line: string): string[] => line.toLowerCase().match(/[a-z']+/g) ?? [];

/** The last spoken word of a line (what carries the end-rhyme). */
export function endWord(line: string): string {
  const w = wordsOf(line);
  return w.length ? w[w.length - 1] : '';
}

/** Do two lines end-rhyme? */
export function linesRhyme(a: string, b: string): boolean {
  return doesRhyme(endWord(a), endWord(b));
}

/** Does a single line contain an internal rhyme (two content words that rhyme)? */
export function hasInternalRhyme(line: string): boolean {
  const w = wordsOf(line).filter((x) => x.length > 2);
  for (let i = 0; i < w.length; i++)
    for (let j = i + 1; j < w.length; j++)
      if (doesRhyme(w[i], w[j])) return true;
  return false;
}

/** Label a set of lines with its rhyme scheme, e.g. ['a','a','b','b'] -> "AABB". */
export function rhymeScheme(lines: string[]): string {
  const label = new Map<string, string>();
  let next = 65; // 'A'
  return lines
    .map((l) => {
      const k = rhymeKey(endWord(l));
      if (!k) return '-';
      if (!label.has(k)) label.set(k, String.fromCharCode(next++));
      return label.get(k)!;
    })
    .join('');
}

/** Fraction (0..1) of lines that end-rhyme with at least one other line. */
export function rhymeDensity(lines: string[]): number {
  if (lines.length < 2) return 0;
  let rhymed = 0;
  for (let i = 0; i < lines.length; i++)
    if (lines.some((l, j) => j !== i && linesRhyme(lines[i], l))) rhymed++;
  return +(rhymed / lines.length).toFixed(2);
}

// Rhyme families: groups of lexicon NOUNS that share a rhyme key (>= 2 members),
// so the combinator can end two lines on different-but-rhyming words.
function familiesBy(key: (w: string) => string): LexEntry[][] {
  const groups = new Map<string, LexEntry[]>();
  for (const e of LEXICON) {
    if (e.p !== 'n') continue;
    const k = key(e.w);
    if (!groups.has(k)) groups.set(k, []);
    groups.get(k)!.push(e);
  }
  return [...groups.values()].filter((g) => g.length >= 2);
}

// Perfect-rhyme families (tight/balanced) and looser slant families (loose temp).
const NOUN_FAMILIES: LexEntry[][] = familiesBy(rhymeKey);
const SLANT_FAMILIES: LexEntry[][] = familiesBy(slantKey);

export function familyCount(): number {
  return NOUN_FAMILIES.length;
}

/**
 * Pick `n` rhyming nouns from the lexicon, biased toward a valence (dark < 0,
 * bright > 0) and a rhyme `temp` — 'tight'/'balanced' use perfect-rhyme families,
 * 'loose' opens up to slant/near-rhyme families (bigger, more varied groups, so a
 * song is less likely to reach for the same two end-words). Deterministic per rng.
 */
export function rhymeFamily(rng: () => number, valence = 0, n = 2, temp: RhymeTemp = 'balanced'): LexEntry[] {
  const leans = (e: LexEntry) => (valence < -0.2 ? e.a <= 0.1 : valence > 0.2 ? e.a >= -0.1 : true);
  const source = temp === 'loose' ? SLANT_FAMILIES : NOUN_FAMILIES;
  const eligible = source.filter((g) => g.filter(leans).length >= n);
  const fams = eligible.length ? eligible : source;
  if (!fams.length) return [];
  const fam = fams[Math.floor(rng() * fams.length)];
  const words = fam.filter(leans).length >= n ? fam.filter(leans) : fam;
  return shuffle(words, rng).slice(0, n);
}
