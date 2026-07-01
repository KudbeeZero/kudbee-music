import { describe, it, expect } from 'vitest';
import { brainHeat } from '../heat';
import { REGIONS } from '../brainMap';

describe('brainHeat (artist thermal signature)', () => {
  it('gives every region a temperature in 0..1', () => {
    const h = brainHeat({ songCount: 4, edits: 3, emotionIntensity: 0.5, emotionValence: 0, becomingYou: 20 });
    for (const r of REGIONS) {
      expect(h.regions[r.id]).toBeGreaterThanOrEqual(0);
      expect(h.regions[r.id]).toBeLessThanOrEqual(1);
    }
  });

  it('runs hotter overall the more you make + the more it becomes you', () => {
    const cold = brainHeat({ songCount: 0, edits: 0, emotionIntensity: 0.1, emotionValence: 0, becomingYou: 0 });
    const hot = brainHeat({ songCount: 10, edits: 2, emotionIntensity: 0.9, emotionValence: 0, becomingYou: 80 });
    expect(hot.overall).toBeGreaterThan(cold.overall);
  });

  it('an emotional/expressive artist leans RIGHT (generative hotter than analytical)', () => {
    const h = brainHeat({ songCount: 5, edits: 0, emotionIntensity: 0.9, emotionValence: 0.5, becomingYou: 30 });
    expect(h.dominance).toBeGreaterThan(0);
    expect(h.regions['generative']).toBeGreaterThan(h.regions['analytical']);
    expect(h.label).toMatch(/right/i);
  });

  it('a heavy editor leans LEFT (analytical hotter than generative)', () => {
    const h = brainHeat({ songCount: 5, edits: 12, emotionIntensity: 0.2, emotionValence: 0, becomingYou: 30 });
    expect(h.dominance).toBeLessThan(0);
    expect(h.regions['analytical']).toBeGreaterThan(h.regions['generative']);
    expect(h.label).toMatch(/left/i);
  });
});
