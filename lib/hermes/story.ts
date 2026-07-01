// Story Mode — the playable come-up. The artist's journey is chapters that unlock as
// the brain becomes them: make your first song, find your voice, land a banger, build
// an album. Pure + deterministic; the UI just reads the current chapter + next unlock.
// $0/local. Ties to create-your-own-artist (lib/hermes/artist.ts) + becoming-you.

export interface StoryProgress {
  songCount: number;
  becomingYou: number;  // 0..100 (learned-voice share)
  bestScore: number;    // best banger total 0..100
}

export interface Chapter {
  id: string;
  title: string;
  blurb: string;
  unlock: (p: StoryProgress) => boolean;
  goal: string;         // what it takes to reach this chapter (shown when locked)
}

export const CHAPTERS: Chapter[] = [
  { id: 'spark', title: 'First Spark', blurb: 'An idea becomes your first song.', goal: 'Start here.', unlock: () => true },
  { id: 'voice', title: 'Finding Your Voice', blurb: 'The brain starts to sound like you.', goal: 'Make 2 songs (or reach 10% "becoming you").', unlock: (p) => p.songCount >= 2 || p.becomingYou >= 10 },
  { id: 'banger', title: 'First Banger', blurb: 'A record that actually hits.', goal: 'Land a song scoring 85+.', unlock: (p) => p.bestScore >= 85 },
  { id: 'album', title: 'The Album', blurb: 'A body of work, unmistakably yours.', goal: 'Make 5 songs and reach 25% "becoming you".', unlock: (p) => p.songCount >= 5 && p.becomingYou >= 25 },
];

/** Chapters currently unlocked, in order. */
export function unlockedChapters(p: StoryProgress): Chapter[] {
  return CHAPTERS.filter((c) => c.unlock(p));
}

/** The furthest chapter the artist has reached. */
export function currentChapter(p: StoryProgress): Chapter {
  const unlocked = unlockedChapters(p);
  return unlocked[unlocked.length - 1] ?? CHAPTERS[0];
}

/** The next locked chapter + what it takes (null once everything is unlocked). */
export function nextUnlock(p: StoryProgress): { chapter: Chapter; goal: string } | null {
  const next = CHAPTERS.find((c) => !c.unlock(p));
  return next ? { chapter: next, goal: next.goal } : null;
}
