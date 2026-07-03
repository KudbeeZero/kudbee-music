import type { SongPackage } from './types';
import type { Taste } from './storage';
import { unlockedChapters, type StoryProgress } from './story';

export interface Badge {
  id: string;
  emoji: string;
  label: string;
  blurb: string;
}

/**
 * Discrete, named achievements — every one computed from data that already exists
 * (banger scores, uniqueness, Occasion Packs, edit history, Story chapters). This is
 * the "map every badge-worthy moment already computable from existing data" step the
 * "Becoming You" gamified-onboarding idea calls for before building anything bigger
 * (more chapters, a real onboarding surface) — see IDEAS.md.
 *
 * Pure and deterministic: same vault + taste + progress always yields the same badge
 * set, in the same order. `unlockedChapters`'s own "First Spark" is excluded — it's
 * unconditionally true from song zero, not really an earned achievement.
 */
export function computeBadges(songs: SongPackage[], taste: Taste | undefined, progress: StoryProgress): Badge[] {
  const chapterBadges: Badge[] = unlockedChapters(progress)
    .filter((c) => c.id !== 'spark')
    .map((c) => ({ id: `chapter-${c.id}`, emoji: '📖', label: c.title, blurb: c.blurb }));

  const milestoneBadges: Badge[] = [
    songs.some((s) => (s.score?.total ?? 0) >= 90) && {
      id: 'banger-90', emoji: '🌟', label: 'Certified Banger', blurb: 'Landed a song scoring 90+.',
    },
    songs.some((s) => s.uniqueness?.score === 100) && {
      id: 'unique-100', emoji: '🎯', label: 'Sharp Ear', blurb: 'Wrote a fully original song — 100/100 uniqueness.',
    },
    songs.some((s) => !!s.inputs.occasion) && {
      id: 'occasion', emoji: '🎁', label: 'Gift Giver', blurb: 'Wrote a song for someone with an Occasion Pack.',
    },
    (taste?.edits ?? 0) > 0 && {
      id: 'editor', emoji: '✂️', label: 'Editor', blurb: 'Edited a lyric — the brain learned your taste.',
    },
    songs.length >= 10 && {
      id: 'prolific', emoji: '🗃️', label: 'Prolific', blurb: 'Saved 10 songs to the vault.',
    },
  ].filter((b): b is Badge => Boolean(b));

  return [...chapterBadges, ...milestoneBadges];
}
