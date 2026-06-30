import { describe, it, expect } from 'vitest';
import { PERSONAS, persona, matchPersona, suggestPersona, personaOverlay } from '../personas';
import { guideStep, artistContext, LYRIC_PROCESS } from '../process';
import type { SongInputs } from '../types';

const inputs: SongInputs = {
  title: 'Cold Hard Gold',
  theme: 'the come-up from nothing, proving my worth the hard way',
  mood: 'hard, defiant, aggressive', genre: 'aggressive boom-bap hip-hop',
  tempoMin: 88, tempoMax: 96, voice: 'gritty', audience: 'my brother',
  doNotUse: [], references: 'complex multisyllabic bars, lyrical, boom-bap', structure: 'full-song',
};

describe('persona map (anonymized craft-DNA)', () => {
  it('loads archetypes — not real artists (names are archetypes, no lyrics)', () => {
    expect(PERSONAS.length).toBeGreaterThanOrEqual(5);
    for (const p of PERSONAS) {
      expect(p.name.startsWith('The ')).toBe(true);          // archetype naming, not a person
      expect(p.themePalette.length).toBeGreaterThan(0);
      expect(['sparse', 'moderate', 'dense']).toContain(p.rhyme.density);
      expect(p.craftFocus.length).toBeGreaterThan(0);
    }
    expect(persona('battle-technician')?.rhyme.internal).toBe(true);
  });

  it('maps a DESCRIBED feel to the closest craft archetype (no names needed)', () => {
    expect(matchPersona('complex multisyllabic battle bars, technical wordplay').persona.id).toBe('battle-technician');
    expect(matchPersona('soulful sample, spiritual, poetic, uplifting').persona.id).toBe('soul-poet');
    expect(matchPersona('minimal melodic catchy mood, lonely').persona.id).toBe('melodic-minimalist');
    expect(matchPersona('conscious message, political, social, identity').persona.id).toBe('conscious-visionary');
  });

  it('suggests a persona from the song brief', () => {
    const m = suggestPersona(inputs);
    expect(['battle-technician', 'street-documentarian']).toContain(m.persona.id);
    expect(m.matched.length).toBeGreaterThan(0);
  });

  it('overlays craft on each step (coaching always; a tailored option on rhyme)', () => {
    const p = persona('soul-poet')!;
    for (const step of LYRIC_PROCESS) {
      const o = personaOverlay(p, step.id, inputs);
      expect(o.coaching).toMatch(/Soul Poet/);
    }
    expect(personaOverlay(p, 'rhyme-cadence', inputs).option?.text).toMatch(/internal rhyme|ABAB|density/i);
  });

  it('steers the Writers-Room when a persona is worn (still 3 options, persona-flavored)', () => {
    const artist = artistContext([]);
    const base = guideStep('rhyme-cadence', { inputs, artist, seed: 2 });
    const worn = guideStep('rhyme-cadence', { inputs, artist, seed: 2, persona: persona('battle-technician')! });
    expect(worn.options.length).toBe(3);
    expect(worn.coaching).toMatch(/Battle Technician/);
    // the persona injects a tailored starting option the plain room didn't have
    expect(worn.options.map((o) => o.text).join('|')).not.toBe(base.options.map((o) => o.text).join('|'));
  });
});
