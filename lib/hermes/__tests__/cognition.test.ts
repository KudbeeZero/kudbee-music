import { describe, it, expect } from 'vitest';
import { deliberate } from '../cognition';
import type { SongInputs } from '../types';

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
