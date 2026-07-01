// "Becoming you" — the self-portrait. As the artist makes more songs and edits, the
// brain learns their voice (signature subjects + the words they keep when they rewrite).
// This measures how much of the CURRENT song echoes that learned voice vs. fresh
// suggestion — so you can literally watch the brain become you over time. Local.
import type { SongPackage } from './types';
import type { Taste } from './storage';
import { learnProfile } from './learn';
import { tokenize } from './text';

export interface VoiceMirror {
  youPercent: number;   // 0..100 — share of the song's vocabulary that echoes the learned voice
  signature: string[];  // the artist's signature words that show up in this song
  learnedFrom: number;  // how many prior songs the voice was learned from
  note: string;
}

/** Compare a song against the voice learned from the artist's OTHER songs + edits. */
export function voiceMirror(pkg: SongPackage, taste: Taste | undefined, priorSongs: SongPackage[]): VoiceMirror {
  const profile = learnProfile(priorSongs);
  const voice = new Set<string>(
    [
      ...profile.themeKeywords,
      ...Object.entries(taste?.liked ?? {}).filter(([, c]) => c >= 1).map(([w]) => w),
    ].map((w) => w.toLowerCase()),
  );
  const uniq = new Set(tokenize(pkg.finalLyrics).filter((w) => w.length > 3));
  const matched = [...uniq].filter((w) => voice.has(w));
  const youPercent = uniq.size ? Math.round((matched.length / uniq.size) * 100) : 0;
  const learnedFrom = profile.songCount;

  const note =
    learnedFrom === 0 ? 'First song — the brain is just starting to learn your voice.'
    : youPercent >= 30 ? 'Strongly you — the brain is writing in your voice now.'
    : youPercent >= 12 ? 'Becoming you — your signature is showing up.'
    : 'Mostly fresh suggestion — make a few more and it learns your voice.';

  return { youPercent, signature: matched.slice(0, 8), learnedFrom, note };
}
