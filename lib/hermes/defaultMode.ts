// The Default-Mode Network — the brain's "creativity-at-rest" system. Research shows
// the DMN has a CAUSAL role in the ORIGINALITY of ideas, and works best coupled to the
// analytical/control network (Ferraro 2024, Beaty 2014). Here it surfaces divergent,
// unexpected ANGLES on the brief — the mind-wandering that finds the non-obvious frame
// — which the artist (the executive layer) then chooses from. Local, deterministic.
import type { SongInputs } from './types';
import { keywords, makeRng, hashString, shuffle, pick } from './text';
import { imageryTags, byImagery } from './lexicon';

export interface Angle {
  angle: string;   // an unexpected way into the song
  why: string;     // why the detour helps (originality)
}

const LENSES = [
  'a place you can never go back to',
  'an object that outlived the person',
  'a conversation that never happened',
  'the day everything was still fine',
  'what the neighbors got wrong about you',
  'a letter you\'ll never send',
  'the version of you that gave up',
  'a small win nobody clapped for',
];

/**
 * Surface `count` divergent angles on the brief — unexpected frames that pull the
 * writing away from the obvious. Deterministic per seed; the artist picks.
 */
export function divergentAngles(inputs: SongInputs, count = 3, seed = 0): Angle[] {
  const rng = makeRng((hashString(inputs.theme + '|' + inputs.title + '|dmn') ^ (seed >>> 0)) >>> 0);
  const kw = keywords(inputs.theme, 5);
  const subject = kw[0] || 'the story';
  const tags = shuffle(imageryTags(), rng);
  const lenses = shuffle(LENSES, rng);

  const makers: ((i: number) => Angle)[] = [
    (i) => ({ angle: `Tell "${subject}" through ${lenses[i % lenses.length]}`, why: 'An oblique frame forces fresh, specific images instead of the obvious ones.' }),
    (i) => {
      const tag = tags[i % tags.length];
      const w = byImagery(tag, 6);
      const word = w.length ? pick(w, rng).w : tag;
      return { angle: `Anchor the whole song to one image: "${word}"`, why: `A single concrete anchor from an unrelated domain (${tag}) gives the song a spine and a surprise.` };
    },
    (i) => ({ angle: `Flip the perspective — write it as ${lenses[(i + 3) % lenses.length]}`, why: 'Re-narrating from an unexpected vantage is the DMN move that lifts originality.' }),
    (i) => ({ angle: `Start at the end: open on the aftermath of "${subject}"`, why: 'Non-linear time is a low-cost way to make a familiar theme feel new.' }),
  ];

  const out: Angle[] = [];
  for (let i = 0; i < count; i++) out.push(makers[i % makers.length](i));
  return out;
}
