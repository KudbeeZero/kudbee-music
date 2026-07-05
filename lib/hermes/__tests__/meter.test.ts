import { describe, it, expect } from 'vitest';
import { lineSyllables, syllableFit, sanitizeSyllableTarget } from '../meter';

describe('meter — singability scoring (docs/pattern-packs.md meter backlog, scoped)', () => {
  it('lineSyllables sums per-word heuristic counts', () => {
    expect(lineSyllables('the road home')).toBe(3); // the(1) road(1) home(1)
    expect(lineSyllables('Every step a promise')).toBeGreaterThan(3);
    expect(lineSyllables('')).toBe(0);
    expect(lineSyllables('   ')).toBe(0);
  });

  it('syllableFit returns 1 inside the range, decays outside it, never 0', () => {
    expect(syllableFit(8, [6, 10])).toBe(1);
    expect(syllableFit(6, [6, 10])).toBe(1);
    expect(syllableFit(10, [6, 10])).toBe(1);
    expect(syllableFit(5, [6, 10])).toBeLessThan(1);
    expect(syllableFit(12, [6, 10])).toBeLessThan(1);
    expect(syllableFit(50, [6, 10])).toBeGreaterThan(0);
    // farther outside the range fits worse
    expect(syllableFit(20, [6, 10])).toBeLessThan(syllableFit(12, [6, 10]));
  });

  it('sanitizeSyllableTarget accepts a real [lo,hi] tuple and orders it', () => {
    expect(sanitizeSyllableTarget([10, 6])).toEqual([6, 10]);
    expect(sanitizeSyllableTarget([6, 10])).toEqual([6, 10]);
  });

  it('sanitizeSyllableTarget clamps to a sane 1-40 range', () => {
    expect(sanitizeSyllableTarget([-5, 500])).toEqual([1, 40]);
  });

  it('sanitizeSyllableTarget drops a malformed value instead of trusting it', () => {
    expect(sanitizeSyllableTarget(undefined)).toBeUndefined();
    expect(sanitizeSyllableTarget(null)).toBeUndefined();
    expect(sanitizeSyllableTarget([1])).toBeUndefined();
    expect(sanitizeSyllableTarget(['a', 'b'])).toBeUndefined();
    expect(sanitizeSyllableTarget([NaN, 10])).toBeUndefined();
    expect(sanitizeSyllableTarget('hostile string')).toBeUndefined();
    expect(sanitizeSyllableTarget({ __proto__: [1, 2] })).toBeUndefined();
  });
});
