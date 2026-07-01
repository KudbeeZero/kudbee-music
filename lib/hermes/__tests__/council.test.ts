import { describe, it, expect } from 'vitest';
import { AGENT_DEFINITIONS } from '../agents';
import { rankHooksByCouncil, COUNCIL_WEIGHTS } from '../council';
import type { SongInputs, HookOption } from '../types';

// The Council splits the roster into a right bench (proposes) and a left bench
// (challenges). Guard that both benches are always populated so the board is real.
describe('the Council bench split', () => {
  it('has agents on both hemispheres', () => {
    const right = AGENT_DEFINITIONS.filter((d) => d.hemisphere === 'right');
    const left = AGENT_DEFINITIONS.filter((d) => d.hemisphere === 'left');
    expect(right.length).toBeGreaterThan(0);
    expect(left.length).toBeGreaterThan(0);
    expect(right.length + left.length).toBe(AGENT_DEFINITIONS.length);
  });
});

const inputs: SongInputs = {
  title: 'T', theme: 'building gold out of the cold streets', mood: 'hard, hopeful',
  genre: 'boom-bap', tempoMin: 88, tempoMax: 96, voice: 'gritty', audience: 'the block',
  doNotUse: [], references: '', structure: 'full-song',
};
const hook = (text: string, score: number): HookOption => ({ text, angle: '', cadence: '', score });

describe('rankHooksByCouncil (the board ranks the hooks)', () => {
  it('ranks an on-theme, crafted hook above a thin one — regardless of raw score', () => {
    const hooks = [
      hook('yeah uh ok whatever nah', 99),              // top raw score, thin + off-theme
      hook('the cold streets made the gold in me', 60), // on-theme, survives challenges
    ];
    const ranked = rankHooksByCouncil(hooks, inputs);
    expect(ranked[0].hook.text).toBe('the cold streets made the gold in me');
    expect(ranked[0].rank).toBe(1);
    expect(ranked[0].councilScore).toBeGreaterThan(ranked[1].councilScore);
  });

  it('assigns dense, 1-based ranks and keeps every candidate', () => {
    const hooks = [hook('a b c d', 40), hook('gold streets cold streets', 55), hook('e f g h', 30)];
    const ranked = rankHooksByCouncil(hooks, inputs);
    expect(ranked).toHaveLength(3);
    expect(ranked.map((r) => r.rank)).toEqual([1, 2, 3]);
  });

  it('scores in [0,100] with the documented weight split', () => {
    expect(COUNCIL_WEIGHTS.challenge + COUNCIL_WEIGHTS.reward + COUNCIL_WEIGHTS.confidence).toBe(100);
    for (const r of rankHooksByCouncil([hook('gold in the cold streets', 70)], inputs)) {
      expect(r.councilScore).toBeGreaterThanOrEqual(0);
      expect(r.councilScore).toBeLessThanOrEqual(100);
    }
  });

  it('is deterministic + stable for equal scores', () => {
    const hooks = [hook('x x x x', 50), hook('y y y y', 50), hook('z z z z', 50)];
    const a = rankHooksByCouncil(hooks, inputs).map((r) => r.hook.text);
    const b = rankHooksByCouncil(hooks, inputs).map((r) => r.hook.text);
    expect(a).toEqual(b);
  });

  it('returns empty for no hooks', () => {
    expect(rankHooksByCouncil([], inputs)).toEqual([]);
  });
});
