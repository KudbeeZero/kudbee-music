import { describe, it, expect } from 'vitest';
import { ENGINE_UNITS, activeEngine } from '../engines';

describe('engine rack', () => {
  it('has exactly one active unit and it is the free Local Combinator', () => {
    const active = ENGINE_UNITS.filter((u) => u.active);
    expect(active).toHaveLength(1);
    expect(active[0].id).toBe('mock-lyrics');
    expect(active[0].tier).toBe('free');
    expect(activeEngine().id).toBe('mock-lyrics');
  });

  it('pro units are locked and carry an unlock hint (no key committed)', () => {
    const pro = ENGINE_UNITS.filter((u) => u.tier === 'pro');
    expect(pro.length).toBeGreaterThan(0);
    expect(pro.every((u) => u.locked && !u.active && !!u.unlockHint)).toBe(true);
  });

  it('the active engine id matches a real provider seam id', () => {
    // mock-lyrics is the mockLyricsProvider id — the rack reflects the real seam
    expect(activeEngine().id).toBe('mock-lyrics');
  });
});
