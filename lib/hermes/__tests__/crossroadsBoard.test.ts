import { describe, it, expect } from 'vitest';
import { loadSeed, applyMyVotes, tally, leader } from '../crossroadsBoard';

describe('crossroadsBoard — Stage 2 (seed + this browser\'s vote)', () => {
  it('loads the seeded crossings untouched when no vote has been cast', () => {
    const seed = loadSeed();
    expect(seed.length).toBeGreaterThanOrEqual(3);
    const applied = applyMyVotes(seed, {});
    expect(applied).toEqual(seed);
    for (const c of applied) expect(leader(c)).toBeNull();
  });

  it('layers exactly one vote (weight 1) onto the crossing the visitor voted on', () => {
    const seed = loadSeed();
    const target = seed[0];
    const otherOptionId = target.options[1].id;
    const applied = applyMyVotes(seed, { [target.id]: otherOptionId });

    const appliedTarget = applied.find((c) => c.id === target.id)!;
    expect(appliedTarget.options.find((o) => o.id === otherOptionId)!.votes).toBe(1);
    expect(leader(appliedTarget)!.id).toBe(otherOptionId);

    // every other crossing is untouched
    for (const c of applied) {
      if (c.id === target.id) continue;
      expect(leader(c)).toBeNull();
    }
  });

  it('never mutates the seed itself (pure)', () => {
    const seed = loadSeed();
    const target = seed[0];
    applyMyVotes(seed, { [target.id]: target.options[0].id });
    expect(target.options.every((o) => o.votes === 0)).toBe(true);
  });

  it('a vote for an unknown option id is silently ignored (no crash, no phantom vote)', () => {
    const seed = loadSeed();
    const target = seed[0];
    const applied = applyMyVotes(seed, { [target.id]: 'not-a-real-option' });
    const appliedTarget = applied.find((c) => c.id === target.id)!;
    expect(appliedTarget.options.every((o) => o.votes === 0)).toBe(true);
  });

  it('re-exports tally/leader from the pure crossroads model', () => {
    const seed = loadSeed();
    expect(typeof tally).toBe('function');
    expect(typeof leader).toBe('function');
  });
});
