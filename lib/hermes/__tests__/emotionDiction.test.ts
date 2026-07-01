import { describe, it, expect } from 'vitest';
import { runPipeline } from '../pipeline';
import { wordInfo } from '../lexicon';
import type { SongInputs } from '../types';

const base: SongInputs = {
  title: 'X', theme: 'life on the block', mood: '', genre: 'boom-bap',
  tempoMin: 88, tempoMax: 96, voice: 'plain', audience: 'my people',
  doNotUse: [], references: '', structure: 'full-song',
};

// average lexicon affect of the content words the combinator actually chose
async function avgAffect(mood: string, theme: string): Promise<number> {
  const { pkg } = await runPipeline({ ...base, mood, theme }, { id: 'e', now: '2026-01-01T00:00:00Z', seed: 6 });
  const words = pkg.sections.flatMap((s) => s.lines).flatMap((l) => l.toLowerCase().match(/[a-z']+/g) ?? []);
  const affs = words.map((w) => wordInfo(w)?.a).filter((a): a is number => typeof a === 'number');
  return affs.reduce((x, y) => x + y, 0) / Math.max(1, affs.length);
}

describe('emotion → diction (limbic colors word choice)', () => {
  it('a dark mood pulls darker words than a bright mood (same idea)', async () => {
    const dark = await avgAffect('dark, cold, hopeless, grief', 'the loss and the cold nights');
    const bright = await avgAffect('hopeful, triumphant, warm', 'the rise and the light ahead');
    expect(bright).toBeGreaterThan(dark);   // affect valence measurably shifts with the mood
  });
});
