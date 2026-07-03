// Occasion Packs — a themed lexicon + craft preset for a specific life moment
// (Christmas, a birthday, an anniversary…). Rides the exact infrastructure pattern
// packs (#114) and expansion packs already proved, but occasion IS its own SongInputs
// field (unlike pattern packs, which just recombine existing dials) because occasion
// vocabulary — stocking, sleigh, mistletoe, diploma, tassel — is genuinely NEW lexicon
// mood/genre/references text alone can't express. $0/local: no new deps, deterministic.
import type { SongStructure, RhymeSchemeId } from './types';
import packs from '../../brain/occasionPacks.json';

export interface OccasionPack {
  id: string;
  label: string;
  emoji: string;
  blurb: string;
  moodPreset: string;
  genrePreset: string;
  referencesPreset: string;
  structure: SongStructure;
  rhymeScheme: RhymeSchemeId;
  /** Concrete, singable nouns for this occasion — biased into noun slots by the mock
   *  provider whenever inputs.occasion names this pack (see nounPool/imageryNouns in
   *  mockLyricsProvider.ts). Every word passes the same `nounable()` bar as the core
   *  noun bank. */
  nouns: string[];
  /** The Intro line's frame ({who} placeholder) when this occasion is set — replaces
   *  the generic "{who}, this one's for you". */
  dedicationFrame: string;
}

export const OCCASION_PACKS: OccasionPack[] = packs as OccasionPack[];

export function findOccasionPack(id: string | undefined): OccasionPack | undefined {
  return id ? OCCASION_PACKS.find((p) => p.id === id) : undefined;
}

/** Whitelist check for every untrusted-input boundary (pipeline normalize, share
 *  decode, vault import) — same discipline as RHYME_SCHEME_IDS in types.ts. */
export function isValidOccasionId(id: unknown): id is string {
  return typeof id === 'string' && OCCASION_PACKS.some((p) => p.id === id);
}
