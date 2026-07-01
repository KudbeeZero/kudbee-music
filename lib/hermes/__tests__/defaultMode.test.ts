import { describe, it, expect } from 'vitest';
import { divergentAngles } from '../defaultMode';
import { region, regionState, PATHWAYS } from '../brainMap';
import { guideStep, artistContext } from '../process';
import type { SongInputs } from '../types';

const inputs: SongInputs = {
  title: 'Weight', theme: 'the come-up from nothing, proving my worth', mood: 'hard',
  genre: 'boom-bap', tempoMin: 88, tempoMax: 96, voice: 'gritty', audience: 'my brother',
  doNotUse: [], references: '', structure: 'full-song',
};

describe('default-mode network (creativity-at-rest)', () => {
  it('surfaces divergent angles, each with a reason, deterministically', () => {
    const a = divergentAngles(inputs, 3, 1);
    expect(a.length).toBe(3);
    for (const x of a) {
      expect(x.angle.length).toBeGreaterThan(0);
      expect(x.why.length).toBeGreaterThan(0);
    }
    // deterministic per seed, varies across seeds
    expect(divergentAngles(inputs, 3, 1).map((x) => x.angle)).toEqual(a.map((x) => x.angle));
    expect(divergentAngles(inputs, 3, 9).map((x) => x.angle).join()).not.toBe(a.map((x) => x.angle).join());
  });

  it('offers a divergent angle as a concept option in the Writers-Room', () => {
    const g = guideStep('concept', { inputs, artist: artistContext([]), seed: 2 });
    expect(g.options.some((o) => /Default-Mode/.test(o.why))).toBe(true);
  });

  it('is wired as a brain region coupled to generation + decision', () => {
    const dmn = region('default-mode');
    expect(dmn?.doc).toBe('lib/hermes/defaultMode.ts');
    expect(regionState(dmn!, {})).toBe('idle');
    expect(PATHWAYS.some(([a, b]) => a === 'default-mode' && (b === 'generative' || b === 'decision'))).toBe(true);
  });
});
