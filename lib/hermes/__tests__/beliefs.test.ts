import { describe, it, expect } from 'vitest';
import { BELIEFS, belief, beliefsFor } from '../beliefs';

describe('belief system', () => {
  it('loads the constitution with the core beliefs', () => {
    expect(BELIEFS.beliefs.length).toBeGreaterThanOrEqual(5);
    const ids = BELIEFS.beliefs.map((b) => b.id);
    for (const core of ['green-loop', 'craft-over-generation', 'assistant-not-autopilot', 'learn-the-voice', 'use-every-tool']) {
      expect(ids).toContain(core);
    }
    expect(BELIEFS.manifesto).toMatch(/co-writer|process/i);
  });

  it('looks up a belief by id and by area', () => {
    expect(belief('craft-over-generation')?.title).toMatch(/craft/i);
    expect(belief('nope')).toBeUndefined();
    const processBeliefs = beliefsFor('process');
    expect(processBeliefs.length).toBeGreaterThan(0);
    expect(processBeliefs.every((b) => b.appliesTo.includes('process'))).toBe(true);
  });
});
