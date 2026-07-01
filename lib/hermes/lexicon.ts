// The mental lexicon — the brain's vocabulary cortex, kept as a local, version-
// controlled word store (brain/lexicon/*.json). This is the token-free backbone:
// syllable counting, rhyme matching, and affect/imagery lookup all run offline with
// zero API calls, forever. It powers the rhyme/meter engine and emotion-colored word
// choice. Grow it by adding words to the JSON — the file system IS the dictionary.
import core from '../../brain/lexicon/core.json';

export type Pos = 'n' | 'v' | 'adj' | 'adv';
export interface LexEntry {
  w: string;      // the word
  p: Pos;         // part of speech
  a: number;      // affect / valence, -1 (dark) .. +1 (bright)
  i: string;      // imagery tag (money, struggle, family, street, time, light, nature, motion, body, hope)
}

export const LEXICON = core as LexEntry[];
const BY_WORD = new Map(LEXICON.map((e) => [e.w, e]));

/** Heuristic syllable count from spelling (vowel groups, minus a silent final e). */
export function syllableCount(word: string): number {
  const w = word.toLowerCase().replace(/[^a-z]/g, '');
  if (!w) return 0;
  const groups = w.match(/[aeiouy]+/g) ?? [];
  let n = groups.length;
  if (w.endsWith('e') && !/[aeiouy]e$/.test(w) && n > 1) n -= 1; // silent e
  return Math.max(1, n);
}

/** Heuristic rhyme signature: last vowel group + trailing consonants, normalized. */
export function rhymeKey(word: string): string {
  let w = word.toLowerCase().replace(/[^a-z]/g, '');
  if (!w) return '';
  if (w.endsWith('e') && w.length > 2 && !/[aeiou]e$/.test(w)) w = w.slice(0, -1); // drop silent e
  const m = w.match(/([aeiouy]+[^aeiouy]*)$/);
  let key = m ? m[1] : w;
  // fold common equivalent spellings so near-rhymes match
  key = key
    .replace(/^igh/, 'i').replace(/y$/, 'i')      // sky/high → i
    .replace(/ough$/, 'o').replace(/ow$/, 'o')     // though/flow → o
    .replace(/tion$/, 'shun');
  return key;
}

/** True if two words rhyme (share a rhyme key), and aren't the same word. */
export function doesRhyme(a: string, b: string): boolean {
  const x = a.toLowerCase(), y = b.toLowerCase();
  return x !== y && !!rhymeKey(x) && rhymeKey(x) === rhymeKey(y);
}

/** Lexicon words that rhyme with the given word (optionally same syllable count). */
export function rhymesWith(word: string, opts: { sameSyllables?: boolean; max?: number } = {}): LexEntry[] {
  const key = rhymeKey(word);
  const syl = syllableCount(word);
  const out = LEXICON.filter(
    (e) => e.w !== word.toLowerCase() && rhymeKey(e.w) === key && (!opts.sameSyllables || syllableCount(e.w) === syl),
  );
  return opts.max ? out.slice(0, opts.max) : out;
}

/** Words leaning toward a valence (dir < 0 dark, > 0 bright), optional imagery tag. */
export function byAffect(dir: number, imagery?: string, max = 20): LexEntry[] {
  const out = LEXICON.filter((e) => (dir < 0 ? e.a <= -0.25 : dir > 0 ? e.a >= 0.25 : Math.abs(e.a) < 0.25))
    .filter((e) => !imagery || e.i === imagery);
  return out.slice(0, max);
}

/** Words in an imagery category (money, struggle, family, street, …). */
export function byImagery(tag: string, max = 20): LexEntry[] {
  return LEXICON.filter((e) => e.i === tag).slice(0, max);
}

export function wordInfo(word: string): LexEntry | undefined {
  return BY_WORD.get(word.toLowerCase());
}

/** The imagery categories present in the lexicon. */
export function imageryTags(): string[] {
  return Array.from(new Set(LEXICON.map((e) => e.i))).sort();
}
