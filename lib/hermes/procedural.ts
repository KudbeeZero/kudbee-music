// Procedural memory — the brain's "how", not its "what". Where long-term memory
// stores the songs (facts), procedural memory stores the artist's recurring craft
// MOVES: the structures they reach for, the rhyme sounds they lean on, their typical
// verse length. It's the muscle memory that makes a catalog feel like one hand. The
// recommender uses it to say "this is your move — lean in, or break it on purpose."
// Local + deterministic (built on the vault + the rhyme engine).
import type { SongPackage } from './types';
import { rhymeKey } from './lexicon';
import { endWord } from './rhyme';

export interface ProceduralProfile {
  songCount: number;
  favoriteStructure: string;
  topRhymeSounds: { sound: string; count: number }[];
  avgLinesPerSong: number;
  signatureMove: string;   // human-readable summary
}

const EMPTY: ProceduralProfile = {
  songCount: 0, favoriteStructure: 'full-song', topRhymeSounds: [], avgLinesPerSong: 0, signatureMove: '',
};

function topEntries(m: Map<string, number>, n: number): [string, number][] {
  return [...m.entries()].sort((a, b) => b[1] - a[1]).slice(0, n);
}

export function proceduralMemory(songs: SongPackage[]): ProceduralProfile {
  if (!songs.length) return EMPTY;

  const structures = new Map<string, number>();
  const sounds = new Map<string, number>();
  let totalLines = 0;

  for (const s of songs) {
    structures.set(s.inputs.structure, (structures.get(s.inputs.structure) ?? 0) + 1);
    const lines = s.sections.flatMap((x) => x.lines);
    totalLines += lines.length;
    for (const l of lines) {
      const k = rhymeKey(endWord(l));
      if (k) sounds.set(k, (sounds.get(k) ?? 0) + 1);
    }
  }

  const favoriteStructure = topEntries(structures, 1)[0]?.[0] ?? 'full-song';
  const topRhymeSounds = topEntries(sounds, 3).map(([sound, count]) => ({ sound, count }));
  const avgLinesPerSong = Math.round(totalLines / songs.length);
  const soundStr = topRhymeSounds.length ? `-${topRhymeSounds[0].sound}` : 'varied';
  const signatureMove =
    `You reach for ${favoriteStructure.replace('-', ' ')} structures and lean on ${soundStr} rhyme sounds ` +
    `(~${avgLinesPerSong} lines a song).`;

  return { songCount: songs.length, favoriteStructure, topRhymeSounds, avgLinesPerSong, signatureMove };
}
