import { describe, it, expect } from 'vitest';
import { LYRIC_PROCESS, guideStep, artistContext, nextStep, choiceSignals, stepById } from '../process';
import type { SongInputs, SongPackage } from '../types';
import exampleJson from '../../../examples/cold-hard-gold/song.json';

const example = exampleJson as unknown as SongPackage;

const inputs: SongInputs = {
  title: 'Cold Hard Gold',
  theme: 'the come-up from nothing, proving my worth the hard way, loyalty over flash',
  mood: 'hard, defiant', genre: 'aggressive boom-bap hip-hop',
  tempoMin: 88, tempoMax: 96, voice: 'gritty', audience: 'my brother',
  doNotUse: [], references: '90s boom-bap, soul-sample grit', structure: 'full-song',
};

describe('writers-room process', () => {
  it('defines the full ordered craft, with unique steps', () => {
    expect(LYRIC_PROCESS.length).toBe(9);
    const ids = LYRIC_PROCESS.map((s) => s.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(ids[0]).toBe('concept');
    expect(ids).toContain('hook');
    expect(ids).toContain('revise');
    expect(ids[ids.length - 1]).toBe('arc');
  });

  it('summarizes the artist from their vault (and knows when it knows nothing)', () => {
    const cold = artistContext([]);
    expect(cold.knownVoice).toBe(false);
    expect(cold.songCount).toBe(0);
    expect(cold.note).toMatch(/new artist/i);

    const known = artistContext([example]);
    expect(known.knownVoice).toBe(true);
    expect(known.songCount).toBe(1);
    expect(known.genres[0]).toMatch(/boom-bap/i);
    expect(known.avoid.length).toBeGreaterThan(0);
  });

  it('guides every step with a question, coaching, and 3 options that each carry a reason', () => {
    const artist = artistContext([example]);
    for (const step of LYRIC_PROCESS) {
      const g = guideStep(step.id, { inputs, artist, seed: 3 });
      expect(g.prompt.length).toBeGreaterThan(0);
      expect(g.coaching.length).toBeGreaterThan(0);
      expect(g.options.length).toBe(3);
      for (const o of g.options) {
        expect(o.text.trim().length).toBeGreaterThan(0);
        expect(o.why.trim().length).toBeGreaterThan(0);   // assistant-not-autopilot: always a reason
      }
    }
  });

  it('is deterministic per seed, and a fresh seed gives a different angle', () => {
    const artist = artistContext([example]);
    const a = guideStep('hook', { inputs, artist, seed: 1 });
    const b = guideStep('hook', { inputs, artist, seed: 1 });
    const c = guideStep('hook', { inputs, artist, seed: 9 });
    expect(a.options.map((o) => o.text)).toEqual(b.options.map((o) => o.text));
    // different seed reorders/varies the starting points
    expect(a.options.map((o) => o.text).join('|')).not.toBe(c.options.map((o) => o.text).join('|'));
  });

  it('cites the belief each step embodies', () => {
    const artist = artistContext([example]);
    const g = guideStep('truth', { inputs, artist });
    expect(g.belief?.id).toBe('truth-first');
  });

  it('walks the steps and turns a choice into voice signals', () => {
    expect(nextStep()).toEqual(LYRIC_PROCESS[0]);
    expect(nextStep('concept')?.id).toBe('truth');
    expect(nextStep('arc')).toBeUndefined();
    expect(stepById('hook')?.title).toBe('Hook');

    const sig = choiceSignals('carry the name like it weighs a ton', ['generic filler line about nothing']);
    expect(sig.kept.length).toBeGreaterThan(0);
    expect(Array.isArray(sig.dropped)).toBe(true);
  });
});
