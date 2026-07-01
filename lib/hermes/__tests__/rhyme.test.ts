import { describe, it, expect } from 'vitest';
import { endWord, linesRhyme, hasInternalRhyme, rhymeScheme, rhymeDensity, rhymeFamily, familyCount } from '../rhyme';
import { makeRng } from '../text';
import { doesRhyme } from '../lexicon';
import { runPipeline } from '../pipeline';
import type { SongInputs } from '../types';

describe('rhyme engine', () => {
  it('finds end words and end-rhymes', () => {
    expect(endWord('I chase the gold')).toBe('gold');
    expect(linesRhyme('I chase the gold', 'out in the cold')).toBe(true);
    expect(linesRhyme('I chase the gold', 'down the road')).toBe(false);
  });

  it('detects internal rhyme, scheme, and density', () => {
    expect(hasInternalRhyme('the night i took flight')).toBe(true);
    expect(hasInternalRhyme('a quiet walk home')).toBe(false);
    expect(rhymeScheme(['reach the gold', 'in the cold', 'down the road', 'i been told'])).toBe('AABA');
    expect(rhymeDensity(['reach the gold', 'in the cold', 'a lonely street', 'nothing sweet'])).toBe(1);
    expect(rhymeDensity(['the gold', 'a tree', 'the sky'])).toBeLessThan(1);
  });

  it('hands out rhyming families from the lexicon (deterministic per seed)', () => {
    expect(familyCount()).toBeGreaterThan(3);
    const fam = rhymeFamily(makeRng(5), 0, 2);
    expect(fam.length).toBe(2);
    expect(doesRhyme(fam[0].w, fam[1].w)).toBe(true);
    // same seed → same family
    expect(rhymeFamily(makeRng(5), 0, 2).map((e) => e.w)).toEqual(fam.map((e) => e.w));
  });

  it('generated verses actually rhyme now', async () => {
    const idea: SongInputs = {
      title: 'Weight', theme: 'the come-up from nothing, proving my worth', mood: 'hard, defiant',
      genre: 'boom-bap', tempoMin: 88, tempoMax: 96, voice: 'gritty', audience: 'my brother',
      doNotUse: [], references: '', structure: 'full-song',
    };
    const { pkg } = await runPipeline(idea, { id: 'r', now: '2026-01-01T00:00:00Z', seed: 4 });
    const v1 = pkg.sections.find((s) => s.label === 'Verse 1')!;
    // each couplet rhymes → density is high
    expect(rhymeDensity(v1.lines)).toBeGreaterThanOrEqual(0.5);
  });
});
