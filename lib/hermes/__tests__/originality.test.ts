import { describe, it, expect } from 'vitest';
import { checkOriginality, fingerprintLyrics } from '../originality';

describe('originality checker', () => {
  it('flags a line repeated heavily (6+), but a normal chorus does not tank the score', () => {
    // a hook that comes back 3 choruses (4 identical lines × 3 = normal songcraft)
    const normalChorus = Array(3).fill('I keep it real for the people').join('\n');
    const ok = checkOriginality(normalChorus + '\nverse line one here\nverse line two there', { bannedWords: [] });
    expect(ok.score).toBeGreaterThan(70);

    // an over-repeated line (6+) earns a gentle nudge
    const spammy = Array(7).fill('I keep it real').join('\n');
    const r = checkOriginality(spammy, { bannedWords: [] });
    expect(r.flags.some((f) => f.kind === 'repeated-hook')).toBe(true);
  });

  it('flags banned/avoid words (warning, not block)', () => {
    const r = checkOriginality('walking through the fire tonight\nholding to the crown', {
      bannedWords: ['fire', 'crown'],
    });
    expect(r.bannedWordsHit).toContain('fire');
    expect(r.bannedWordsHit).toContain('crown');
    expect(r.flags.some((f) => f.kind === 'banned-word')).toBe(true);
    // still produces a score — never blocks
    expect(typeof r.score).toBe('number');
  });

  it('detects lines too similar to a prior generated song', () => {
    const prior = {
      id: 'p1', title: 'Old One',
      finalLyrics: 'I count the blocks like I count the days gone by',
      fingerprints: fingerprintLyrics('I count the blocks like I count the days gone by'),
    };
    const r = checkOriginality('I count the blocks like I count the days gone by', {
      bannedWords: [], priorSongs: [prior], similarityThreshold: 0.5,
    });
    expect(r.flags.some((f) => f.kind === 'too-similar')).toBe(true);
    expect(r.score).toBeLessThan(100);
  });

  it('scores original lyrics highly and clamps to 0–100', () => {
    const r = checkOriginality(
      ['First specific image from my street', 'A second unrelated grounded thought',
       'Third line that turns the story', 'Fourth resolves it plainly'].join('\n'),
      { bannedWords: [] },
    );
    expect(r.score).toBeGreaterThanOrEqual(0);
    expect(r.score).toBeLessThanOrEqual(100);
    expect(r.fingerprints.length).toBe(4);
  });
});
