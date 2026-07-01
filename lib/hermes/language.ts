// The Language & Culture area — where lived experience becomes word choice. The
// best lyrics come from a real life: where you're from, how you were raised, the
// way you actually talk. This maps the ARTIST'S OWN described background into neutral
// craft levers (register, diction, imagery, vernacular) — never a profile of a group,
// never an impersonation. It's the artist describing themselves, turned into craft.
// Original-only and truth-first (see brain/beliefs.json).
import type { SongInputs } from './types';
import { keywords } from './text';

export type Register = 'plainspoken' | 'literary' | 'slang-forward' | 'mixed';

export interface LanguageProfile {
  hasCulture: boolean;
  register: Register;
  dictionLean: string;     // short human descriptor of the word-choice lean
  imagery: string[];       // imagery palette seeded from the artist's OWN words
  vernacular: string;      // guidance to write in their real everyday speech
  depth: string;           // struggle-as-depth (truth-first)
}

function pickRegister(text: string): Register {
  const t = text.toLowerCase();
  const lit = /(poetic|literary|metaphor|lyrical|vivid|imagery)/.test(t);
  const slang = /(street|slang|gritty|raw|trap|drill|hood|block|colloquial)/.test(t);
  const plain = /(plain|honest|conversational|simple|direct|spoken)/.test(t);
  if (lit && slang) return 'mixed';
  if (lit) return 'literary';
  if (slang) return 'slang-forward';
  if (plain) return 'plainspoken';
  return 'mixed';
}

/** Map the artist's described background + voice into craft levers. */
export function deriveLanguage(inputs: SongInputs): LanguageProfile {
  const culture = (inputs.culture ?? '').trim();
  const hasCulture = culture.length > 0;
  const blob = [culture, inputs.voice, inputs.references, inputs.mood].filter(Boolean).join(' ');
  const register = pickRegister(blob);
  // imagery comes from the artist's own words (culture + theme), not a stereotype set
  const imagery = keywords([culture, inputs.theme].filter(Boolean).join(' '), 6);
  const struggle = /(struggle|pain|hard|cold|lost|grief|fight|survive|broke|hunger|loss)/i.test(
    [inputs.theme, inputs.mood].join(' '),
  );
  const dictionLean = {
    plainspoken: 'plain, concrete words — say it the way you would out loud',
    literary: 'image-led, metaphor-forward — but earn every abstraction with a detail',
    'slang-forward': 'your everyday speech and slang, kept clear enough to land first listen',
    mixed: 'mix plain talk with one or two vivid images per verse',
  }[register];
  return {
    hasCulture,
    register,
    dictionLean,
    imagery,
    vernacular: hasCulture
      ? `Write in your own voice from ${culture} — the specific way you actually talk is what no one else can copy.`
      : 'Write in your own everyday voice — the way you actually talk is the part no one can copy.',
    depth: struggle
      ? 'Channel the struggle — the specific detail of what you lived is the superpower; it makes the line hit harder.'
      : 'Ground it in one real, lived detail — specific beats universal.',
  };
}

/** A coaching line for the Writers-Room, derived from the language profile. */
export function languageCoaching(p: LanguageProfile): string {
  const img = p.imagery.length ? ` Pull images from: ${p.imagery.slice(0, 3).join(', ')}.` : '';
  return `${p.vernacular} ${p.dictionLean}.${img} ${p.depth}`;
}
