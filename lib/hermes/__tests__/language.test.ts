import { describe, it, expect } from 'vitest';
import { deriveLanguage, languageCoaching } from '../language';
import { region } from '../brainMap';
import type { SongInputs } from '../types';

const base: SongInputs = {
  title: 'x', theme: 'the come-up from nothing, proving my worth', mood: 'hard, defiant',
  genre: 'boom-bap', tempoMin: 88, tempoMax: 96, voice: 'gritty', audience: 'my brother',
  doNotUse: [], references: '', structure: 'full-song',
};

describe('language & culture area', () => {
  it('maps the artist\'s OWN described background into craft levers (not a group profile)', () => {
    const p = deriveLanguage({ ...base, culture: 'the west side I grew up on', voice: 'street, slang' });
    expect(p.hasCulture).toBe(true);
    expect(p.register).toBe('slang-forward');
    expect(p.vernacular).toMatch(/west side/i);        // uses THEIR words back
    expect(p.imagery.length).toBeGreaterThan(0);
  });

  it('treats struggle as depth (truth-first superpower)', () => {
    const p = deriveLanguage({ ...base });               // theme mentions "nothing", mood "hard"
    expect(p.depth).toMatch(/struggle|lived/i);
  });

  it('falls back gracefully with no culture given', () => {
    const p = deriveLanguage({ ...base, culture: '', voice: 'poetic, literary' });
    expect(p.hasCulture).toBe(false);
    expect(p.register).toBe('literary');
    expect(p.vernacular).toMatch(/your own everyday voice/i);
    expect(languageCoaching(p).length).toBeGreaterThan(10);
  });

  it('the Language & Culture brain region is now wired (no longer "coming")', () => {
    const lang = region('language')!;
    expect(lang.soon).toBeFalsy();
    expect(lang.agents).toContain('lyric-chemist');
    expect(lang.doc).toBe('lib/hermes/language.ts');
  });
});
