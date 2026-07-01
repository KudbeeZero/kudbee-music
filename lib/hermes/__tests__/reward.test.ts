import { describe, it, expect } from 'vitest';
import { craveScore } from '../reward';
import { region, regionState, PATHWAYS } from '../brainMap';
import type { HookOption, SongSection } from '../types';

const hook = (text: string): HookOption => ({ text, angle: '', cadence: '', score: 80 });
const hookSec = (lines: string[]): SongSection => ({ label: 'Hook', lines });

describe('reward / dopamine circuit (crave-ability)', () => {
  it('rewards a short, returning, mutating hook over a long static one', () => {
    const strong = craveScore(hook('run it up'), [
      hookSec(['run it up', 'run it up', 'we earned it slow', 'run it up']),
      { label: 'Verse 1', lines: ['a'] }, hookSec(['run it up']), hookSec(['run it up']),
    ]);
    const weak = craveScore(hook('this is a very long winding hook that never comes back around again'), [
      hookSec(['this is a very long winding hook that never comes back around again']),
    ]);
    expect(strong.score).toBeGreaterThan(weak.score);
    expect(strong.factors.returns).toBeGreaterThan(weak.factors.returns);
    expect(strong.note.length).toBeGreaterThan(0);
  });

  it('handles no hook, and returns bounded factors', () => {
    const none = craveScore(null, []);
    expect(none.score).toBe(0);
    const c = craveScore(hook('hold the line'), [hookSec(['hold the line', 'hold the line'])]);
    for (const v of Object.values(c.factors)) { expect(v).toBeGreaterThanOrEqual(0); expect(v).toBeLessThanOrEqual(1); }
  });

  it('is wired as a brain region coupled to generation + decision + limbic', () => {
    const r = region('reward');
    expect(r?.doc).toBe('lib/hermes/reward.ts');
    expect(r?.agents).toContain('ar-judge');
    expect(regionState(r!, {})).toBe('idle');
    expect(PATHWAYS.some(([a, b]) => a === 'reward' || b === 'reward')).toBe(true);
  });
});
