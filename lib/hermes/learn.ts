// The learning layer — the brain's episodic→semantic consolidation. It reads the
// vault of finished songs and derives an evolving ARTIST PROFILE: who this person
// is as a writer (their genres, moods, recurring subjects, craft strengths, and
// the words they overuse). The recommender (recommend.ts) reads this.
import type { SongPackage } from './types';
import { keywords, tokenize } from './text';

export interface ArtistProfile {
  songCount: number;
  topGenres: string[];
  topMoods: string[];
  themeKeywords: string[];           // recurring subjects across songs
  avgBanger: number;
  avgUniqueness: number;
  emotionRange: number;              // 0..1 spread of emotional clarity (variety of feeling)
  leansDark: boolean;
  overusedWords: { word: string; count: number }[]; // candidate fresh-exclusions
  structuresUsed: string[];
  weakHookCount: number;             // tracks scoring low on hook strength
}

const EMPTY: ArtistProfile = {
  songCount: 0, topGenres: [], topMoods: [], themeKeywords: [], avgBanger: 0,
  avgUniqueness: 0, emotionRange: 0, leansDark: false, overusedWords: [],
  structuresUsed: [], weakHookCount: 0,
};

function tally(items: string[]): Map<string, number> {
  const m = new Map<string, number>();
  for (const it of items) { const k = it.trim(); if (k) m.set(k, (m.get(k) ?? 0) + 1); }
  return m;
}
function top(m: Map<string, number>, n: number): string[] {
  return [...m.entries()].sort((a, b) => b[1] - a[1]).slice(0, n).map(([k]) => k);
}
const avg = (xs: number[]) => (xs.length ? Math.round(xs.reduce((a, b) => a + b, 0) / xs.length) : 0);

export function learnProfile(songs: SongPackage[]): ArtistProfile {
  if (!songs.length) return EMPTY;

  const genres = tally(songs.map((s) => s.inputs.genre.toLowerCase()));
  const moods = tally(songs.flatMap((s) => s.inputs.mood.toLowerCase().split(/[,/]+/).map((x) => x.trim())));
  const themes = tally(songs.flatMap((s) => keywords(s.inputs.theme, 6)));
  const structures = tally(songs.map((s) => s.inputs.structure));

  // words used across many songs (not within one) → the writer's crutch words
  const perSong = songs.map((s) => new Set(tokenize(s.finalLyrics).filter((t) => t.length > 3)));
  const acrossCounts = new Map<string, number>();
  for (const set of perSong) for (const w of set) acrossCounts.set(w, (acrossCounts.get(w) ?? 0) + 1);
  const STOP = new Set(['that', 'this', 'with', 'your', 'from', 'they', 'what', 'just', 'like', 'gonna', 'never', 'cause', 'till', 'into']);
  const overusedWords = [...acrossCounts.entries()]
    .filter(([w, c]) => c >= Math.max(2, Math.ceil(songs.length * 0.6)) && !STOP.has(w))
    .sort((a, b) => b[1] - a[1]).slice(0, 8).map(([word, count]) => ({ word, count }));

  const emo = songs.map((s) => s.score.emotionalClarity / 20);
  const topMoods = top(moods, 4);

  return {
    songCount: songs.length,
    topGenres: top(genres, 3),
    topMoods,
    themeKeywords: top(themes, 8),
    avgBanger: avg(songs.map((s) => s.score.total)),
    avgUniqueness: avg(songs.map((s) => s.uniqueness.score)),
    emotionRange: emo.length ? +(Math.max(...emo) - Math.min(...emo)).toFixed(2) : 0,
    leansDark: topMoods.some((m) => /dark|aggress|hard|cold|lonel|sad|angry|menac/.test(m)),
    overusedWords,
    structuresUsed: top(structures, 5),
    weakHookCount: songs.filter((s) => s.score.hookStrength < 14).length,
  };
}
