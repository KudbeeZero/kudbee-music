import { describe, it, expect } from 'vitest';
import { deriveEmotion, emotionalArc, emotionCoaching } from '../emotion';
import { region, regionState, PATHWAYS } from '../brainMap';
import type { SongInputs, SongSection } from '../types';

const base: SongInputs = {
  title: 'x', theme: 'the come-up from nothing', mood: 'hard, defiant, aggressive',
  genre: 'boom-bap', tempoMin: 88, tempoMax: 96, voice: 'gritty', audience: 'my brother',
  doNotUse: [], references: '', structure: 'full-song',
};

describe('limbic layer (emotion)', () => {
  it('reads mood into an affect model with valence, intensity, and a contrast turn', () => {
    const e = deriveEmotion(base);
    expect(e.valence).toBeLessThan(0);        // aggressive/hard → dark
    expect(e.intensity).toBeGreaterThan(0.7); // high-intensity
    expect(e.primary).toBe('defiance');
    expect(e.contrast).toMatch(/tenderness/); // the depth turn
    expect(emotionCoaching(e)).toMatch(/turn toward/i);
  });

  it('handles bright moods and a no-signal fallback', () => {
    expect(deriveEmotion({ ...base, mood: 'hopeful, triumphant', theme: 'rising up' }).valence).toBeGreaterThan(0);
    const flat = deriveEmotion({ ...base, mood: '', theme: 'a thing' });
    expect(flat.primary).toBe('ambivalence');
  });

  it('maps sections onto an emotional arc (problem → tension → payoff)', () => {
    const sections: SongSection[] = [
      { label: 'Intro', lines: ['a'] }, { label: 'Verse 1', lines: ['b'] },
      { label: 'Hook', lines: ['c'] }, { label: 'Bridge', lines: ['d'] },
    ];
    const arc = emotionalArc(sections);
    expect(arc.find((a) => a.label === 'Intro')?.beat).toBe('setup');
    expect(arc.find((a) => a.label === 'Hook')?.beat).toBe('tension');
    expect(arc.find((a) => a.label === 'Bridge')?.beat).toBe('payoff');
  });

  it('the Limbic brain region is wired (its own region + nerves), driven by the Emotion Scanner', () => {
    const limbic = region('limbic');
    expect(limbic?.doc).toBe('lib/hermes/emotion.ts');
    expect(limbic?.agents).toContain('emotion-scanner');
    expect(regionState(limbic!, {})).toBe('idle');
    // emotion-scanner no longer double-counts under analytical
    expect(region('analytical')?.agents).not.toContain('emotion-scanner');
    // nerves connect the limbic core to decision + generative
    expect(PATHWAYS.some(([a, b]) => a === 'limbic' || b === 'limbic')).toBe(true);
  });
});
