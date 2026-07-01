// Create-your-own-artist (v1). Your artist isn't picked from a menu — it GROWS from
// what you make. This derives a living identity profile from the vault + taste + the
// brain signature: a signature vocabulary, which hemisphere leads, the story chapter
// you're in, and a one-line bio. Over time the brain becomes them. Pure + local + $0.
import type { SongPackage } from './types';
import type { Taste } from './storage';
import { learnProfile } from './learn';
import { brainSignature } from './brainSignature';
import { currentChapter, type StoryProgress } from './story';

export interface Artist {
  alias: string;
  signatureWords: string[];
  dominantHemisphere: 'right' | 'left' | 'balanced';
  chapter: string;       // the Story Mode chapter title
  bio: string;           // one-line, generated
  songsMade: number;
}

export interface DeriveArtistOpts {
  alias?: string;
  becomingYou?: number;  // 0..100
}

/** Derive the artist identity from everything they've made. */
export function deriveArtist(songs: SongPackage[], taste: Taste | undefined, opts: DeriveArtistOpts = {}): Artist {
  const profile = learnProfile(songs);
  const becomingYou = opts.becomingYou ?? 0;
  const sig = brainSignature({ songs, taste, becomingYou });
  const bestScore = songs.reduce((m, s) => Math.max(m, s.score?.total ?? 0), 0);
  const progress: StoryProgress = { songCount: songs.length, becomingYou, bestScore };
  const chapter = currentChapter(progress).title;
  const signatureWords = profile.themeKeywords.slice(0, 6);

  const alias = opts.alias?.trim() || 'Unnamed Artist';
  const leadWord = signatureWords[0];
  const hemi = sig.dominantHemisphere === 'right' ? 'a generative, emotional writer'
    : sig.dominantHemisphere === 'left' ? 'a precise, analytical writer'
    : 'a balanced writer';
  const bio = songs.length === 0
    ? `${alias} — a brand-new brain, waiting for its first song.`
    : `${alias} — ${hemi}${leadWord ? ` who keeps returning to “${leadWord}”` : ''}, ${songs.length} song${songs.length === 1 ? '' : 's'} in, in the “${chapter}” chapter.`;

  return { alias, signatureWords, dominantHemisphere: sig.dominantHemisphere, chapter, bio, songsMade: songs.length };
}
