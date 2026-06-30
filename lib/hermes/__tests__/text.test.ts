import { describe, it, expect } from 'vitest';
import { shuffle, makeRng } from '../text';

describe('shuffle (seeded Fisher–Yates)', () => {
  it('is a permutation, deterministic per rng, and non-mutating', () => {
    const arr = [1, 2, 3, 4, 5, 6, 7, 8];
    const s1 = shuffle(arr, makeRng(42));
    const s2 = shuffle(arr, makeRng(42));
    expect(s1).toEqual(s2);                                    // deterministic for same seed
    expect([...s1].sort((a, b) => a - b)).toEqual(arr);        // same elements (permutation)
    expect(arr).toEqual([1, 2, 3, 4, 5, 6, 7, 8]);            // original untouched
  });

  it('produces different orders for different seeds', () => {
    const arr = Array.from({ length: 12 }, (_, i) => i);
    const a = shuffle(arr, makeRng(1));
    const b = shuffle(arr, makeRng(2));
    expect(a).not.toEqual(b);
  });
});
