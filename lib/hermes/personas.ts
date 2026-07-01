// The Persona Map — the brain's craft-DNA tier. We map how a kind of lyrical MIND
// works (subjects, rhyme density, cadence, structure, register, novelty) and let
// the algorithm "wear" it — WITHOUT ever naming a real artist or using their words.
// This is framework Part 1 ("deconstruct the influences") done original-only: the
// artist describes the *feel* they're chasing, we match the closest archetype, and
// it biases the Writers-Room. See brain/beliefs.json (original-only, truth-first).
import personaData from '../../brain/personas.json';
import { keywords, tidyLine } from './text';
import type { SongInputs } from './types';
import type { CraftOption } from './process';

export interface Persona {
  id: string;
  name: string;          // an archetype, never a real person
  essence: string;
  themePalette: string[];
  rhyme: { density: 'sparse' | 'moderate' | 'dense'; internal: boolean; scheme: string };
  cadence: string;
  structure: string[];
  register: string;
  novelty: number;       // 0..1 appetite for the unexpected
  craftFocus: string;
}

interface PersonaMap { version: number; name: string; note: string; personas: Persona[]; }

export const PERSONA_MAP = personaData as PersonaMap;
export const PERSONAS = PERSONA_MAP.personas;

export function persona(id: string): Persona | undefined {
  return PERSONAS.find((p) => p.id === id);
}

// Trait words that point at each archetype — matched against what the artist
// DESCRIBES (never a name). Keeps the mapping about craft, not identity.
export const SIGNALS: Record<string, string[]> = {
  'confessional-storyteller': ['story', 'storytelling', 'personal', 'vulnerable', 'emotional', 'narrative', 'honest', 'family', 'confessional', 'intimate'],
  'battle-technician': ['battle', 'bars', 'technical', 'lyrical', 'wordplay', 'punchline', 'complex', 'multisyllabic', 'rhyme', 'aggressive', 'hard', 'sharp', 'boom-bap'],
  'soul-poet': ['soul', 'sample', 'warm', 'spiritual', 'poetic', 'literary', 'uplift', 'melodic', 'jazzy', 'grace', 'hope'],
  'street-documentarian': ['street', 'gritty', 'real', 'survival', 'block', 'trap', 'documentary', 'cinematic', 'reportage', 'raw', 'hood'],
  'melodic-minimalist': ['melodic', 'minimal', 'simple', 'catchy', 'mood', 'vibe', 'sing', 'auto', 'hook', 'sad', 'lonely', 'ambient'],
  'conscious-visionary': ['conscious', 'message', 'political', 'social', 'abstract', 'visionary', 'deep', 'meaning', 'identity', 'power', 'history'],
};

export interface PersonaMatch { persona: Persona; score: number; matched: string[]; }

/**
 * Map a *described* influence/feel (or the song's own brief) to the closest craft
 * archetype. No names required or stored — it scores on craft trait words. Always
 * returns the best match (defaults to the storyteller when nothing scores).
 */
export function matchPersona(description: string): PersonaMatch {
  const tokens = new Set(
    description.toLowerCase().split(/[^a-z0-9-]+/).filter(Boolean),
  );
  let best: PersonaMatch = { persona: persona('confessional-storyteller')!, score: 0, matched: [] };
  for (const p of PERSONAS) {
    const matched = (SIGNALS[p.id] ?? []).filter((s) => tokens.has(s));
    if (matched.length > best.score) best = { persona: p, score: matched.length, matched };
  }
  return best;
}

/** Suggest a persona from the full song brief (genre + mood + references + theme). */
export function suggestPersona(inputs: SongInputs): PersonaMatch {
  return matchPersona([inputs.genre, inputs.mood, inputs.references, inputs.theme, inputs.voice].join(' '));
}

/**
 * The craft overlay a persona adds to one Writers-Room step: a tailored option
 * and a coaching line, derived purely from craft traits. The process layer merges
 * this so choosing a persona visibly steers the room.
 */
export function personaOverlay(p: Persona, stepId: string, inputs: SongInputs): { coaching: string; option?: CraftOption } {
  const kw = keywords([inputs.theme, inputs.references].join(' '), 6);
  const k0 = kw[0] || 'the idea';
  const base = `Channeling ${p.name} — ${p.essence}`;
  switch (stepId) {
    case 'concept':
    case 'truth':
      return {
        coaching: `${base} This mind circles: ${p.themePalette.slice(0, 3).join(', ')}.`,
        option: { text: tidyLine(`A ${p.themePalette[0]} angle on ${k0}`), why: `${p.name} minds find the song in ${p.themePalette[0]}.` },
      };
    case 'hook':
      return {
        coaching: `${base} It optimizes for ${p.craftFocus}.`,
        option: { text: tidyLine(`A hook built for ${p.craftFocus}`), why: `Plays to this archetype's strength.` },
      };
    case 'rhyme-cadence':
      return {
        coaching: `${base}`,
        option: {
          text: tidyLine(`${p.rhyme.scheme}, ${p.rhyme.density} density${p.rhyme.internal ? ', heavy internal rhyme' : ''} — ${p.cadence}`),
          why: `Matches the ${p.name} pocket.`,
        },
      };
    case 'verse-draft':
      return { coaching: `${base} Structure habit: ${p.structure[0]}.`, option: { text: tidyLine(`Open in the ${p.register} register`), why: `The ${p.name} voice lives in this register.` } };
    case 'arc':
      return { coaching: `${base} Its signature turn: ${p.structure[p.structure.length - 1]}.` };
    default:
      return { coaching: base };
  }
}

export { type CraftOption };
