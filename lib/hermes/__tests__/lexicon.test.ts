import { describe, it, expect } from 'vitest';
import {
  LEXICON, syllableCount, rhymeKey, doesRhyme, rhymesWith, byAffect, byImagery, wordInfo, imageryTags,
} from '../lexicon';

describe('mental lexicon (token-free vocabulary cortex)', () => {
  it('loads a tagged word store', () => {
    expect(LEXICON.length).toBeGreaterThan(80);
    expect(wordInfo('gold')).toMatchObject({ w: 'gold', i: 'money' });
    for (const e of LEXICON) {
      expect(typeof e.w).toBe('string');
      expect(['n', 'v', 'adj', 'adv']).toContain(e.p);
      expect(e.a).toBeGreaterThanOrEqual(-1);
      expect(e.a).toBeLessThanOrEqual(1);
    }
  });

  it('counts syllables heuristically', () => {
    expect(syllableCount('gold')).toBe(1);
    expect(syllableCount('alone')).toBe(2);
    expect(syllableCount('desire')).toBe(2);
    expect(syllableCount('around')).toBe(2);
  });

  it('matches rhymes and rejects non-rhymes / identity', () => {
    expect(doesRhyme('gold', 'cold')).toBe(true);
    expect(doesRhyme('made', 'fade')).toBe(true);
    expect(doesRhyme('night', 'light')).toBe(true);
    expect(doesRhyme('gold', 'gold')).toBe(false);   // not itself
    expect(doesRhyme('gold', 'pain')).toBe(false);
    expect(rhymeKey('crown')).toBe(rhymeKey('down'));
  });

  it('finds rhyming words in the lexicon', () => {
    const r = rhymesWith('gold');
    const words = r.map((e) => e.w);
    expect(words).toContain('cold');
    expect(words).toContain('hold');
    expect(words).not.toContain('gold');
    // same-syllable filter keeps it to 1-syllable rhymes
    expect(rhymesWith('gold', { sameSyllables: true }).every((e) => syllableCount(e.w) === 1)).toBe(true);
  });

  it('queries by affect and imagery', () => {
    expect(byAffect(-1).every((e) => e.a <= -0.25)).toBe(true);   // dark words
    expect(byAffect(1).every((e) => e.a >= 0.25)).toBe(true);     // bright words
    expect(byImagery('money').every((e) => e.i === 'money')).toBe(true);
    expect(imageryTags()).toContain('struggle');
    expect(imageryTags()).toContain('hope');
  });
});
