import { describe, it, expect } from 'vitest';
import { checkOriginality, fingerprintLyrics } from '../originality';
import { tidyLine, tokenSetSimilarity } from '../text';
import { runPipeline } from '../pipeline';
import type { SongInputs } from '../types';

describe('originality depth (weakness 2)', () => {
  it('catches a reworded / reordered paraphrase the bigram check misses', () => {
    const prior = {
      id: 'p', title: 'Old One',
      finalLyrics: 'money power respect is all that I chase',
      fingerprints: fingerprintLyrics('money power respect is all that I chase'),
    };
    // same vocabulary, reordered — bigram similarity is low, token-set is high
    const r = checkOriginality('respect money power is all that I chase', {
      bannedWords: [], priorSongs: [prior], similarityThreshold: 0.6,
    });
    expect(r.flags.some((f) => f.kind === 'too-similar')).toBe(true);
  });

  it('tokenSetSimilarity is order-insensitive', () => {
    expect(tokenSetSimilarity('the cold dark night', 'night dark cold the')).toBe(1);
  });
});

describe('combinator quality (weakness 1)', () => {
  it('tidyLine capitalizes and fixes a/an agreement', () => {
    expect(tidyLine('a apple in  the   dark')).toBe('An apple in the dark');
    expect(tidyLine('an dog ran')).toBe('A dog ran');
  });

  it('generated lines are tidy — capitalized, no double spaces', async () => {
    const idea: SongInputs = {
      title: 'Q', theme: 'the cold street grind and the long road home', mood: 'hard',
      genre: 'trap', tempoMin: 130, tempoMax: 150, voice: 'raw', audience: 'crew',
      doNotUse: [], references: '', structure: 'hook-first',
    };
    const { pkg } = await runPipeline(idea, { id: 'q', now: '2026-01-01T00:00:00Z', seed: 3 });
    const lines = pkg.sections.flatMap((s) => s.lines);
    for (const l of lines) {
      expect(l).toBe(l.replace(/\s{2,}/g, ' '));            // no double spaces
      expect(l[0]).toBe(l[0].toUpperCase());                // capitalized
      expect(l).not.toMatch(/\ba\s+[aeiou]/i);              // no "a apple"
    }
  });
});
