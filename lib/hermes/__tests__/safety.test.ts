import { describe, it, expect } from 'vitest';
import { screenFamousPhrases, isClear, SAFETY_DISCLAIMER, FAMOUS_PHRASES } from '../safety';
import { checkOriginality } from '../originality';

describe('output-safety filter', () => {
  it('passes original lines with no famous echoes', () => {
    expect(isClear('i built this out the cold and the rain\nnobody handed me a single thing')).toBe(true);
    expect(screenFamousPhrases('my own words about my own street')).toHaveLength(0);
  });

  it('flags a line that echoes a famous phrase', () => {
    const flags = screenFamousPhrases('yeah we started from the bottom now we here');
    expect(flags).toHaveLength(1);
    expect(flags[0].phrase).toBe('started from the bottom');
    expect(flags[0].line).toContain('started from the bottom');
  });

  it('is punctuation- and case-insensitive', () => {
    expect(isClear('Eye Of The Tiger!!!')).toBe(false);
  });

  it('does not double-flag the same phrase', () => {
    const flags = screenFamousPhrases('purple rain\npurple rain again');
    expect(flags).toHaveLength(1);
  });

  it('surfaces as a famous-phrase flag in the originality report + lowers the score', () => {
    const clean = checkOriginality('a line entirely of my own making here\nanother honest original line of mine');
    const echo = checkOriginality('started from the bottom now the whole team here\nanother honest original line of mine');
    expect(echo.flags.some((f) => f.kind === 'famous-phrase')).toBe(true);
    expect(echo.score).toBeLessThan(clean.score);
  });

  it('ships a non-empty disclaimer and a starter phrase list', () => {
    expect(SAFETY_DISCLAIMER.length).toBeGreaterThan(40);
    expect(FAMOUS_PHRASES.length).toBeGreaterThan(10);
  });
});
