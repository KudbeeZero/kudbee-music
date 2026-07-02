// The landing-page "try it right here" playground — pure input mapping, kept out
// of the React component so it can be unit-tested. A visitor types ONE line; this
// turns that line into a minimal, valid SongInputs the real pipeline can run.
//
// Determinism/portability contract: these inputs are generated with
// bannedWords: allAvoidWords([]) and NO priorSongs (see LivePlayground.tsx), which
// exactly mirrors HermesHitFactory's "reproduce a shared song" path. That's what
// lets the share link (/hermes?s=<token>) reproduce the landing song byte-for-byte.
import type { SongInputs } from './types';

export interface PlaygroundGenre {
  id: string;
  label: string;
  genre: string; // what the pipeline actually sees
  mood: string;  // a sensible default mood for the genre
}

/** A tiny genre palette for the inline playground (keep it small — this is a demo). */
export const PLAYGROUND_GENRES: PlaygroundGenre[] = [
  { id: 'trap', label: 'Trap', genre: '808 trap', mood: 'moody, melodic, confident' },
  { id: 'boom-bap', label: 'Boom-bap', genre: 'boom-bap hip-hop', mood: 'gritty, reflective, head-nod' },
  { id: 'synthwave', label: 'Synthwave', genre: 'synthwave pop', mood: 'neon, nostalgic, driving' },
  { id: 'soul', label: 'Soul', genre: 'lo-fi soul', mood: 'warm, tender, aching' },
];

export const DEFAULT_PLAYGROUND_GENRE = PLAYGROUND_GENRES[0];

/** Resolve a chip id to its genre (falls back to the default). */
export function playgroundGenre(genreId?: string): PlaygroundGenre {
  return PLAYGROUND_GENRES.find((g) => g.id === genreId) ?? DEFAULT_PLAYGROUND_GENRE;
}

/**
 * Build a minimal, valid SongInputs from the visitor's one line + a genre chip.
 * The line becomes the theme; genre/mood come from the chip; everything else is a
 * neutral, deterministic default. doNotUse stays [] so the run is portable via the
 * share link. The pipeline re-normalizes/clamps, but we hand it a clean brief.
 */
export function inputsFromLine(line: string, genreId?: string): SongInputs {
  const g = playgroundGenre(genreId);
  return {
    title: '',
    theme: (line ?? '').trim(),
    mood: g.mood,
    genre: g.genre,
    tempoMin: 90,
    tempoMax: 140,
    voice: '',
    audience: '',
    doNotUse: [],
    references: '',
    structure: 'hook-first',
    rhymeTemp: 'balanced',
  };
}
