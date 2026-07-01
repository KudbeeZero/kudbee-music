import { describe, it, expect } from 'vitest';
import { deliberate, selectHookByCognition, deliberationForHook } from '../cognition';
import type { SongInputs, HookOption } from '../types';

const hook = (text: string, score: number): HookOption => ({ text, angle: '', cadence: '', score });

const inputs: SongInputs = {
  title: 'T', theme: 'building gold out of the cold streets', mood: 'hard, hopeful',
  genre: 'boom-bap', tempoMin: 88, tempoMax: 96, voice: 'gritty', audience: 'the block',
  doNotUse: [], references: '', structure: 'full-song',
};

describe('cognition (first thought → second thought → decision)', () => {
  it('runs three real critiques and integrates a verdict', () => {
    const d = deliberate('I turned the cold streets into gold', inputs);
    expect(d.secondThought).toHaveLength(3);
    expect(d.firstThought).toContain('gold');
    expect(['keep', 'revise']).toContain(d.verdict);
    expect(d.confidence).toBeGreaterThan(0);
  });

  it('keeps a proposal that is on-theme and original', () => {
    const d = deliberate('the cold streets made the gold in me', inputs);
    expect(d.verdict).toBe('keep');
    expect(d.secondThought.find((c) => c.question.includes('true'))?.passes).toBe(true);
  });

  it('flags a famous-phrase echo as not original', () => {
    const d = deliberate('started from the bottom now we here', inputs);
    expect(d.secondThought.find((c) => c.question.includes('original'))?.passes).toBe(false);
  });

  it('revises a generic, thin proposal', () => {
    const d = deliberate('yeah uh ok', inputs);
    expect(d.verdict).toBe('revise');
    expect(d.confidence).toBeLessThan(0.5);
  });
});

describe('deliberationForHook (keeps the displayed verdict in sync with the current hook)', () => {
  it('reuses the stored deliberation when it is for this hook', () => {
    const stored = deliberate('the cold streets made the gold in me', inputs);
    const d = deliberationForHook('the cold streets made the gold in me', inputs, stored);
    expect(d).toBe(stored); // same object — no recompute
  });

  it('recomputes when the stored deliberation is for a DIFFERENT hook (after a re-pick)', () => {
    const stored = deliberate('an old auto-chosen hook', inputs);
    const d = deliberationForHook('a different hook the artist just picked', inputs, stored);
    expect(d).not.toBe(stored);
    expect(d.firstThought).toBe('a different hook the artist just picked');
  });

  it('computes fresh when there is no stored deliberation', () => {
    const d = deliberationForHook('cold streets turned to gold', inputs, null);
    expect(d.firstThought).toBe('cold streets turned to gold');
  });
});

describe('selectHookByCognition (closing the loop — cognition picks the hook)', () => {
  it('prefers the best-REASONED hook over a higher raw score', () => {
    const candidates = [
      hook('yeah uh ok whatever', 99),                 // top score, but thin + off-theme
      hook('the cold streets made the gold in me', 70), // lower score, survives cognition
    ];
    const { chosen, deliberation } = selectHookByCognition(candidates, inputs);
    expect(chosen?.text).toBe('the cold streets made the gold in me');
    expect(deliberation?.verdict).toBe('keep');
  });

  it('steers toward a hook that FIXES the flagged critiques (feedback)', () => {
    // prior take failed "true to the brief"; the on-theme candidate should now win even
    // though an off-theme one scores higher.
    const candidates = [
      hook('shiny things and pretty lights tonight', 95), // off-theme
      hook('cold streets turned to gold in the grind', 60), // on-theme (fixes 'true')
    ];
    const { chosen } = selectHookByCognition(candidates, inputs, ['true']);
    expect(chosen?.text).toBe('cold streets turned to gold in the grind');
  });

  it('is deterministic and stable for identical inputs', () => {
    const candidates = [hook('a', 50), hook('b', 50), hook('c', 50)];
    const a = selectHookByCognition(candidates, inputs).chosen?.text;
    const b = selectHookByCognition(candidates, inputs).chosen?.text;
    expect(a).toBe(b);
  });

  it('returns nulls for an empty candidate list', () => {
    expect(selectHookByCognition([], inputs)).toEqual({ chosen: null, deliberation: null });
  });
});
