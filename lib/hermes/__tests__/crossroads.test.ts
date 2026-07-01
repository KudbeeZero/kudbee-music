import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { openCrossing, vote, tally, leader, decide, type Crossing } from '../crossroads';

const seed = JSON.parse(readFileSync(join(process.cwd(), 'brain', 'crossroads.json'), 'utf8')) as { crossings: Crossing[] };

const sample = () => openCrossing('x', 'Which way?', [
  { id: 'a', label: 'A', rationale: 'because a' },
  { id: 'b', label: 'B', rationale: 'because b' },
]);

describe('Crossroads Board (stage 1 model)', () => {
  it('opens a crossing with zeroed votes and open status', () => {
    const c = sample();
    expect(c.status).toBe('open');
    expect(c.options.every((o) => o.votes === 0)).toBe(true);
    expect(leader(c)).toBeNull();
  });

  it('votes are weighted and immutable (never mutate the input)', () => {
    const c = sample();
    const c2 = vote(c, 'b', 3);
    expect(c.options.find((o) => o.id === 'b')!.votes).toBe(0); // original untouched
    expect(c2.options.find((o) => o.id === 'b')!.votes).toBe(3);
  });

  it('tally ranks by votes, front-runner leads', () => {
    let c = sample();
    c = vote(c, 'a', 1);
    c = vote(c, 'b', 2);
    expect(tally(c)[0].id).toBe('b');
    expect(leader(c)!.id).toBe('b');
  });

  it('decide resolves to the front-runner and closes the crossing', () => {
    let c = vote(sample(), 'a', 5);
    c = decide(c);
    expect(c.status).toBe('decided');
    expect(c.outcome).toBe('a');
    // a decided crossing ignores further votes
    expect(vote(c, 'b', 100).options.find((o) => o.id === 'b')!.votes).toBe(0);
  });

  it('decide is a no-op with no votes', () => {
    expect(decide(sample()).status).toBe('open');
  });

  it('ships a valid seeded board', () => {
    expect(seed.crossings.length).toBeGreaterThanOrEqual(3);
    for (const c of seed.crossings) {
      expect(c.options.length).toBeGreaterThanOrEqual(2);
      expect(c.status).toBe('open');
      expect(c.options.every((o) => typeof o.rationale === 'string' && o.rationale.length > 0)).toBe(true);
    }
  });
});
