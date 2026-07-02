import { describe, it, expect } from 'vitest';
import {
  wrapText, scalePoint, clampText, footerString, cardFileName,
  FOOTER_TAGLINE, CARD_W, CARD_H, BRAIN_W, BRAIN_H, renderShareCard,
  type TextMeasurer,
} from '../shareCard';

// A fake canvas measurer: width ∝ character count (deterministic, no DOM).
function fakeCtx(pxPerChar = 10): TextMeasurer {
  return { measureText: (s: string) => ({ width: s.length * pxPerChar }) };
}

describe('shareCard — module import is DOM-safe', () => {
  it('imports in Node (no canvas) without throwing', () => {
    expect(CARD_W).toBe(1200);
    expect(CARD_H).toBe(630);
    expect(BRAIN_W).toBe(440);
    expect(BRAIN_H).toBe(300);
  });

  it('renderShareCard rejects (does not crash) when document is undefined', async () => {
    // In the vitest node env there is no document → the server guard must fire.
    expect(typeof document).toBe('undefined');
    // @ts-expect-error — minimal pkg shape; the guard fires before it's used.
    await expect(renderShareCard({ title: 'x', inputs: {}, seed: 0 })).rejects.toThrow(/document/i);
  });
});

describe('shareCard — wrapText', () => {
  it('keeps a short string on one line', () => {
    expect(wrapText(fakeCtx(), 'short hook', 1000)).toEqual(['short hook']);
  });

  it('wraps to multiple lines when over maxWidth', () => {
    // pxPerChar=10, maxWidth=100 → ~10 chars per line.
    const lines = wrapText(fakeCtx(10), 'one two three four five', 100);
    expect(lines.length).toBeGreaterThan(1);
    for (const l of lines) expect(l.length * 10).toBeLessThanOrEqual(100);
  });

  it('never exceeds maxWidth except for an unbreakable single word', () => {
    const lines = wrapText(fakeCtx(10), 'supercalifragilistic word', 50);
    // The long word stays whole on its own line rather than looping forever.
    expect(lines[0]).toBe('supercalifragilistic');
    expect(lines).toContain('word');
  });

  it('always returns at least one line, even for empty/whitespace text', () => {
    expect(wrapText(fakeCtx(), '', 100)).toEqual(['']);
    expect(wrapText(fakeCtx(), '   ', 100)).toEqual(['']);
  });
});

describe('shareCard — scalePoint', () => {
  it('maps brain-space corners into the target box', () => {
    expect(scalePoint(0, 0, 440, 300)).toEqual({ x: 0, y: 0 });
    expect(scalePoint(BRAIN_W, BRAIN_H, 440, 300)).toEqual({ x: 440, y: 300 });
  });

  it('scales a mid point proportionally into a smaller box', () => {
    // center of the brain → center of a 220×150 box.
    expect(scalePoint(220, 150, 220, 150)).toEqual({ x: 110, y: 75 });
  });
});

describe('shareCard — clampText', () => {
  it('leaves short text untouched', () => {
    expect(clampText('hello', 20)).toBe('hello');
  });

  it('ellipsizes text over the limit', () => {
    const out = clampText('abcdefghij', 5);
    expect(out.length).toBeLessThanOrEqual(5);
    expect(out.endsWith('…')).toBe(true);
  });

  it('coerces nullish input to empty string', () => {
    // @ts-expect-error — deliberately passing a non-string.
    expect(clampText(undefined, 10)).toBe('');
  });
});

describe('shareCard — footer + filename composition', () => {
  it('footer contains the deterministic receipt and the title', () => {
    const f = footerString('Out the Mud');
    expect(f.startsWith(FOOTER_TAGLINE)).toBe(true);
    expect(f).toContain('Out the Mud');
    expect(FOOTER_TAGLINE).toContain('$0');
    expect(FOOTER_TAGLINE).toContain('deterministic');
    expect(FOOTER_TAGLINE).toContain('no API key');
  });

  it('footer clamps a very long title', () => {
    const f = footerString('x'.repeat(200));
    expect(f).toContain('…');
    expect(f.length).toBeLessThan(FOOTER_TAGLINE.length + 60);
  });

  it('footer falls back to "Untitled" for an empty title', () => {
    expect(footerString('')).toContain('Untitled');
  });

  it('cardFileName slugifies the title and appends the suffix', () => {
    expect(cardFileName({ title: 'Out the Mud!' })).toBe('out-the-mud-hermes-card.png');
    expect(cardFileName({ title: '  ✨  ' })).toBe('song-hermes-card.png');
    expect(cardFileName({ title: '' })).toBe('song-hermes-card.png');
  });
});
