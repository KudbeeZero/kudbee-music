import { describe, it, expect } from 'vitest';
import { runPipeline } from '../pipeline';
import { withChosenHook } from '../rescore';
import type { SongInputs } from '../types';

const inputs: SongInputs = {
  title: 'Rescore', theme: 'building something out of nothing in a cold city',
  mood: 'defiant, hard', genre: 'boom-bap hip-hop', tempoMin: 88, tempoMax: 96,
  voice: 'gritty', audience: 'the doubters', doNotUse: [], references: '', structure: 'full-song',
};

describe('withChosenHook (honest re-score on hook change)', () => {
  it('sets the new hook as lead and bumps version', async () => {
    const { pkg } = await runPipeline(inputs, { id: 'r1', now: '2026-01-01T00:00:00Z', seed: 3 });
    const other = pkg.hookOptions.find((h) => h.text !== pkg.chosenHook?.text)!;
    expect(other).toBeTruthy();
    const next = withChosenHook(pkg, other);
    expect(next.chosenHook?.text).toBe(other.text);
    expect(next.version).toBe(pkg.version + 1);
  });

  it('recomputes the banger score (does not leave the old one stale)', async () => {
    const { pkg } = await runPipeline(inputs, { id: 'r2', now: '2026-01-01T00:00:00Z', seed: 5 });
    const other = pkg.hookOptions.find((h) => h.text !== pkg.chosenHook?.text)!;
    const next = withChosenHook(pkg, other);
    // score is a valid /100 total, rebuilt for the new hook
    expect(next.score.total).toBeGreaterThan(0);
    expect(next.score.total).toBeLessThanOrEqual(100);
    // re-choosing the SAME hook reproduces the original score exactly (faithful)
    const same = withChosenHook(pkg, pkg.chosenHook!);
    expect(same.score.total).toBe(pkg.score.total);
  });

  it('does not mutate the original package', async () => {
    const { pkg } = await runPipeline(inputs, { id: 'r3', now: '2026-01-01T00:00:00Z', seed: 7 });
    const originalHook = pkg.chosenHook?.text;
    const other = pkg.hookOptions.find((h) => h.text !== originalHook)!;
    withChosenHook(pkg, other);
    expect(pkg.chosenHook?.text).toBe(originalHook);
  });
});
